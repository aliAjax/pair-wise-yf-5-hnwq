import { useState } from 'react';
import { useStore } from '../store.jsx';
import { CABINS, VEHICLE_TYPES, fmtWeight } from '../utils.js';

// 车辆队列：登记候船车辆，严格按排队顺序展示与装载
export default function QueuePanel() {
  const { state, dispatch } = useStore();
  const [vehType, setVehType] = useState('car');
  const [cabin, setCabin] = useState('vehicle');
  const dangerous = vehType === 'hazmat';

  const enqueue = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    dispatch({ type: 'ENQUEUE', plate: fd.get('plate'), weight: fd.get('weight'), vehType, cabin });
    e.target.reset();
    e.target.querySelector('[name="plate"]').focus();
  };

  return (
    <section className="panel">
      <h2 className="panel-title">🚗 车辆队列{state.queue.length > 0 && <span className="count">{state.queue.length}</span>}</h2>

      <form className="enqueue-form" onSubmit={enqueue}>
        <div className="form-row">
          <label>车牌
            <input name="plate" placeholder="如 沪A·12345" required maxLength={16} />
          </label>
          <label>重量(吨)
            <input name="weight" type="number" step="0.01" min="0.01" required className="num-input" />
          </label>
        </div>
        <div className="form-row">
          <label>车型
            <select value={vehType} onChange={(e) => setVehType(e.target.value)}>
              {Object.entries(VEHICLE_TYPES).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </label>
          <label>目标舱位
            <select value={cabin} onChange={(e) => setCabin(e.target.value)}>
              <option value="vehicle">{CABINS.vehicle}</option>
              <option value="passenger">{CABINS.passenger}</option>
            </select>
          </label>
        </div>
        {dangerous && cabin === 'passenger' && (
          <p className="form-warn">⚠ 危险品车登记进入载客舱：装船时将被整车拒绝，且不会离开队列。</p>
        )}
        <button type="submit" className="btn btn-primary btn-block">加入候船队列</button>
      </form>

      {state.queue.length === 0 ? (
        <p className="empty">候船队列空，等待夜间车辆到港。</p>
      ) : (
        <ol className="queue-list">
          {state.queue.map((v, i) => (
            <li key={v.id} className={`queue-item ${i === 0 ? 'is-head' : ''}`}>
              <span className="queue-idx">{i + 1}</span>
              <span className="queue-plate">
                {v.plate}
                {v.dangerous && <em className="tag tag-hazmat">危</em>}
                {i === 0 && <em className="tag tag-head">下一艘装船</em>}
              </span>
              <span className="queue-sub">{VEHICLE_TYPES[v.type]} · {CABINS[v.cabin]}</span>
              <span className="queue-weight">{fmtWeight(v.weight)}</span>
              <button className="btn btn-mini" title="从候船队列撤离"
                onClick={() => dispatch({ type: 'REMOVE_QUEUE', id: v.id })}>✕</button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
