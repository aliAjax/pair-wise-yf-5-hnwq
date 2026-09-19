import { useStore } from '../store.jsx';
import { fmtTime, formatRecord } from '../utils.js';

// 放行记录：装载拒绝、离港放行、检修回队等操作日志
export default function RecordsPanel() {
  const { state, dispatch } = useStore();

  return (
    <section className="panel panel-wide">
      <div className="records-head">
        <h2 className="panel-title">🛟 放行记录{state.records.length > 0 && <span className="count">{state.records.length}</span>}</h2>
        {state.records.length > 0 && (
          <button className="btn btn-mini" onClick={() => dispatch({ type: 'CLEAR_RECORDS' })}>清空记录</button>
        )}
      </div>

      {state.records.length === 0 ? (
        <p className="empty">暂无记录。</p>
      ) : (
        <ul className="record-list">
          {state.records.map((r) => (
            <li key={r.id} className={`record record-${r.kind}`}>
              <span className="record-time">{fmtTime(r.time)}</span>
              <span className="record-text">{formatRecord(r)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
