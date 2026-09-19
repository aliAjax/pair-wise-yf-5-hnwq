import { useState } from 'react';
import { useStore } from './store.jsx';
import FerryPanel from './components/FerryPanel.jsx';
import ManifestPanel from './components/ManifestPanel.jsx';
import QueuePanel from './components/QueuePanel.jsx';
import RecordsPanel from './components/RecordsPanel.jsx';

export default function App() {
  const { state, dispatch } = useStore();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌙 夜间渡轮装载台</h1>
        <p className="subtitle">
          在役渡轮 {state.ferries.filter((f) => f.status === 'active').length} 艘 ·
          检修 {state.ferries.filter((f) => f.status === 'maintenance').length} 艘 ·
          候船车辆 {state.queue.length} 辆
        </p>
        <div className="header-tools">
          {confirmReset ? (
            <span className="reset-confirm">
              清空全部本地数据？
              <button className="btn btn-mini btn-danger" onClick={() => { dispatch({ type: 'RESET_ALL' }); setConfirmReset(false); }}>确认</button>
              <button className="btn btn-mini" onClick={() => setConfirmReset(false)}>取消</button>
            </span>
          ) : (
            <button className="btn btn-mini" onClick={() => setConfirmReset(true)}>重置数据</button>
          )}
        </div>
      </header>

      <main className="grid">
        <FerryPanel />
        <QueuePanel />
        <ManifestPanel />
        <RecordsPanel />
      </main>

      <footer className="app-footer">
        装载表、车辆队列、渡轮状态与放行记录均保存在浏览器本地（localStorage），刷新页面后保留。
      </footer>
    </div>
  );
}
