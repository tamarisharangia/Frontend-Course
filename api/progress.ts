// Серверная функция Vercel: хранит прогресс курса, чтобы синхронизировать устройства.
// Файлы в папке /api Vercel превращает в маленькие серверные функции (serverless functions).
//
// GET  /api/progress  → прогресс по ключу синхронизации
// PUT  /api/progress  → сохранить прогресс
// Ключ передаётся в заголовке x-sync-key (а не в адресе — так он не попадает в логи).
// В базе хранится не сам ключ, а его SHA-256 хеш.

import { createHash } from 'node:crypto';

const KEY_RE = /^[a-f0-9]{32}$/;
const MAX_BYTES = 900_000;
const ONE_YEAR = 60 * 60 * 24 * 365;

interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

/** Upstash Redis через REST API. Переменные окружения Vercel добавляет сам при подключении Upstash. */
function upstash(): Store | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const run = async (command: (string | number)[]) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}`);
    return ((await res.json()) as { result: unknown }).result;
  };
  return {
    get: async (key) => (await run(['GET', key])) as string | null,
    set: async (key, value) => {
      await run(['SET', key, value, 'EX', ONE_YEAR]);
    },
  };
}

/** Хранилище в памяти — только для локальной разработки (npm run dev). */
function memory(): Store | null {
  if (process.env.SYNC_DEV_MEMORY !== '1') return null;
  const g = globalThis as unknown as { __feSyncMem?: Map<string, string> };
  const map = (g.__feSyncMem ??= new Map());
  return { get: async (k) => map.get(k) ?? null, set: async (k, v) => void map.set(k, v) };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

function storageKey(request: Request) {
  const key = request.headers.get('x-sync-key') ?? '';
  if (!KEY_RE.test(key)) return null;
  return `fe-progress:${createHash('sha256').update(key).digest('hex')}`;
}

export async function GET(request: Request) {
  const key = storageKey(request);
  if (!key) return json({ error: 'bad-key' }, 400);
  const store = upstash() ?? memory();
  if (!store) return json({ error: 'not-configured' }, 503);
  try {
    const value = await store.get(key);
    return json({ data: value ? JSON.parse(value) : null });
  } catch {
    return json({ error: 'storage-failed' }, 502);
  }
}

export async function PUT(request: Request) {
  const key = storageKey(request);
  if (!key) return json({ error: 'bad-key' }, 400);
  const store = upstash() ?? memory();
  if (!store) return json({ error: 'not-configured' }, 503);
  const text = await request.text();
  if (text.length > MAX_BYTES) return json({ error: 'too-large' }, 413);
  try {
    const data = JSON.parse(text);
    if (data?.version !== 1 || typeof data.lessons !== 'object') return json({ error: 'bad-data' }, 400);
  } catch {
    return json({ error: 'bad-json' }, 400);
  }
  try {
    await store.set(key, text);
    return json({ ok: true });
  } catch {
    return json({ error: 'storage-failed' }, 502);
  }
}
