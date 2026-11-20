import { useEffect, useRef, useState } from 'react';
import type { PlaygroundWidget } from '../lib/types';
import { buildDoc } from '../lib/checks';

/** Двигаете ползунок — меняется CSS-переменная внутри превью, и сразу виден код. */
export function Playground({ w }: { w: PlaygroundWidget }) {
  const [values, setValues] = useState<Record<string, number | string | boolean>>(() =>
    Object.fromEntries(w.controls.map((c) => [c.type === 'toggle' ? c.className : c.var, c.value])),
  );
  const frame = useRef<HTMLIFrameElement>(null);
  const [srcDoc] = useState(() => buildDoc({ html: w.html, css: w.css }));

  const apply = () => {
    const doc = frame.current?.contentDocument;
    if (!doc?.body) return;
    for (const c of w.controls) {
      if (c.type === 'toggle') doc.body.classList.toggle(c.className, Boolean(values[c.className]));
      else doc.documentElement.style.setProperty(c.var, `${values[c.var]}${c.type === 'range' ? c.unit ?? '' : ''}`);
    }
  };
  useEffect(apply);

  const code = (w.code ?? w.css).replace(/var\((--[\w-]+)\)/g, (m, name) => {
    const c = w.controls.find((x) => x.type !== 'toggle' && x.var === name);
    if (!c || c.type === 'toggle') return m;
    return `${values[name]}${c.type === 'range' ? c.unit ?? '' : ''}`;
  });

  return (
    <div className="stack">
      <div>
        <h3>{w.title}</h3>
        {w.description && <p className="muted">{w.description}</p>}
      </div>
      <div className="playground">
        <div className="playground-controls">
          {w.controls.map((c) => {
            const key = c.type === 'toggle' ? c.className : c.var;
            return (
              <div className="control" key={key}>
                {c.type === 'range' && (
                  <>
                    <label>
                      <span>{c.label}</span>
                      <output>{String(values[key])}{c.unit}</output>
                    </label>
                    <input type="range" min={c.min} max={c.max} step={c.step ?? 1} value={Number(values[key])} aria-label={c.label}
                      onChange={(e) => setValues({ ...values, [key]: Number(e.target.value) })} />
                  </>
                )}
                {c.type === 'select' && (
                  <>
                    <label><span>{c.label}</span></label>
                    <select value={String(values[key])} onChange={(e) => setValues({ ...values, [key]: e.target.value })} aria-label={c.label}>
                      {c.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </>
                )}
                {c.type === 'toggle' && (
                  <label style={{ justifyContent: 'flex-start', cursor: 'pointer' }}>
                    <input type="checkbox" checked={Boolean(values[key])} onChange={(e) => setValues({ ...values, [key]: e.target.checked })} />
                    <span>{c.label}</span>
                  </label>
                )}
              </div>
            );
          })}
        </div>
        <div className="playground-stage">
          <iframe ref={frame} title={w.title} srcDoc={srcDoc} onLoad={apply} style={{ height: w.height ?? 300 }} />
          <pre className="playground-code"><code>{code.trim()}</code></pre>
        </div>
      </div>
    </div>
  );
}
