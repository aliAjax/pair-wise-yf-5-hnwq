import { useState } from 'react';

export default function FerryPanel({ ferries, currentFerryId, dispatch }) {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [deck, setDeck] = useState('passenger');

  const submit = (e) => {
    e.preventDefault();
    const cap = Number(capacity);
    if (!name.trim() || !Number.isFinite(cap) || cap <= 0) return;
    dispatch({ type: 'ADD_FERRY', name: name.trim(), capacity: cap, deck });
    setName('');
    setCapacity('');
  };

  return (
    <section className="panel">
      <h2>🚢 渡轮登记 / 装载表</h2>

      <form className="form" onSubmit={submit}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="船名，如：夜航 3 号"
        />
        <input
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder="载重上限（吨）"
          inputMode="decimal"
        />
        <select value={deck} onChange={(e) => setDeck(e.target.value)}>
          <option value="passenger">载客舱</option>
          <option value="cargo">载货舱</option>
        </select>
        <button className="btn" type="submit">登记渡轮</button>
      </form>

      {ferries.length === 0 && <p className="empty">尚未登记渡轮。</p>}

      <div className="ferry-list">
        {ferries.map((f) => {
          const loadedWeight = f.loaded.reduce((s, v) => s + v.weight, 0);
          const pct = Math.min(100, Math.round((loadedWeight / f.capacity) * 100));
          const isCurrent = f.id === currentFerryId;
          return (
            <div key={f.id} className={`ferry-card ${f.status} ${isCurrent ? 'current' : ''}`}>
              <div className="ferry-head">
                <span className="ferry-name">{f.name}</span>
                <span className="badges">
                  {isCurrent && <span className="badge badge-current">当前作业</span>}
                  {f.status === 'maintenance' && <span className="badge badge-maint">检修中</span>}
                  {!isCurrent && f.status === 'active' && <span className="badge">待命</span>}
                  <span className="badge">{f.deck === 'passenger' ? '载客舱' : '载货舱'}</span>
                </span>
              </div>

              <div className="meter" title={`${loadedWeight}/${f.capacity}t`}>
                <div className="meter-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="ferry-meta">
                已装 {f.loaded.length} 辆 · {loadedWeight}/{f.capacity}t
              </div>

              {f.loaded.length > 0 ? (
                <ol className="manifest">
                  {f.loaded.map((v) => (
                    <li key={v.id}>
                      <span>{v.plate}</span>
                      <span className="dim">{v.kind} · {v.weight}t{v.dangerous ? ' · ⚠️危险品' : ''}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="empty">舱内暂无车辆。</p>
              )}

              <button
                className={`btn ${f.status === 'active' ? 'btn-danger' : ''}`}
                onClick={() => dispatch({ type: 'TOGGLE_MAINTENANCE', id: f.id })}
              >
                {f.status === 'active' ? '🔧 转入检修（已装车辆回队）' : '🛠️ 检修完成，恢复待命'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
