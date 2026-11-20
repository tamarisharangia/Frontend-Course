import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProgress } from '../lib/progress';
import { MiniFrame } from '../components/MiniFrame';

export function MyCode() {
  const p = useProgress();
  const entries = Object.entries(p.code).sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt));
  const [open, setOpen] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast('Скопировано');
    } catch {
      setToast('Не удалось скопировать');
    }
    setTimeout(() => setToast(''), 1500);
  };

  return (
    <div className="container-wide">
      <div className="page-head">
        <h1>Мой код</h1>
        <p>Все ваши решения заданий. Код сохраняется автоматически, пока вы печатаете.</p>
      </div>
      {entries.length === 0 && <div className="card"><p className="muted" style={{ margin: 0 }}>Пока пусто. Откройте любой урок и начните задание — код появится здесь.</p></div>}
      <div className="grid grid-2">
        {entries.map(([key, c]) => {
          const [lessonPath] = key.split('#');
          const full = `<!-- HTML -->\n${c.html ?? ''}\n\n/* CSS */\n${c.css ?? ''}${c.js ? `\n\n// JS\n${c.js}` : ''}`;
          return (
            <div key={key} className="card stack" style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
              <div style={{ borderBottom: '1px solid var(--color-border)' }}>
                <MiniFrame html={c.html ?? ''} css={c.css ?? ''} height={180} title={c.title} />
              </div>
              <div style={{ padding: 'var(--space-s)' }} className="stack">
                <div className="row">
                  <strong>{c.title}</strong>
                  <span className="spacer" />
                  {c.passed ? <span className="badge badge-done">✓ Решено</span> : <span className="badge">Черновик</span>}
                </div>
                <div className="subtle">{c.lesson} · {new Date(c.updatedAt).toLocaleString('ru-RU')}</div>
                <div className="row">
                  <Link className="btn btn-sm" to={`/lesson/${lessonPath}#task`}>Открыть задание</Link>
                  <button className="btn btn-sm" onClick={() => setOpen(open === key ? null : key)}>{open === key ? 'Скрыть код' : 'Показать код'}</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => copy(full)}>Копировать</button>
                </div>
                {open === key && <pre style={{ maxHeight: 320 }}><code>{full}</code></pre>}
              </div>
            </div>
          );
        })}
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
