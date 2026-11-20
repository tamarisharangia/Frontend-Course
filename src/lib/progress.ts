// Хранилище прогресса. Всё живёт в localStorage браузера — без сервера.
// useSyncExternalStore — способ React «подписаться» на внешние данные:
// когда прогресс меняется, все экраны, которые его показывают, перерисуются.
import { useSyncExternalStore } from 'react';
import type { CodeFiles, Lesson, Module, SkillId } from './types';
import { allLessons, lessonKey, modules, SKILLS } from './content';

const STORAGE_KEY = 'fe-course-progress';

export interface LessonProgress {
  taskPassed?: boolean;
  quizBest?: number;
  quizTotal?: number;
  completedAt?: string;
}

export interface Progress {
  version: 1;
  lessons: Record<string, LessonProgress>;
  code: Record<string, CodeFiles & { updatedAt: string; passed: boolean; title: string; lesson: string }>;
  /** секунды занятий по дням: { '2026-11-20': 3600 } */
  activity: Record<string, number>;
  /** время занятий на других устройствах (приходит при синхронизации): { deviceId: { день: секунды } } */
  otherActivity: Record<string, Record<string, number>>;
  /** случайный идентификатор этого браузера — нужен, чтобы складывать время с разных устройств */
  deviceId: string;
  checklists: Record<string, ChecklistState>;
  settings: { unlockAll: boolean; dailyGoalMin: number };
}

export interface ChecklistState { checked: Record<string, boolean>; note?: string; updatedAt?: string }

const newDeviceId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const empty = (): Progress => ({
  version: 1,
  lessons: {},
  code: {},
  activity: {},
  otherActivity: {},
  deviceId: newDeviceId(),
  checklists: {},
  settings: { unlockAll: false, dailyGoalMin: 60 },
});

function load(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const data = JSON.parse(raw);
    return { ...empty(), ...data, deviceId: data.deviceId || newDeviceId(), settings: { ...empty().settings, ...data.settings } };
  } catch {
    return empty();
  }
}

let state: Progress = load();
const listeners = new Set<() => void>();
const changeListeners = new Set<() => void>();

/** Подписка на изменения, сделанные на этом устройстве (для синхронизации) */
export function onLocalChange(cb: () => void) {
  changeListeners.add(cb);
  return () => {
    changeListeners.delete(cb);
  };
}

export const getProgress = () => state;

function set(updater: (p: Progress) => Progress, fromSync = false) {
  state = updater(state);
  if (!fromSync) changeListeners.forEach((l) => l());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* приватный режим или переполнено — работаем в памяти */
  }
  listeners.forEach((l) => l());
}

export function useProgress() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ---------- Действия ----------
export const actions = {
  addTime(seconds: number) {
    set((p) => ({ ...p, activity: { ...p.activity, [today()]: (p.activity[today()] ?? 0) + seconds } }));
  },
  updateLesson(key: string, patch: Partial<LessonProgress>) {
    set((p) => {
      const prev = p.lessons[key] ?? {};
      return { ...p, lessons: { ...p.lessons, [key]: { ...prev, ...patch } } };
    });
  },
  saveCode(taskKey: string, files: CodeFiles, meta: { title: string; lesson: string; passed?: boolean }) {
    set((p) => {
      const prev = p.code[taskKey];
      return {
        ...p,
        code: {
          ...p.code,
          [taskKey]: { ...files, title: meta.title, lesson: meta.lesson, passed: meta.passed ?? prev?.passed ?? false, updatedAt: new Date().toISOString() },
        },
      };
    });
  },
  setChecklist(id: string, value: ChecklistState) {
    set((p) => ({ ...p, checklists: { ...p.checklists, [id]: { ...value, updatedAt: new Date().toISOString() } } }));
  },
  /** Применить прогресс, объединённый с сервером */
  applySync(merged: { lessons: Progress['lessons']; code: Progress['code']; checklists: Progress['checklists']; activityByDevice: Record<string, Record<string, number>> }) {
    set((p) => {
      const mine = { ...(merged.activityByDevice[p.deviceId] ?? {}) };
      for (const [day, sec] of Object.entries(p.activity)) mine[day] = Math.max(mine[day] ?? 0, sec);
      const others = { ...merged.activityByDevice };
      delete others[p.deviceId];
      return { ...p, lessons: merged.lessons, code: merged.code, checklists: merged.checklists, activity: mine, otherActivity: others };
    }, true);
  },
  setSettings(patch: Partial<Progress['settings']>) {
    set((p) => ({ ...p, settings: { ...p.settings, ...patch } }));
  },
  importJSON(text: string) {
    const data = JSON.parse(text);
    if (!data || data.version !== 1 || typeof data.lessons !== 'object') throw new Error('Неверный формат файла');
    set((p) => ({ ...empty(), ...data, deviceId: p.deviceId, otherActivity: data.otherActivity ?? {}, settings: { ...empty().settings, ...data.settings } }));
  },
  reset() {
    set((p) => ({ ...empty(), deviceId: p.deviceId }));
  },
};

export const exportJSON = () => JSON.stringify(state, null, 2);

// ---------- Вычисления ----------
export function isLessonDone(p: Progress, lesson: Lesson, key: string) {
  return Boolean(p.lessons[key]?.completedAt) && !lesson.stub;
}

/** Требования для завершения урока */
export function lessonRequirements(p: Progress, lesson: Lesson, key: string) {
  const lp = p.lessons[key] ?? {};
  const quizNeed = lesson.quiz?.length ? Math.ceil(lesson.quiz.length * 0.6) : 0;
  return {
    task: lesson.task ? Boolean(lp.taskPassed) : true,
    quiz: lesson.quiz?.length ? (lp.quizBest ?? 0) >= quizNeed : true,
    quizNeed,
  };
}

export function moduleDone(p: Progress, m: Module) {
  return m.status === 'ready' && m.lessons.every((l) => isLessonDone(p, l, lessonKey(m, l)));
}

export type LessonStatus = 'locked' | 'open' | 'done' | 'soon';

/** Правило доступа: уроки внутри модуля — по порядку; модуль открывается,
 *  когда пройдены все предыдущие наполненные модули. Заглушки не блокируют. */
export function lessonStatus(p: Progress, m: Module, l: Lesson): LessonStatus {
  if (l.stub || m.status === 'stub') return 'soon';
  const key = lessonKey(m, l);
  if (isLessonDone(p, l, key)) return 'done';
  if (p.settings.unlockAll) return 'open';
  const prevModulesDone = modules.filter((x) => x.order < m.order && x.status === 'ready').every((x) => moduleDone(p, x));
  if (!prevModulesDone) return 'locked';
  const idx = m.lessons.indexOf(l);
  if (idx === 0) return 'open';
  const prev = m.lessons[idx - 1];
  return isLessonDone(p, prev, lessonKey(m, prev)) ? 'open' : 'locked';
}

export function nextLesson(p: Progress) {
  return allLessons.find(({ module, lesson }) => lessonStatus(p, module, lesson) === 'open') ?? null;
}

/** Время занятий по дням со всех устройств */
export function allActivity(p: Progress): Record<string, number> {
  const sum: Record<string, number> = { ...p.activity };
  for (const days of Object.values(p.otherActivity ?? {}))
    for (const [day, sec] of Object.entries(days)) sum[day] = (sum[day] ?? 0) + sec;
  return sum;
}

export function streak(p: Progress) {
  const act = allActivity(p);
  const active = (d: string) => (act[d] ?? 0) >= 60;
  const d = new Date();
  const fmt = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  if (!active(fmt(d))) d.setDate(d.getDate() - 1); // сегодня ещё не занимались — стрик не сгорел
  let n = 0;
  while (active(fmt(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export const totalSeconds = (p: Progress) => Object.values(allActivity(p)).reduce((a, b) => a + b, 0);

export const LEVELS = ['Новичок', 'Знакомство', 'Базовый', 'Уверенный', 'Продвинутый', 'Дизайн-инженер'];

/** Навыки: очки за пройденные уроки / все возможные очки по курсу */
export function skillStats(p: Progress) {
  return SKILLS.map(({ id, label }) => {
    let earned = 0;
    let total = 0;
    for (const { module, lesson } of allLessons) {
      const pts = lesson.skills[id as SkillId] ?? 0;
      total += pts;
      if (isLessonDone(p, lesson, lessonKey(module, lesson))) earned += pts;
    }
    const ratio = total ? earned / total : 0;
    const level = earned === 0 ? 0 : Math.min(LEVELS.length - 1, 1 + Math.floor(ratio * (LEVELS.length - 1)));
    return { id, label, earned, total, ratio, level };
  });
}
