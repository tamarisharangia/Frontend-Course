import { useRef, useState } from 'react';
import { actions, exportJSON, totalSeconds, useProgress } from '../lib/progress';

export function Settings() {
  const p = useProgress();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([exportJSON()], { type: 'application/json' }));
    a.download = `progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const upload = async (f: File) => {
    try {
      actions.importJSON(await f.text());
      setMsg('Прогресс загружен ✓');
    } catch (e) {
      setMsg(`Ошибка: ${(e as Error).message}`);
    }
  };

  return (
    <div className="container">
      <div className="page-head">
        <h1>Прогресс и настройки</h1>
        <p>Прогресс хранится только в этом браузере (localStorage). Чтобы перенести его на телефон или другой компьютер — экспортируйте JSON и импортируйте там.</p>
      </div>
      <div className="card stack">
        <h3>Резервная копия</h3>
        <div className="row">
          <button className="btn btn-primary" onClick={download}>Экспорт в JSON</button>
          <button className="btn" onClick={() => file.current?.click()}>Импорт из JSON</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>
        {msg && <p className="small" role="status" style={{ margin: 0 }}>{msg}</p>}
        <p className="subtle" style={{ margin: 0 }}>
          Уроков завершено: {Object.values(p.lessons).filter((l) => l.completedAt).length} · сохранённых решений: {Object.keys(p.code).length} · время: {Math.round(totalSeconds(p) / 60)} мин
        </p>
      </div>
      <div className="card stack">
        <h3>Обучение</h3>
        <label className="row" style={{ cursor: 'pointer', flexWrap: 'nowrap' }}>
          <input type="checkbox" checked={p.settings.unlockAll} onChange={(e) => actions.setSettings({ unlockAll: e.target.checked })} />
          <span>Открыть все уроки (без последовательной разблокировки)</span>
        </label>
        <div className="control">
          <label><span>Цель на день</span><output>{p.settings.dailyGoalMin} мин</output></label>
          <input type="range" min={15} max={180} step={15} value={p.settings.dailyGoalMin} onChange={(e) => actions.setSettings({ dailyGoalMin: Number(e.target.value) })} aria-label="Цель на день, минут" />
        </div>
      </div>
      <div className="card stack">
        <h3>Сброс</h3>
        <p className="muted small" style={{ margin: 0 }}>Удалит весь прогресс, код и чек-листы в этом браузере. Сначала сделайте экспорт.</p>
        <div><button className="btn" style={{ color: 'var(--color-danger)' }} onClick={() => confirm('Точно удалить весь прогресс? Это нельзя отменить.') && actions.reset()}>Сбросить прогресс</button></div>
      </div>
    </div>
  );
}
