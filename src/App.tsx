import { useEffect } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useTheme, type ThemePref } from './lib/theme';
import { useTimeTracker } from './lib/useTimeTracker';
import { streak, useProgress } from './lib/progress';
import { Home } from './pages/Home';
import { CourseMap } from './pages/CourseMap';
import { LessonPage } from './pages/LessonPage';
import { Skills } from './pages/Skills';
import { MyCode } from './pages/MyCode';
import { Glossary } from './pages/Glossary';
import { Tokens } from './pages/Tokens';
import { Settings } from './pages/Settings';

const NAV = [
  { to: '/', label: 'Сегодня', icon: '☀︎', end: true },
  { to: '/course', label: 'Карта курса', icon: '◫' },
  { to: '/skills', label: 'Навыки', icon: '✦' },
  { to: '/code', label: 'Мой код', icon: '</>' },
  { to: '/glossary', label: 'Глоссарий', icon: '⇄' },
  { to: '/tokens', label: 'Токены сайта', icon: '◐' },
  { to: '/settings', label: 'Прогресс', icon: '⚙︎' },
];
const SHORT: Record<string, string> = { '/': 'Сегодня', '/course': 'Курс', '/skills': 'Навыки', '/glossary': 'Словарь', '/settings': 'Прогресс' };
const MOBILE = NAV.filter((n) => n.to in SHORT).map((n) => ({ ...n, label: SHORT[n.to] }));

function ThemeSwitch({ pref, setPref }: { pref: ThemePref; setPref: (p: ThemePref) => void }) {
  return (
    <div className="segmented" role="group" aria-label="Тема">
      {(['light', 'system', 'dark'] as ThemePref[]).map((t) => (
        <button key={t} aria-pressed={pref === t} onClick={() => setPref(t)} title={t}>
          {t === 'light' ? 'Светлая' : t === 'dark' ? 'Тёмная' : 'Авто'}
        </button>
      ))}
    </div>
  );
}

export function App() {
  const { pref, setPref } = useTheme();
  const progress = useProgress();
  const { pathname } = useLocation();
  useTimeTracker();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  const s = streak(progress);

  return (
    <div className="app">
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">{'</>'}</span>
          <span>Фронтенд<br /><span className="subtle">для дизайнера</span></span>
        </NavLink>
        <nav className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <span className="nav-icon" aria-hidden>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>🔥 Стрик: {s} {plural(s, 'день', 'дня', 'дней')}</span>
          <ThemeSwitch pref={pref} setPref={setPref} />
        </div>
      </aside>
      <main className="main">
        <div className="mobile-top">
          <NavLink to="/" className="brand"><span className="brand-mark">{'</>'}</span></NavLink>
          <ThemeSwitch pref={pref} setPref={setPref} />
        </div>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/course" element={<CourseMap />} />
          <Route path="/lesson/:moduleId/:lessonId" element={<LessonPage />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/code" element={<MyCode />} />
          <Route path="/glossary" element={<Glossary />} />
          <Route path="/tokens" element={<Tokens />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<div className="container"><h1>Страница не найдена</h1><NavLink to="/">На главную</NavLink></div>} />
        </Routes>
      </main>
      <nav className="mobile-bar" aria-label="Навигация">
        {MOBILE.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}>
            <span aria-hidden style={{ fontSize: 18 }}>{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
