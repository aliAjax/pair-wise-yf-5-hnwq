import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { now, uid } from './utils';

const STORAGE_KEY = 'night-ferry-dock:v1';

const emptyState = {
  ferries: [], // { id, name, capacity, status: 'active'|'maintenance', loaded: [vehicle...], voyages }
  queue: [],   // 候船车辆，按到达顺序（队首在 index 0）
  records: [], // 放行/拒绝/检修 等记录，最新在前
};

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw);
    return {
      ferries: parsed.ferries ?? [],
      queue: parsed.queue ?? [],
      records: parsed.records ?? [],
    };
  } catch {
    return emptyState;
  }
}

function addRecord(state, record) {
  return [{ id: uid('rec'), time: now(), ...record }, ...state.records];
}

function firstActiveFerry(ferries, excludeId = null) {
  return ferries.find((f) => f.status === 'active' && f.id !== excludeId) || null;
}

// 尝试把队首车辆装到指定渡轮；纯函数，返回结果（不直接派发），供单装与连装复用。
function attemptLoad(state, ferryId) {
  const ferry = state.ferries.find((f) => f.id === ferryId);
  if (!ferry || ferry.status !== 'active') return { ok: false, reason: 'no-ferry' };
  const vehicle = state.queue[0];
  if (!vehicle) return { ok: false, reason: 'empty' };

  if (vehicle.dangerous && vehicle.cabin === 'passenger') {
    return { ok: false, reason: 'hazmat', vehicle, ferry };
  }
  const loadedWeight = ferry.loaded.reduce((s, v) => s + v.weight, 0);
  if (loadedWeight + vehicle.weight > ferry.capacity + 1e-9) {
    return { ok: false, reason: 'overweight', vehicle, ferry, loadedWeight };
  }
  return { ok: true, vehicle, ferry };
}

function reducer(state, action) {
  switch (action.type) {
    case 'REGISTER_FERRY': {
      const { name, capacity } = action;
      const trimmed = name.trim();
      const cap = Number(capacity);
      if (!trimmed || !Number.isFinite(cap) || cap <= 0) return state;
      const ferry = { id: uid('ferry'), name: trimmed, capacity: cap, status: 'active', loaded: [], voyages: 0 };
      return {
        ...state,
        ferries: [...state.ferries, ferry],
        records: addRecord(state, { kind: 'register', ferryName: trimmed, capacity: cap }),
      };
    }

    case 'ENQUEUE': {
      const { plate, weight, vehType, cabin } = action;
      const trimmed = plate.trim();
      const w = Number(weight);
      if (!trimmed || !Number.isFinite(w) || w <= 0) return state;
      const dangerous = vehType === 'hazmat';
      // 舱位以登记为准；危险品车若登记进载客舱，装船时按规则整车拒绝
      const vehicle = {
        id: uid('veh'),
        plate: trimmed,
        weight: w,
        type: vehType,
        cabin,
        dangerous,
        arrivedAt: now(),
      };
      return {
        ...state,
        queue: [...state.queue, vehicle],
        records: addRecord(state, { kind: 'enqueue', vehicle }),
      };
    }

    case 'REMOVE_QUEUE': {
      const vehicle = state.queue.find((v) => v.id === action.id);
      if (!vehicle) return state;
      return {
        ...state,
        queue: state.queue.filter((v) => v.id !== action.id),
        records: addRecord(state, { kind: 'remove', vehicle }),
      };
    }

    // 装一辆；失败时队列与已装状态保持不变，仅追加拒绝记录
    case 'LOAD_ONE': {
      const result = attemptLoad(state, action.ferryId);
      if (!result.ok) {
        if (result.reason === 'hazmat') {
          return {
            ...state,
            records: addRecord(state, {
              kind: 'reject', reason: 'hazmat',
              vehicle: result.vehicle, ferryId: result.ferry.id, ferryName: result.ferry.name,
            }),
          };
        }
        if (result.reason === 'overweight') {
          return {
            ...state,
            records: addRecord(state, {
              kind: 'reject', reason: 'overweight',
              vehicle: result.vehicle, ferryId: result.ferry.id, ferryName: result.ferry.name,
              loadedWeight: result.loadedWeight, capacity: result.ferry.capacity,
            }),
          };
        }
        return state; // 无可用渡轮 / 队列空：不产生记录
      }
      const { vehicle, ferry } = result;
      return {
        ...state,
        queue: state.queue.slice(1),
        ferries: state.ferries.map((f) =>
          f.id === ferry.id ? { ...f, loaded: [...f.loaded, { ...vehicle, loadedAt: now() }] } : f),
      };
    }

    // 顺序连续装载，直到队空或首次被拒（被拒不改变队列与已装状态）
    case 'LOAD_ALL': {
      let ferries = state.ferries;
      let queue = state.queue;
      let records = state.records;
      let guard = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        guard += 1;
        if (guard > 10000) break;
        const probe = { ...state, ferries, queue };
        const result = attemptLoad(probe, action.ferryId);
        if (result.ok) {
          const { vehicle } = result;
          queue = queue.slice(1);
          ferries = ferries.map((f) =>
            f.id === action.ferryId ? { ...f, loaded: [...f.loaded, { ...vehicle, loadedAt: now() }] } : f);
        } else {
          if (result.reason === 'hazmat') {
            records = [{
              id: uid('rec'), time: now(), kind: 'reject', reason: 'hazmat',
              vehicle: result.vehicle, ferryId: result.ferry.id, ferryName: result.ferry.name,
            }, ...records];
          } else if (result.reason === 'overweight') {
            records = [{
              id: uid('rec'), time: now(), kind: 'reject', reason: 'overweight',
              vehicle: result.vehicle, ferryId: result.ferry.id, ferryName: result.ferry.name,
              loadedWeight: result.loadedWeight, capacity: result.ferry.capacity,
            }, ...records];
          }
          break;
        }
      }
      return { ...state, ferries, queue, records };
    }

    // 放行离港：清空装载表、计一个航次；后续渡轮自动接替（下一辆装到队首的下一艘在役渡轮）
    case 'DEPART': {
      const ferry = state.ferries.find((f) => f.id === action.ferryId);
      if (!ferry || ferry.loaded.length === 0) return state;
      const vehicleCount = ferry.loaded.length;
      const loadedWeight = ferry.loaded.reduce((s, v) => s + v.weight, 0);
      const successor = firstActiveFerry(state.ferries, ferry.id);
      return {
        ...state,
        ferries: state.ferries.map((f) =>
          f.id === ferry.id ? { ...f, loaded: [], voyages: f.voyages + 1 } : f),
        records: addRecord(state, {
          kind: 'depart', ferryId: ferry.id, ferryName: ferry.name,
          vehicleCount, loadedWeight, successor: successor ? successor.name : null,
        }),
      };
    }

    // 渡轮检修：已装车辆按原顺序回队（置于队首，保持相对顺序），后续渡轮自动接替
    case 'SET_MAINTENANCE': {
      const ferry = state.ferries.find((f) => f.id === action.ferryId);
      if (!ferry || ferry.status !== 'active') return state;
      const restored = ferry.loaded.map((v) => ({ ...v, loadedAt: undefined }));
      const successor = firstActiveFerry(state.ferries, ferry.id);
      return {
        ...state,
        queue: [...restored, ...state.queue],
        ferries: state.ferries.map((f) =>
          f.id === ferry.id ? { ...f, status: 'maintenance', loaded: [] } : f),
        records: addRecord(state, {
          kind: 'maintenance', ferryId: ferry.id, ferryName: ferry.name,
          vehicleCount: restored.length, successor: successor ? successor.name : null,
        }),
      };
    }

    case 'RESUME': {
      const ferry = state.ferries.find((f) => f.id === action.ferryId);
      if (!ferry || ferry.status !== 'maintenance') return state;
      return {
        ...state,
        ferries: state.ferries.map((f) =>
          f.id === ferry.id ? { ...f, status: 'active' } : f),
        records: addRecord(state, { kind: 'resume', ferryId: ferry.id, ferryName: ferry.name }),
      };
    }

    case 'CLEAR_RECORDS':
      return { ...state, records: [] };

    case 'RESET_ALL':
      return emptyState;

    default:
      return state;
  }
}

export { reducer };

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 存储不可用时静默降级（仅本次会话有效）
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
