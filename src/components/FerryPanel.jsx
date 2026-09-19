import { useStore } from '../store.jsx';
import { fmtWeight } from '../utils.js';

// 渡轮状态：登记载重上限、检修/投运、放行离港、显示已装重量进度
export default function FerryPanel() {
  const { state, dispatch } = useStore();

  const register = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    dispatch({ type: 'REGISTER_FERRY', name: fd.get('name'), capacity: fd.get('capacity') });
    e.target.reset();
    e.target.querySelector('[name="name"]').focus();
  };

  return (
    <section className="panel">
      <h2 className="panel-title">🚢 渡轮状态</h2>

      <form className="inline-form" onSubmit={register}>
        <input name="name" placeholder="渡轮名称（如：夜航一号）" required maxLength={20} />
        <input name="capacity" type="number" step="0.01" min="0.01" placeholder="载重上限(吨)" required className="num-input" />
        <button type="submit" className="btn btn-primary">登记</button>
      </form>

      {state.ferries.length === 0 && <p className="empty">尚无渡轮，请先登记载重上限。</p>}

      <ul className="ferry-list">
        {state.ferries.map((f, idx) => {
          const used = f.loaded.reduce((s, v) => s + v.weight, 0);
          const pct = Math.min(100, (used / f.capacity) * 100);
          const isNext = f.status === 'active' &&
            !state.ferries.some((x, i) => i < idx && x.status === 'active');
          return (
            <li key={f.id} className={`ferry-card ${f.status === 'maintenance' ? 'is-maint' : ''}`}>
              <div className="ferry-head">
                <span className="ferry-name">
                  {f.name}
                  {isNext && <em className="badge badge-next">当前装船</em>}
                  {f.status === 'maintenance' && <em className="badge badge-maint">检修中</em>}
                  <em className="badge badge-voyage">第 {f.voyages + 1} 航次</em>
                </span>
                <span className="ferry-cap">上限 {fmtWeight(f.capacity)}</span>
              </div>

              <div className="bar" title={`${fmtWeight(used)} / ${fmtWeight(f.capacity)}`}>
                <div className={`bar-fill ${pct >= 100 ? 'is-full' : ''}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="ferry-meta">
                已装 {f.loaded.length} 辆 · {fmtWeight(used)}（{pct.toFixed(1)}%）
              </div>

              <div className="ferry-actions">
                {f.status === 'active' ? (
                  <>
                    <button className="btn btn-depart" disabled={f.loaded.length === 0}
                      onClick={() => dispatch({ type: 'DEPART', ferryId: f.id })}>放行离港</button>
                    <button className="btn btn-warn"
                      onClick={() => dispatch({ type: 'SET_MAINTENANCE', ferryId: f.id })}>
                      开始检修{f.loaded.length > 0 ? `（${f.loaded.length} 辆回队）` : ''}
                    </button>
                  </>
                ) : (
                  <button className="btn btn-primary"
                    onClick={() => dispatch({ type: 'RESUME', ferryId: f.id })}>检修完成，重新投运</button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
