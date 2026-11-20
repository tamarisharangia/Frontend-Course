// Движок автопроверки. Он заглядывает внутрь iframe с превью и проверяет
// настоящий DOM и ВЫЧИСЛЕННЫЕ стили — то, что браузер реально применил,
// а не то, что написано в коде. Так же работают инструменты в DevTools.
import type { Check, CodeFiles } from './types';

export interface CheckResult { check: Check; ok: boolean }

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

function compareValue(value: string, c: Check): boolean {
  const v = norm(value);
  if (c.equals !== undefined && v !== norm(c.equals)) return false;
  if (c.notEquals !== undefined && v === norm(c.notEquals)) return false;
  if (c.oneOf && !c.oneOf.map(norm).includes(v)) return false;
  if (c.contains !== undefined && !v.includes(norm(c.contains))) return false;
  if (c.pattern !== undefined && !new RegExp(c.pattern, 'i').test(value)) return false;
  if (c.min !== undefined || c.max !== undefined) {
    const n = parseFloat(v);
    if (Number.isNaN(n)) return false;
    if (c.min !== undefined && n < c.min) return false;
    if (c.max !== undefined && n > c.max) return false;
  }
  return true;
}

export function runChecks(doc: Document, files: CodeFiles, checks: Check[]): CheckResult[] {
  return checks.map((check) => {
    try {
      return { check, ok: runOne(doc, files, check) };
    } catch {
      return { check, ok: false };
    }
  });
}

function runOne(doc: Document, files: CodeFiles, c: Check): boolean {
  const win = doc.defaultView!;
  const els = c.selector ? Array.from(doc.querySelectorAll(c.selector)) : [];
  const targets = c.all ? els : els.slice(0, 1);
  const every = (fn: (el: Element) => boolean) => targets.length > 0 && targets.every(fn);

  switch (c.type) {
    case 'exists':
      return els.length > 0;
    case 'notExists':
      return els.length === 0;
    case 'count': {
      const n = els.length;
      if (c.equals !== undefined) return n === Number(c.equals);
      return (c.min === undefined || n >= c.min) && (c.max === undefined || n <= c.max);
    }
    case 'style':
      return every((el) => compareValue(win.getComputedStyle(el).getPropertyValue(c.prop!), c));
    case 'text':
      return every((el) => {
        const t = el.textContent ?? '';
        if (c.min !== undefined && t.trim().length < c.min) return false;
        return c.contains === undefined || norm(t).includes(norm(c.contains));
      });
    case 'attr':
      return every((el) => {
        const v = el.getAttribute(c.attr!);
        if (v === null) return false;
        const rest = { ...c, min: undefined, max: undefined };
        if (c.min !== undefined && v.trim().length < c.min) return false;
        return compareValue(v, rest);
      });
    case 'source': {
      const src = files[c.file ?? 'css'] ?? '';
      const found = new RegExp(c.pattern!, 'im').test(src);
      return c.not ? !found : found;
    }
  }
}

/** Собираем HTML-документ для iframe из файлов задания */
export function buildDoc(files: CodeFiles, extraCss = '') {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;background:#fff;line-height:1.5}${extraCss}</style>
<style>${files.css ?? ''}</style></head><body>${files.html ?? ''}
<script>try{${files.js ?? ''}}catch(e){console.error(e)}<\/script></body></html>`;
}
