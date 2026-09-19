export default function RecordsPanel({ records, dispatch }) {
  return (
    <section className="panel">
      <h2>
        📜 放行记录
        {records.length > 0 && (
          <button className="btn btn-link" onClick={() => dispatch({ type: 'CLEAR_RECORDS' })}>
            清空
          </button>
        )}
      </h2>

      {records.length === 0 && <p className="empty">暂无记录。</p>}

      <ul className="records">
        {records.map((r) => (
          <li key={r.id} className={`rec rec-${r.kind}`}>
            <span className="rec-time">{r.time}</span>
            <span className="rec-text">{r.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
