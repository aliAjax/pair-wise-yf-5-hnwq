import { useMemo } from 'react';
import { useStore } from '../store.jsx';
import { CABINS, VEHICLE_TYPES, fmtWeight } from '../utils.js';

// 装载表：当前渡轮上的已装车辆（按装船顺序）与装载操作
export default function ManifestPanel() {
  const { state, dispatch } = useStore();

  // 后续渡轮自动接替：当前装载渡轮 = 登记顺序中第一艘在役渡轮
  const current = useMemo(
    () => state.ferries.find((f) => f.status === 'active') || null,
    [state.ferries]
  );

  const used = current ? current.loaded.reduce((s, v) => s + v.weight, 0) : 0;
  const head = state.queue[0];
  const remaining = current ? current.capacity - used : 0;
  const headWouldOverload = head ? head.weight > remaining + 1e-9 : false;
  const headHazmatInCabin = head ? head.dangerous && head.cabin === 'passenger' : false;

  return (
    <section className="panel panel-wide">
      <h2 className="panel-title">📋 装载表</h2>

      {!current && <p className="empty">没有在役渡轮——请先登记渡轮，或将检修中的渡轮重新投运。</p>}

      {current && (
        <>
          <div className="manifest-head">
            <div>
              <strong>{current.name}</strong>
              <span className="muted"> 已装 {current.loaded.length} 辆 · {fmtWeight(used)} / {fmtWeight(current.capacity)}</span>
            </div>
            <div className="manifest-actions">
              <button className="btn btn-primary"
                disabled={state.queue.length === 0}
                onClick={() => dispatch({ type: 'LOAD_ONE', ferryId: current.id })}>
                装一辆
              </button>
              <button className="btn btn-secondary"
                disabled={state.queue.length === 0}
                title="按排队顺序连续装载，直至队空或首次被拒"
                onClick={() => dispatch({ type: 'LOAD_ALL', ferryId: current.id })}>
                顺序装到满
              </button>
            </div>
          </div>

          {head && (
            <p className={`next-veh ${headWouldOverload || headHazmatInCabin ? 'is-block' : ''}`}>
              队首待装：<b>{head.plate}</b>（{VEHICLE_TYPES[head.type]}，{fmtWeight(head.weight)}，{CABINS[head.cabin]}
              {head.dangerous && '，危险品'}）
              {headHazmatInCabin && <span className="warn-text"> → 危险品车禁止进入载客舱，将被整车拒绝</span>}
              {!headHazmatInCabin && headWouldOverload && <span className="warn-text"> → 超重 {fmtWeight(used + head.weight)}＞{fmtWeight(current.capacity)}，将被整车拒绝</span>}
            </p>
          )}

          {current.loaded.length === 0 ? (
            <p className="empty">装载表为空。</p>
          ) : (
            <table className="manifest-table">
              <thead>
                <tr><th>#</th><th>车牌</th><th>车型</th><th>舱位</th><th>重量</th></tr>
              </thead>
              <tbody>
                {current.loaded.map((v, i) => (
                  <tr key={v.id} className={v.dangerous ? 'row-hazmat' : ''}>
                    <td>{i + 1}</td>
                    <td>{v.plate}{v.dangerous && <em className="tag tag-hazmat">危</em>}</td>
                    <td>{VEHICLE_TYPES[v.type]}</td>
                    <td>{CABINS[v.cabin]}</td>
                    <td className="num">{fmtWeight(v.weight)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}
