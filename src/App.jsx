import { useDock } from './store.js';
import FerryPanel from './components/FerryPanel.jsx';
import VehiclePanel from './components/VehiclePanel.jsx';
import RecordsPanel from './components/RecordsPanel.jsx';

export default function App() {
  const [state, dispatch] = useDock();

  const currentFerry = state.ferries.find((f) => f.status === 'active') || null;
  const head = state.queue[0] || null;
  const loadedWeight = currentFerry
    ? currentFerry.loaded.reduce((s, v) => s + v.weight, 0)
    : 0;
  const onBoardCount = state.ferries.reduce((s, f) => s + f.loaded.length, 0);

  return (
    <div className="app">
      <header className="header">
        <h1>🌙 夜间渡轮装载台</h1>
        <div className="stats">
          <span>候船 <b>{state.queue.length}</b> 辆</span>
          <span>在船 <b>{onBoardCount}</b> 辆</span>
          <span>
            当前渡轮 <b>{currentFerry ? currentFerry.name : '—'}</b>
            {currentFerry && `（${loadedWeight}/${currentFerry.capacity}t）`}
          </span>
          <span>记录 <b>{state.records.length}</b> 条</span>
        </div>
      </header>

      <section className="opsbar">
        <button
          className="btn btn-primary btn-load"
          onClick={() => dispatch({ type: 'LOAD_NEXT' })}
          disabled={!currentFerry || !head}
        >
          ⚓ 装载下一辆
        </button>
        <div className="ops-hint">
          {!currentFerry && '没有可作业的渡轮，请先登记或结束检修。'}
          {currentFerry && !head && '候船队列为空，请先登记车辆。'}
          {currentFerry && head && (
            <>
              队首：<b>{head.plate}</b>（{head.kind}，{head.weight}t
              {head.dangerous ? '，⚠️危险品' : ''}） → 「{currentFerry.name}」
              {currentFerry.deck === 'passenger' ? '（载客舱）' : '（载货舱）'}
              ，已装 {loadedWeight}/{currentFerry.capacity}t。
              超限或危险品进入载客舱将整车拒绝、留队等候。
            </>
          )}
        </div>
      </section>

      <main className="grid">
        <FerryPanel ferries={state.ferries} currentFerryId={currentFerry?.id} dispatch={dispatch} />
        <VehiclePanel queue={state.queue} dispatch={dispatch} />
        <RecordsPanel records={state.records} dispatch={dispatch} />
      </main>

      <footer className="footer">
        数据保存在浏览器本地（localStorage），刷新后自动恢复。
        <button
          className="btn btn-link"
          onClick={() => {
            if (window.confirm('确定清空全部渡轮、车辆与记录吗？')) {
              dispatch({ type: 'RESET_ALL' });
            }
          }}
        >
          清空全部数据
        </button>
      </footer>
    </div>
  );
}
