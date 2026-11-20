import { Link } from 'react-router-dom';
import { modules, lessonKey } from '../lib/content';
import { isLessonDone, lessonStatus, useProgress } from '../lib/progress';

const STATUS_ICON = { done: '✓', open: '▸', locked: '🔒', soon: '…' } as const;
const STATUS_LABEL = { done: 'Пройден', open: 'Доступен', locked: 'Закрыт', soon: 'Скоро' } as const;

export function CourseMap() {
  const p = useProgress();
  return (
    <div className="container-wide">
      <div className="page-head">
        <h1>Карта курса</h1>
        <p>13 модулей. Уроки открываются по порядку: пройдите задание и квиз — откроется следующий. Модули со статусом «Скоро» пока в разработке.</p>
      </div>
      <div className="grid grid-2">
        {modules.map((m) => {
          const done = m.lessons.filter((l) => isLessonDone(p, l, lessonKey(m, l))).length;
          return (
            <section key={m.id} className="card module-card">
              <div className="row">
                <span className="module-num">Модуль {m.num}</span>
                <span className="spacer" />
                {m.status === 'stub' ? <span className="badge badge-warn">Скоро</span> : done === m.lessons.length ? <span className="badge badge-done">Пройден</span> : <span className="badge badge-open">{done} / {m.lessons.length}</span>}
              </div>
              <h3 style={{ margin: 0 }}>{m.title}</h3>
              <p className="muted small" style={{ margin: 0 }}>{m.summary}</p>
              {m.status === 'ready' && <div className="progress"><span style={{ width: `${(done / m.lessons.length) * 100}%` }} /></div>}
              <ul className="lesson-list">
                {m.lessons.map((l, i) => {
                  const st = lessonStatus(p, m, l);
                  const inner = (
                    <>
                      <span className={`lesson-status ${st}`} aria-hidden>{st === 'done' ? '✓' : st === 'open' ? i + 1 : STATUS_ICON[st]}</span>
                      <span style={{ flex: 1 }}>{l.title}</span>
                      <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{STATUS_LABEL[st]}</span>
                    </>
                  );
                  return (
                    <li key={l.id}>
                      {st === 'open' || st === 'done' ? (
                        <Link className="lesson-row" to={`/lesson/${m.id}/${l.id}`}>{inner}</Link>
                      ) : st === 'soon' ? (
                        <Link className="lesson-row locked" style={{ cursor: 'pointer' }} to={`/lesson/${m.id}/${l.id}`} title="Описание будущего урока">{inner}</Link>
                      ) : (
                        <div className="lesson-row locked" title="Сначала пройдите предыдущие уроки">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
