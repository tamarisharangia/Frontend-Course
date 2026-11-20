import { useState } from 'react';
import type { ComparatorWidget } from '../lib/types';
import { MiniFrame } from '../components/MiniFrame';

type View = 'ios' | 'android' | 'both';

/** Сравнитель: один экран в двух платформенных версиях с подсветкой отличий.
 *  В макетах элементы помечены атрибутом data-diff="id" — его и подсвечиваем. */
export function Comparator({ w }: { w: ComparatorWidget }) {
  const [view, setView] = useState<View>('both');
  const [active, setActive] = useState<string | null>(w.diffs[0]?.id ?? null);
  const hl = active ? `[data-diff~="${active}"]{outline:3px solid #f59f00!important;outline-offset:-3px;box-shadow:0 0 0 6px rgba(245,159,0,.25)!important}` : '';
  const diff = w.diffs.find((d) => d.id === active);

  const phone = (p: 'ios' | 'android') => (
    <div className="compare-phone">
      <div className="eyebrow" style={{ textAlign: 'center' }}>{p === 'ios' ? 'iOS 27' : 'Android · M3 Expressive'}</div>
      <div className="phone">
        <MiniFrame html={w[p].html} css={w[p].css} height="100%" extraCss={hl} title={`Макет ${p}`} />
      </div>
    </div>
  );

  return (
    <div className="stack">
      <div>
        <h3>{w.title}</h3>
        {w.description && <p className="muted">{w.description}</p>}
      </div>
      <div className="segmented" role="group" aria-label="Платформа">
        <button aria-pressed={view === 'ios'} onClick={() => setView('ios')}>iOS</button>
        <button aria-pressed={view === 'both'} onClick={() => setView('both')}>Рядом</button>
        <button aria-pressed={view === 'android'} onClick={() => setView('android')}>Android</button>
      </div>
      <div className="compare-phones">
        {view !== 'android' && phone('ios')}
        {view !== 'ios' && phone('android')}
      </div>
      <div>
        <div className="eyebrow">Отличия — нажмите, чтобы подсветить на макетах</div>
        <div className="row">
          {w.diffs.map((d) => (
            <button key={d.id} className="btn btn-sm diff-chip" aria-pressed={active === d.id} onClick={() => setActive(active === d.id ? null : d.id)}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
      {diff && (
        <div className="grid grid-2">
          <div className="card small"><div className="eyebrow">iOS</div>{diff.ios}</div>
          <div className="card small"><div className="eyebrow">Android · Material 3</div>{diff.android}</div>
        </div>
      )}
    </div>
  );
}
