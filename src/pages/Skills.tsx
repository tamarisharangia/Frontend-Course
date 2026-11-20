import { modules } from '../lib/content';
import { LEVELS, skillStats, useProgress } from '../lib/progress';
import { Radar } from '../components/Radar';

export function Skills() {
  const p = useProgress();
  const stats = skillStats(p);
  return (
    <div className="container-wide">
      <div className="page-head">
        <h1>Навыки</h1>
        <p>Каждый урок даёт очки навыков. Уровень растёт, когда вы закрываете уроки (задание и квиз).</p>
      </div>
      <div className="grid grid-2">
        <div className="card"><Radar data={stats} size={420} /></div>
        <div className="card">
          {stats.map((s) => {
            const sources = modules.filter((m) => m.skills.includes(s.id)).map((m) => m.num);
            return (
              <div key={s.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                <div className="row small">
                  <strong>{s.label}</strong>
                  <span className="badge">{LEVELS[s.level]}</span>
                  <span className="spacer" />
                  <span className="subtle">{s.earned} / {s.total} очков</span>
                </div>
                <div className="progress" style={{ marginTop: 6 }}><span style={{ width: `${s.ratio * 100}%` }} /></div>
                <div className="subtle" style={{ marginTop: 4 }}>Модули: {sources.join(', ')}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
