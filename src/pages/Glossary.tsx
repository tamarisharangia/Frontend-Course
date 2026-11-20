import { useMemo, useState } from 'react';
import { glossary } from '../lib/content';

export function Glossary() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Все');
  const cats = ['Все', ...Array.from(new Set(glossary.map((t) => t.category)))];
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return glossary.filter((t) => (cat === 'Все' || t.category === cat) && (!s || `${t.designer} ${t.developer} ${t.explain}`.toLowerCase().includes(s)));
  }, [q, cat]);

  return (
    <div className="container">
      <div className="page-head">
        <h1>Глоссарий</h1>
        <p>Переводчик «дизайнер ↔ разработчик»: слева — как говорим мы, справа — как называют это в коде.</p>
      </div>
      <div className="stack" style={{ marginBottom: 'var(--space-m)' }}>
        <input type="search" placeholder="Поиск: auto layout, токен, safe area…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Поиск по глоссарию" />
        <div className="row">
          {cats.map((c) => (
            <button key={c} className={`btn btn-sm ${cat === c ? 'btn-primary' : ''}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
      </div>
      <div className="stack">
        {list.map((t) => (
          <div key={t.designer + t.developer} className="card term">
            <div><div className="eyebrow">Дизайнер</div><div className="term-side">{t.designer}</div></div>
            <div><div className="eyebrow">Разработчик</div><div className="term-side"><code>{t.developer}</code></div></div>
            <p className="term-desc">{t.explain} <span className="badge">{t.category}</span></p>
          </div>
        ))}
        {list.length === 0 && <p className="muted">Ничего не нашлось.</p>}
      </div>
    </div>
  );
}
