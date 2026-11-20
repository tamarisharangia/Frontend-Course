import { useEffect } from 'react';
import { actions } from './progress';

/** Считаем время занятий: каждые 15 секунд, если вкладка видна и
 *  вы что-то делали за последние 2 минуты (двигали мышь, печатали, листали). */
export function useTimeTracker() {
  useEffect(() => {
    let last = Date.now();
    const mark = () => (last = Date.now());
    const events = ['pointermove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - last < 120_000) actions.addTime(15);
    }, 15_000);
    return () => {
      window.clearInterval(id);
      events.forEach((e) => window.removeEventListener(e, mark));
    };
  }, []);
}
