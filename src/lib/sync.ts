// Синхронизация прогресса между устройствами по «ключу синхронизации».
//
// Как это работает:
// 1. Скачиваем прогресс с сервера (/api/progress).
// 2. ОБЪЕДИНЯЕМ его с локальным — ничего не перезаписываем вслепую.
// 3. Если результат отличается от серверного — отправляем обратно.
// 4. Применяем объединённый прогресс на этом устройстве.
import { useEffect, useSyncExternalStore } from 'react';
import { actions, getProgress, onLocalChange, type Progress } from './progress';

const KEY_STORAGE = 'fe-sync-key';
export const KEY_RE = /^[a-f0-9]{32}$/;

export interface SyncPayload {
  version: 1;
  lessons: Progress['lessons'];
  code: Progress['code'];
  checklists: Progress['checklists'];
  /** время занятий отдельно по устройствам, чтобы складывать, а не затирать */
  activityByDevice: Record<string, Record<string, number>>;
}

// ---------- Ключ ----------
export function getSyncKey(): string | null {
  try {
    const k = localStorage.getItem(KEY_STORAGE);
    return k && KEY_RE.test(k) ? k : null;
  } catch {
    return null;
  }
}

function storeKey(key: string | null) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch { /* ignore */ }
}

export function createSyncKey() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Ссылка для подключения другого устройства. Ключ стоит после #, поэтому браузер не отправляет его на сервер. */
export const syncLink = (key: string) => `${location.origin}/settings#sync=${key}`;

// ---------- Статус (для интерфейса) ----------
export type SyncStatus =
  | { state: 'off' }
  | { state: 'syncing' }
  | { state: 'ok'; at: string }
  | { state: 'error'; message: string };

let status: SyncStatus = getSyncKey() ? { state: 'ok', at: '' } : { state: 'off' };
const statusListeners = new Set<() => void>();
function setStatus(s: SyncStatus) {
  status = s;
  statusListeners.forEach((l) => l());
}
export function useSyncStatus() {
  return useSyncExternalStore(
    (cb) => {
      statusListeners.add(cb);
      return () => statusListeners.delete(cb);
    },
    () => status,
  );
}

// ---------- Слияние ----------
const max = (a?: number, b?: number) => (a === undefined ? b : b === undefined ? a : Math.max(a, b));
const minDate = (a?: string, b?: string) => (!a ? b : !b ? a : a < b ? a : b);

export function toPayload(p: Progress): SyncPayload {
  return {
    version: 1,
    lessons: p.lessons,
    code: p.code,
    checklists: p.checklists,
    activityByDevice: { ...p.otherActivity, [p.deviceId]: p.activity },
  };
}

/** Объединяем два прогресса так, чтобы ничего не потерять */
export function mergePayloads(a: SyncPayload, b: SyncPayload | null): SyncPayload {
  if (!b) return a;
  const lessons: SyncPayload['lessons'] = {};
  for (const key of new Set([...Object.keys(a.lessons), ...Object.keys(b.lessons ?? {})])) {
    const x = a.lessons[key] ?? {};
    const y = b.lessons?.[key] ?? {};
    lessons[key] = {
      taskPassed: x.taskPassed || y.taskPassed || undefined, // задание решено хоть где-то — значит решено
      quizBest: max(x.quizBest, y.quizBest), // лучший результат квиза
      quizTotal: x.quizTotal ?? y.quizTotal,
      completedAt: minDate(x.completedAt, y.completedAt), // самая ранняя дата прохождения
    };
  }
  const code: SyncPayload['code'] = { ...(b.code ?? {}) };
  for (const [key, mine] of Object.entries(a.code)) {
    const theirs = code[key];
    const newer = !theirs || mine.updatedAt >= theirs.updatedAt ? mine : theirs; // свежий код побеждает
    code[key] = { ...newer, passed: mine.passed || Boolean(theirs?.passed) };
  }
  const checklists: SyncPayload['checklists'] = { ...(b.checklists ?? {}) };
  for (const [key, mine] of Object.entries(a.checklists)) {
    const theirs = checklists[key];
    if (!theirs || (mine.updatedAt ?? '') >= (theirs.updatedAt ?? '')) checklists[key] = mine;
  }
  const activityByDevice: SyncPayload['activityByDevice'] = {};
  for (const src of [b.activityByDevice ?? {}, a.activityByDevice])
    for (const [device, days] of Object.entries(src)) {
      const target = (activityByDevice[device] ??= {});
      for (const [day, sec] of Object.entries(days)) target[day] = Math.max(target[day] ?? 0, sec);
    }
  return { version: 1, lessons, code, checklists, activityByDevice };
}

/** JSON с отсортированными ключами — чтобы сравнивать прогрессы надёжно */
function stable(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => x.localeCompare(y))) : v,
  );
}

// ---------- Синхронизация ----------
let inFlight = false;
let queued = false;

const ERRORS: Record<string, string> = {
  'not-configured': 'Хранилище на сервере не подключено. Подключите Upstash в Vercel (см. README).',
  'bad-key': 'Неверный ключ синхронизации.',
  'too-large': 'Прогресс слишком большой для синхронизации.',
};

async function api(method: 'GET' | 'PUT', key: string, body?: string) {
  const res = await fetch('/api/progress', {
    method,
    headers: { 'x-sync-key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(ERRORS[data.error] ?? `Сервер ответил ошибкой ${res.status}`);
  return data;
}

export async function syncNow() {
  const key = getSyncKey();
  if (!key) return setStatus({ state: 'off' });
  if (inFlight) {
    queued = true;
    return;
  }
  inFlight = true;
  setStatus({ state: 'syncing' });
  try {
    const { data: remote } = (await api('GET', key)) as { data: SyncPayload | null };
    const merged = mergePayloads(toPayload(getProgress()), remote);
    if (!remote || stable(merged) !== stable(remote)) await api('PUT', key, JSON.stringify(merged));
    actions.applySync(merged);
    setStatus({ state: 'ok', at: new Date().toISOString() });
  } catch (e) {
    setStatus({ state: 'error', message: navigator.onLine ? (e as Error).message : 'Нет интернета — синхронизируем, когда связь появится.' });
  } finally {
    inFlight = false;
    if (queued) {
      queued = false;
      void syncNow();
    }
  }
}

export function enableSync(key: string) {
  storeKey(key);
  return syncNow();
}

export function disableSync() {
  storeKey(null);
  setStatus({ state: 'off' });
}

/** Подключаем синхронизацию в приложении: при открытии, возвращении на вкладку и после изменений. */
export function useAutoSync() {
  useEffect(() => {
    // Ссылка вида /settings#sync=КЛЮЧ — подключить это устройство
    const match = location.hash.match(/sync=([a-f0-9]{32})/);
    if (match) {
      const current = getSyncKey();
      if (current !== match[1] && confirm('Подключить синхронизацию прогресса на этом устройстве? Прогресс объединится с прогрессом на других устройствах.')) {
        storeKey(match[1]);
      }
      history.replaceState(null, '', location.pathname + location.search);
    }
    void syncNow();

    let timer: number | undefined;
    const offChange = onLocalChange(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void syncNow(), 15_000);
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncNow();
      else if (timer) {
        window.clearTimeout(timer);
        timer = undefined;
        void syncNow(); // уходим со страницы — успеваем сохранить
      }
    };
    const onOnline = () => void syncNow();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      offChange();
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, []);
}
