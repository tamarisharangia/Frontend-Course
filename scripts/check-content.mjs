// Проверка контента: запустите `npm run check-content` после правок в /content.
// Скрипт находит типичные ошибки: нет обязательных полей, неверный номер правильного ответа и т.п.
import { readdirSync, readFileSync } from 'node:fs';

const dir = new URL('../content/modules/', import.meta.url);
let errors = 0;
const err = (where, msg) => { errors++; console.error(`✗ ${where}: ${msg}`); };
const SKILLS = ['html', 'layout', 'responsive', 'tokens', 'js', 'react', 'motion', 'ds', 'tools', 'platforms'];
const orders = new Set();

for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  let m;
  try { m = JSON.parse(readFileSync(new URL(file, dir), 'utf8')); } catch (e) { err(file, `невалидный JSON — ${e.message}`); continue; }
  for (const k of ['id', 'order', 'num', 'title', 'summary', 'status', 'skills', 'lessons']) if (m[k] === undefined) err(file, `нет поля «${k}»`);
  if (orders.has(m.order)) err(file, `order ${m.order} уже занят другим модулем`);
  orders.add(m.order);
  for (const l of m.lessons ?? []) {
    const w = `${file} → ${l.id}`;
    for (const k of ['id', 'title', 'summary', 'skills']) if (l[k] === undefined) err(w, `нет поля «${k}»`);
    for (const s of Object.keys(l.skills ?? {})) if (!SKILLS.includes(s)) err(w, `неизвестный навык «${s}»`);
    if (l.stub) continue;
    if (!l.theory?.length) err(w, 'нет теории');
    (l.quiz ?? []).forEach((q, i) => {
      if (!(q.correct >= 0 && q.correct < q.options.length)) err(w, `вопрос ${i + 1}: correct вне диапазона`);
      if (!q.explain) err(w, `вопрос ${i + 1}: нет пояснения`);
    });
    for (const c of l.task?.checks ?? []) {
      if (!c.label || !c.hint) err(w, `проверка без label/hint`);
      if (c.pattern) try { new RegExp(c.pattern); } catch { err(w, `плохая регулярка: ${c.pattern}`); }
    }
  }
}
console.log(errors ? `\nНайдено ошибок: ${errors}` : '✓ Контент в порядке');
process.exit(errors ? 1 : 0);
