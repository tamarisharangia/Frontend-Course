import { lazy, Suspense, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { allLessons, findLesson, lessonKey, SKILLS } from '../lib/content';
import { actions, lessonRequirements, lessonStatus, useProgress } from '../lib/progress';
import { Markdown } from '../components/Markdown';
import { Quiz } from '../components/Quiz';
import { Playground } from '../widgets/Playground';
import { Comparator } from '../widgets/Comparator';
import { Checklist } from '../widgets/Checklist';
import type { Widget } from '../lib/types';

// Редактор кода тяжёлый, поэтому грузим его только на страницах уроков (code splitting)
const CodeTask = lazy(() => import('../components/CodeTask').then((m) => ({ default: m.CodeTask })));

function WidgetView({ w }: { w: Widget }) {
  if (w.type === 'playground') return <Playground w={w} />;
  if (w.type === 'comparator') return <Comparator w={w} />;
  return <Checklist w={w} />;
}

export function LessonPage() {
  const { moduleId, lessonId } = useParams();
  const p = useProgress();
  const found = findLesson(moduleId, lessonId);

  const key = found ? lessonKey(found.module, found.lesson) : '';
  const req = found ? lessonRequirements(p, found.lesson, key) : null;
  const completed = Boolean(p.lessons[key]?.completedAt);

  // Урок засчитывается автоматически, когда выполнены задание и квиз
  useEffect(() => {
    if (found && !found.lesson.stub && req?.task && req.quiz && !completed) {
      actions.updateLesson(key, { completedAt: new Date().toISOString() });
    }
  }, [found, req?.task, req?.quiz, completed, key]);

  if (!found) return <div className="container"><h1>Урок не найден</h1><Link to="/course">К карте курса</Link></div>;
  const { module, lesson } = found;
  const status = lessonStatus(p, module, lesson);
  const idx = allLessons.findIndex((x) => x.lesson === lesson);
  const prev = allLessons[idx - 1];
  const next = allLessons[idx + 1];
  const skills = Object.entries(lesson.skills).map(([id, n]) => `${SKILLS.find((s) => s.id === id)?.label} +${n}`);

  const header = (
    <div className="page-head">
      <div className="eyebrow"><Link to="/course">Карта курса</Link> · Модуль {module.num} · {module.title}</div>
      <h1>{lesson.title}</h1>
      <p>{lesson.summary}</p>
      <div className="row">
        {lesson.duration && <span className="badge">⏱ {lesson.duration}</span>}
        {skills.map((s) => <span key={s} className="badge">{s}</span>)}
        {completed && <span className="badge badge-done">✓ Урок пройден</span>}
      </div>
    </div>
  );

  if (status === 'soon') {
    return (
      <div className="container">
        {header}
        <div className="card">
          <h3>Урок в разработке</h3>
          <p className="muted">Структура уже готова, контент появится в следующих обновлениях. Чтобы дописать урок самостоятельно, откройте файл
            <code>content/modules/{module.id}.json</code> и заполните поля по образцу модулей 1–3.</p>
          <Link className="btn" to="/course">К карте курса</Link>
        </div>
      </div>
    );
  }
  if (status === 'locked') {
    return (
      <div className="container">
        {header}
        <div className="card">
          <h3>🔒 Урок пока закрыт</h3>
          <p className="muted">Сначала пройдите предыдущие уроки. Или включите «Открыть все уроки» на странице «Прогресс».</p>
          <Link className="btn" to="/course">К карте курса</Link>
        </div>
      </div>
    );
  }

  let n = 0;
  const num = () => String(++n).padStart(2, '0');
  const sections = [
    lesson.theory && 'Теория',
    lesson.figma && 'Как это в Figma',
    lesson.widgets?.length && 'Попробуйте',
    lesson.task && 'Задание',
    lesson.quiz?.length && 'Квиз',
    lesson.practice && 'В работе',
  ].filter(Boolean) as string[];
  const ids = ['theory', 'figma', 'try', 'task', 'quiz', 'practice'];

  return (
    <div className="container">
      {header}
      {lesson.version && <div className="version-note">📌 {lesson.version}</div>}
      <nav className="toc" aria-label="Разделы урока">
        {sections.map((s) => {
          const id = ids[['Теория', 'Как это в Figma', 'Попробуйте', 'Задание', 'Квиз', 'В работе'].indexOf(s)];
          const done = (id === 'task' && req?.task) || (id === 'quiz' && req?.quiz);
          return <a key={s} href={`#${id}`} className={done ? 'done' : ''}>{done ? '✓ ' : ''}{s}</a>;
        })}
      </nav>

      {lesson.theory && (
        <section className="lesson-section" id="theory">
          <h2><span className="section-num">{num()}</span> Теория</h2>
          <Markdown text={lesson.theory} />
        </section>
      )}

      {lesson.figma && (
        <section className="lesson-section" id="figma">
          <div className="callout callout-figma">
            <div className="callout-title"><span className="section-num">{num()}</span> ◆ Как это в Figma</div>
            <Markdown text={lesson.figma} />
          </div>
        </section>
      )}

      {lesson.widgets?.length ? (
        <section className="lesson-section" id="try">
          <h2><span className="section-num">{num()}</span> Попробуйте сами</h2>
          <div className="stack" style={{ gap: 'var(--space-xl)' }}>
            {lesson.widgets.map((w, i) => <WidgetView key={i} w={w} />)}
          </div>
        </section>
      ) : null}

      {lesson.task && (
        <section className="lesson-section" id="task">
          <h2><span className="section-num">{num()}</span> Задание: {lesson.task.title}</h2>
          <Suspense fallback={<div className="card muted">Загружаем редактор…</div>}>
            <CodeTask task={lesson.task} lessonKey={key} lessonTitle={lesson.title} />
          </Suspense>
        </section>
      )}

      {lesson.quiz?.length ? (
        <section className="lesson-section" id="quiz">
          <h2><span className="section-num">{num()}</span> Мини-квиз</h2>
          <Quiz questions={lesson.quiz} lessonKey={key} />
        </section>
      ) : null}

      {lesson.practice && (
        <section className="lesson-section" id="practice">
          <div className="callout callout-work">
            <div className="callout-title"><span className="section-num">{num()}</span> ◎ Применение в работе</div>
            <Markdown text={lesson.practice} />
          </div>
        </section>
      )}

      {lesson.sources?.length ? (
        <section className="lesson-section">
          <h4>Источники</h4>
          <ul className="small">
            {lesson.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}
          </ul>
        </section>
      ) : null}

      <div className="card row">
        {completed ? (
          <span>🎉 Урок пройден! Навыки обновлены.</span>
        ) : (
          <span className="muted">
            Чтобы закрыть урок: {lesson.task && (req?.task ? '✓ задание' : '○ задание')}
            {lesson.task && lesson.quiz?.length ? ' · ' : ''}
            {lesson.quiz?.length ? (req?.quiz ? '✓ квиз' : `○ квиз (от ${req?.quizNeed} верных)`) : ''}
          </span>
        )}
      </div>

      <div className="row" style={{ marginTop: 'var(--space-m)' }}>
        {prev && <Link className="btn" to={`/lesson/${prev.module.id}/${prev.lesson.id}`}>← {prev.lesson.title}</Link>}
        <span className="spacer" />
        {next && lessonStatus(p, next.module, next.lesson) !== 'locked' && (
          <Link className="btn btn-primary" to={`/lesson/${next.module.id}/${next.lesson.id}`}>{next.lesson.title} →</Link>
        )}
      </div>
    </div>
  );
}
