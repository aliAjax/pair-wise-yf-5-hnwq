// 车辆类型标签
export const VEHICLE_TYPES = {
  car: '小型客车',
  truck: '货运卡车',
  hazmat: '危险品车',
  bus: '大型客车',
};

// 舱位标签
export const CABINS = {
  vehicle: '车辆甲板',
  passenger: '载客舱',
};

export const now = () => new Date().toISOString();

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// 重量统一以“吨”为单位，保留两位小数展示
export function fmtWeight(t) {
  return `${Number(t).toFixed(2)} t`;
}

export function fmtTime(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function describeVehicle(v) {
  return `${VEHICLE_TYPES[v.type] || v.type} · ${v.plate} · ${fmtWeight(v.weight)} · ${CABINS[v.cabin] || v.cabin}${v.dangerous ? ' · 危险品' : ''}`;
}

// 放行记录统一渲染文案
export function formatRecord(r) {
  switch (r.kind) {
    case 'reject':
      return `拒绝装载（${r.reason === 'overweight' ? `超重 ${fmtWeight(r.loadedWeight)} + ${fmtWeight(r.weight)} > ${fmtWeight(r.capacity)}` : '危险品车进入载客舱'}）：${describeVehicle(r.vehicle)} → ${r.ferryName}`;
    case 'depart':
      return `放行离港：${r.ferryName}，载 ${r.vehicleCount} 辆 / ${fmtWeight(r.loadedWeight)}${r.successor ? `，由 ${r.successor} 接替` : ''}`;
    case 'maintenance':
      return `开始检修：${r.ferryName}，已装 ${r.vehicleCount} 辆全部原序回队${r.successor ? `，由 ${r.successor} 接替` : ''}`;
    case 'resume':
      return `检修完成，重新投运：${r.ferryName}`;
    case 'register':
      return `登记渡轮：${r.ferryName}，载重上限 ${fmtWeight(r.capacity)}`;
    case 'enqueue':
      return `车辆到港候船：${describeVehicle(r.vehicle)}`;
    case 'remove':
      return `车辆撤离候船队列：${describeVehicle(r.vehicle)}`;
    default:
      return r.kind;
  }
}
