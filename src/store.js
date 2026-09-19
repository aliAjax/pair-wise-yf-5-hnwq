import { useEffect, useReducer } from 'react';

export const STORAGE_KEY = 'night-ferry-dock:v1';

let seq = 0;
const uid = () =>
  `${Date.now().toString(36)}-${(seq++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const now = () => new Date().toLocaleString('zh-CN', { hour12: false });

function rec(kind, text) {
  return { id: uid(), time: now(), kind, text };
}

export const initialState = {
  ferries: [], // {id, name, capacity, deck: 'passenger'|'cargo', status: 'active'|'maintenance', loaded: [vehicle]}
  queue: [], // 候船车辆，按到达顺序
  records: [], // 放行/拒绝/检修记录，新的在前
};

const MAX_RECORDS = 200;
const pushRecords = (state, ...entries) =>
  [...entries, ...state.records].slice(0, MAX_RECORDS);

const deckLabel = (deck) => (deck === 'passenger' ? '载客舱' : '载货舱');

export function reducer(state, action) {
  switch (action.type) {
    case 'ADD_FERRY': {
      const ferry = {
        id: uid(),
        name: action.name,
        capacity: action.capacity,
        deck: action.deck,
        status: 'active',
        loaded: [],
      };
      return {
        ...state,
        ferries: [...state.ferries, ferry],
        records: pushRecords(
          state,
          rec('info', `🚢 渡轮「${ferry.name}」登记在册（${deckLabel(ferry.deck)}，载重上限 ${ferry.capacity}t）`),
        ),
      };
    }

    case 'ADD_VEHICLE': {
      const vehicle = {
        id: uid(),
        plate: action.plate,
        kind: action.kind,
        weight: action.weight,
        dangerous: action.dangerous,
      };
      return {
        ...state,
        queue: [...state.queue, vehicle],
        records: pushRecords(
          state,
          rec('info', `🚗 ${vehicle.plate} 进站候船（${vehicle.kind}，${vehicle.weight}t${vehicle.dangerous ? '，危险品' : ''}）`),
        ),
      };
    }

    case 'LOAD_NEXT': {
      const idx = state.ferries.findIndex((f) => f.status === 'active');
      if (idx === -1) {
        return { ...state, records: pushRecords(state, rec('warn', '⚠️ 没有可作业的渡轮，无法装载')) };
      }
      const ferry = state.ferries[idx];
      if (state.queue.length === 0) {
        return { ...state, records: pushRecords(state, rec('warn', '⚠️ 候船队列为空，无车可装')) };
      }
      const head = state.queue[0];

      // 危险品车辆不得进入载客舱：整车拒绝，队列与已装状态不变
      if (head.dangerous && ferry.deck === 'passenger') {
        return {
          ...state,
          records: pushRecords(
            state,
            rec('reject', `⛔ 拒绝 ${head.plate}：危险品车辆不得进入载客舱「${ferry.name}」，车辆留队等候`),
          ),
        };
      }

      // 总重超限：整车拒绝，队列与已装状态不变
      const loadedWeight = ferry.loaded.reduce((s, v) => s + v.weight, 0);
      if (loadedWeight + head.weight > ferry.capacity) {
        return {
          ...state,
          records: pushRecords(
            state,
            rec('reject', `⛔ 拒绝 ${head.plate}：装载后总重 ${loadedWeight + head.weight}t 将超过「${ferry.name}」上限 ${ferry.capacity}t，车辆留队等候`),
          ),
        };
      }

      const ferries = state.ferries.map((f, i) =>
        i === idx ? { ...f, loaded: [...f.loaded, head] } : f,
      );
      return {
        ...state,
        ferries,
        queue: state.queue.slice(1),
        records: pushRecords(
          state,
          rec('ok', `✅ 放行 ${head.plate}（${head.weight}t）→「${ferry.name}」，累计 ${loadedWeight + head.weight}/${ferry.capacity}t`),
        ),
      };
    }

    case 'TOGGLE_MAINTENANCE': {
      const ferry = state.ferries.find((f) => f.id === action.id);
      if (!ferry) return state;

      if (ferry.status === 'active') {
        // 转入检修：已装车辆按原顺序回到队首，后续渡轮自动接替
        const returned = ferry.loaded;
        const ferries = state.ferries.map((f) =>
          f.id === ferry.id ? { ...f, status: 'maintenance', loaded: [] } : f,
        );
        const successor = ferries.find((f) => f.status === 'active');
        const entries = [
          rec('maint', `🔧 「${ferry.name}」转入检修，${returned.length} 辆已装车辆按原顺序回队`),
        ];
        [...returned].reverse().forEach((v) => entries.push(rec('info', `↩️ ${v.plate} 回到候船队列`)));
        entries.unshift(
          rec('info', successor ? `🚢 「${successor.name}」自动接替装载作业` : '⚠️ 暂无其他渡轮可接替作业'),
        );
        return {
          ...state,
          ferries,
          queue: [...returned, ...state.queue],
          records: pushRecords(state, ...entries),
        };
      }

      const ferries = state.ferries.map((f) =>
        f.id === ferry.id ? { ...f, status: 'active' } : f,
      );
      return {
        ...state,
        ferries,
        records: pushRecords(state, rec('info', `🛠️ 「${ferry.name}」检修完成，恢复待命`)),
      };
    }

    case 'CLEAR_RECORDS':
      return { ...state, records: [] };

    case 'RESET_ALL':
      return initialState;

    default:
      return state;
  }
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    return { ...initialState, ...JSON.parse(raw) };
  } catch {
    return initialState;
  }
}

export function useDock() {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 存储不可用时静默降级，页面功能不受影响
    }
  }, [state]);
  return [state, dispatch];
}
