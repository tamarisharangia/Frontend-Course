import { useEffect, useState } from 'react';

/** Читаем токены прямо из подключённых стилей — эта страница всегда актуальна. */
function readTokens() {
  const names = new Set<string>();
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try { rules = sheet.cssRules; } catch { continue; }
    const walk = (list: CSSRuleList) => {
      for (const r of Array.from(list)) {
        if (r instanceof CSSStyleRule && r.selectorText.startsWith(':root')) {
          for (const prop of Array.from(r.style)) if (prop.startsWith('--')) names.add(prop);
        } else if ('cssRules' in r) walk((r as CSSGroupingRule).cssRules);
      }
    };
    walk(rules);
  }
  const cs = getComputedStyle(document.documentElement);
  return Array.from(names).map((n) => ({ name: n, value: cs.getPropertyValue(n).trim() }));
}

const GROUPS = [
  { title: '1. Примитивы — цвет', test: (n: string) => n.startsWith('--p-') && !n.startsWith('--p-size'), kind: 'color' },
  { title: '1. Примитивы — размеры', test: (n: string) => n.startsWith('--p-size'), kind: 'size' },
  { title: '2. Семантика — цвет', test: (n: string) => n.startsWith('--color-'), kind: 'color' },
  { title: '2. Семантика — отступы', test: (n: string) => n.startsWith('--space-'), kind: 'size' },
  { title: '2. Семантика — типографика', test: (n: string) => n.startsWith('--font-') || n.startsWith('--line-'), kind: 'text' },
  { title: '2. Семантика — форма и движение', test: (n: string) => /^--(radius|shadow|duration|ease)/.test(n), kind: 'other' },
  { title: '3. Раскладка и компоненты', test: (n: string) => /^--(layout|tap|button|card)/.test(n), kind: 'other' },
];

export function Tokens() {
  const [tokens, setTokens] = useState(readTokens);
  useEffect(() => {
    const fn = () => setTimeout(() => setTokens(readTokens()), 30);
    window.addEventListener('fe-theme-change', fn);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', fn);
    return () => { window.removeEventListener('fe-theme-change', fn); mq.removeEventListener('change', fn); };
  }, []);

  return (
    <div className="container-wide">
      <div className="page-head">
        <h1>Токены этого сайта</h1>
        <p>Все цвета, отступы и шрифты сайта — это CSS-переменные из файла <code>src/styles/tokens.css</code>. Переключите тему и посмотрите: семантические цвета меняются, примитивы — нет.</p>
      </div>
      <div className="card" style={{ marginBottom: 'var(--space-s)' }}>
        <pre style={{ margin: 0 }}><code>{`/* примитив → семантика → компонент */
--p-blue-600: #3b5bdb;                 /* сырой цвет */
--color-accent: var(--p-blue-600);     /* роль «акцент» */
--button-bg: var(--color-accent);      /* настройка кнопки */`}</code></pre>
      </div>
      <div className="grid grid-2">
        {GROUPS.map((g) => (
          <section key={g.title} className="card">
            <h4>{g.title}</h4>
            {tokens.filter((t) => g.test(t.name)).map((t) => (
              <div key={t.name} className="token-row">
                {g.kind === 'color' ? <div className="swatch" style={{ background: `var(${t.name})` }} />
                  : g.kind === 'size' ? <div style={{ height: 10, width: `min(56px, var(${t.name}))`, background: 'var(--color-accent)', borderRadius: 2 }} />
                  : g.kind === 'text' ? <div style={{ fontFamily: t.name.includes('family') || t.name.includes('sans') || t.name.includes('mono') ? `var(${t.name})` : undefined }}>Аа</div>
                  : <div />}
                <div><code>{t.name}</code><div className="subtle">{t.value}</div></div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
