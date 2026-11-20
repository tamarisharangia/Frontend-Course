import { Link } from 'react-router-dom';
import { modules, lessonKey } from '../lib/content';
import { allActivity, isLessonDone, nextLesson, skillStats, streak, today, totalSeconds, useProgress } from '../lib/progress';
import { Radar } from '../components/Radar';
import { plural } from '../App';

export function Home() {
  const p = useProgress();
  const next = nextLesson(p);
  const todayMin = Math.floor((allActivity(p)[today()] ?? 0) / 60);
  const goal = p.settings.dailyGoalMin;
  const hours = totalSeconds(p) / 3600;
  const ready = modules.filter((m) => m.status === 'ready').flatMap((m) => m.lessons.map((l) => ({ m, l })));
  const done = ready.filter(({ m, l }) => isLessonDone(p, l, lessonKey(m, l))).length;
  const s = streak(p);

  return (
    <div className="container-wide">
      <div className="page-head">
        <div className="eyebrow">{new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <h1>Привет! Продолжим?</h1>
        <p>Курс фронтенда для продуктового дизайнера: от «как устроен браузер» до своего экрана из Figma в коде.</p>
      </div>

      <div className="grid grid-2">
        <div className="card stack">
          <div className="eyebrow">Урок на сегодня</div>
          {next ? (
            <>
              <div>
                <div className="subtle">Модуль {next.module.num} · {next.module.title}</div>
                <h2 style={{ marginTop: 4 }}>{next.lesson.title}</h2>
                <p className="muted">{next.lesson.summary}</p>
              </div>
              <div className="row">
                <Link className="btn btn-primary" to={`/lesson/${next.module.id}/${next.lesson.id}`}>Начать урок →</Link>
                {next.lesson.duration && <span className="badge">⏱ {next.lesson.duration}</span>}
              </div>
            </>
          ) : (
            <p>Все доступные уроки пройдены 🎉 Новые модули скоро появятся — загляните в <Link to="/course">карту курса</Link>.</p>
          )}
          <hr style={{ margin: 'var(--space-xs) 0' }} />
          <div>
            <div className="row small" style={{ marginBottom: 6 }}>
              <span>Сегодня: {todayMin} мин из {goal}</span>
              <span className="spacer" />
              <span className="subtle">{todayMin >= goal ? 'Цель дня выполнена ✓' : `ещё ${goal - todayMin} мин`}</span>
            </div>
            <div className="progress"><span style={{ width: `${Math.min(100, (todayMin / goal) * 100)}%` }} /></div>
          </div>
        </div>

        <div className="card">
          <div className="eyebrow">Навыки</div>
          <Radar data={skillStats(p)} size={340} />
          <div style={{ textAlign: 'center' }}><Link to="/skills" className="small">Подробнее о навыках →</Link></div>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginTop: 'var(--space-s)' }}>
        <div className="card stat"><span className="stat-value">🔥 {s}</span><span className="stat-label">{plural(s, 'день', 'дня', 'дней')} подряд</span></div>
        <div className="card stat"><span className="stat-value">{hours < 1 ? `${Math.round(hours * 60)} мин` : `${hours.toFixed(1)} ч`}</span><span className="stat-label">всего занятий</span></div>
        <div className="card stat"><span className="stat-value">{done} / {ready.length}</span><span className="stat-label">уроков пройдено</span></div>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-s)' }}>
        <h3>Как устроен урок</h3>
        <p className="muted" style={{ margin: 0 }}>
          Теория простым языком → «Как это в Figma» → интерактивный пример с ползунками → задание в редакторе с автопроверкой →
          мини-квиз → «Применение в работе». Урок засчитывается, когда пройдены задание и квиз. На телефоне удобно повторять теорию и квизы.
        </p>
      </div>
    </div>
  );
}
