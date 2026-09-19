import { useState } from 'react';

const KINDS = ['轿车', '客车', '货车', '罐车'];

export default function VehiclePanel({ queue, dispatch }) {
  const [plate, setPlate] = useState('');
  const [kind, setKind] = useState(KINDS[0]);
  const [weight, setWeight] = useState('');
  const [dangerous, setDangerous] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const w = Number(weight);
    if (!plate.trim() || !Number.isFinite(w) || w <= 0) return;
    dispatch({ type: 'ADD_VEHICLE', plate: plate.trim().toUpperCase(), kind, weight: w, dangerous });
    setPlate('');
    setWeight('');
    setDangerous(false);
  };

  return (
    <section className="panel">
      <h2>🚗 车辆登记 / 候船队列</h2>

      <form className="form" onSubmit={submit}>
        <input
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          placeholder="车牌，如：浙A·12345"
        />
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          {KINDS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <input
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="重量（吨）"
          inputMode="decimal"
        />
        <label className="checkbox">
          <input
            type="checkbox"
            checked={dangerous}
            onChange={(e) => setDangerous(e.target.checked)}
          />
          危险品
        </label>
        <button className="btn" type="submit">登记入队</button>
      </form>

      {queue.length === 0 && <p className="empty">队列为空。</p>}

      <ol className="queue">
        {queue.map((v, i) => (
          <li key={v.id} className={i === 0 ? 'head' : ''}>
            <span className="pos">{i + 1}</span>
            <span className="plate">{v.plate}</span>
            <span className="dim">
              {v.kind} · {v.weight}t{v.dangerous ? ' · ⚠️危险品' : ''}
            </span>
            {i === 0 && <span className="badge badge-current">队首</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
