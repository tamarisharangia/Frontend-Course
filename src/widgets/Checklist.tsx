import type { ChecklistWidget } from '../lib/types';
import { actions, useProgress } from '../lib/progress';

/** Чек-лист сохраняется в прогрессе, его можно скачать как Markdown-файл. */
export function Checklist({ w }: { w: ChecklistWidget }) {
  const progress = useProgress();
  const state = progress.checklists[w.id] ?? { checked: {}, note: '' };
  const all = w.groups.flatMap((g, gi) => g.items.map((_, ii) => `${gi}-${ii}`));
  const count = all.filter((k) => state.checked[k]).length;

  const toggle = (k: string) => actions.setChecklist(w.id, { ...state, checked: { ...state.checked, [k]: !state.checked[k] } });

  const download = () => {
    const md = [`# ${w.title}`, '', state.note ? `Макет: ${state.note}\n` : '', ...w.groups.flatMap((g, gi) => [
      `## ${g.title}`, ...g.items.map((it, ii) => `- [${state.checked[`${gi}-${ii}`] ? 'x' : ' '}] ${it}`), '',
    ]), `Проверено: ${count} из ${all.length} · ${new Date().toLocaleDateString('ru-RU')}`].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download = `checklist-${w.id}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="stack">
      <div>
        <h3>{w.title}</h3>
        {w.description && <p className="muted">{w.description}</p>}
      </div>
      <div className="card stack">
        <label className="small">
          Какой макет проверяете
          <input type="text" value={state.note ?? ''} placeholder="Например: экран оплаты, v3" onChange={(e) => actions.setChecklist(w.id, { ...state, note: e.target.value })} />
        </label>
        <div className="progress" aria-label={`Отмечено ${count} из ${all.length}`}><span style={{ width: `${(count / all.length) * 100}%` }} /></div>
        {w.groups.map((g, gi) => (
          <div key={gi}>
            <h4>{g.title}</h4>
            {g.items.map((it, ii) => {
              const k = `${gi}-${ii}`;
              return (
                <label key={k} className="row" style={{ alignItems: 'flex-start', padding: '6px 0', cursor: 'pointer', flexWrap: 'nowrap' }}>
                  <input type="checkbox" checked={Boolean(state.checked[k])} onChange={() => toggle(k)} style={{ marginTop: 3, flexShrink: 0 }} />
                  <span>{it}</span>
                </label>
              );
            })}
          </div>
        ))}
        <div className="row">
          <button className="btn btn-primary" onClick={download}>Скачать как .md</button>
          <button className="btn btn-ghost" onClick={() => confirm('Снять все отметки?') && actions.setChecklist(w.id, { checked: {}, note: '' })}>Сбросить</button>
          <span className="subtle">{count} из {all.length} · сохраняется автоматически</span>
        </div>
      </div>
    </div>
  );
}
