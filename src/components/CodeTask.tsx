import { useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html as langHtml } from '@codemirror/lang-html';
import { css as langCss } from '@codemirror/lang-css';
import { javascript as langJs } from '@codemirror/lang-javascript';
import type { CodeFiles, Task } from '../lib/types';
import { buildDoc, runChecks, type CheckResult } from '../lib/checks';
import { actions, useProgress } from '../lib/progress';
import { useResolvedTheme } from '../lib/theme';
import { Markdown } from './Markdown';

type FileName = keyof CodeFiles;
const LANGS = { html: langHtml(), css: langCss(), js: langJs() };
const LABEL: Record<FileName, string> = { html: 'index.html', css: 'style.css', js: 'script.js' };

export function CodeTask({ task, lessonKey, lessonTitle }: { task: Task; lessonKey: string; lessonTitle: string }) {
  const progress = useProgress();
  const theme = useResolvedTheme();
  const taskKey = `${lessonKey}#${task.id}`;
  const saved = progress.code[taskKey];
  const fileNames = (Object.keys(task.files) as FileName[]).filter((f) => task.files[f] !== undefined);

  const [files, setFiles] = useState<CodeFiles>(() => {
    if (!saved) return { ...task.files };
    const f: CodeFiles = {};
    fileNames.forEach((n) => (f[n] = saved[n] ?? task.files[n]));
    return f;
  });
  const [active, setActive] = useState<FileName>(fileNames[0]);
  const [doc, setDoc] = useState(() => buildDoc(files));
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const passed = Boolean(progress.lessons[lessonKey]?.taskPassed);

  // Живое превью: обновляем через 400 мс после того, как вы перестали печатать
  useEffect(() => {
    const id = setTimeout(() => {
      setDoc(buildDoc(files));
      actions.saveCode(taskKey, files, { title: task.title, lesson: lessonTitle });
    }, 400);
    return () => clearTimeout(id);
  }, [files]); // eslint-disable-line react-hooks/exhaustive-deps

  const check = () => {
    const iframe = frame.current!;
    const latest = buildDoc(files);
    const run = () => {
      const r = runChecks(iframe.contentDocument!, files, task.checks);
      setResults(r);
      const ok = r.every((x) => x.ok);
      actions.saveCode(taskKey, files, { title: task.title, lesson: lessonTitle, passed: ok || passed });
      if (ok) actions.updateLesson(lessonKey, { taskPassed: true });
    };
    if (latest !== doc) {
      iframe.addEventListener('load', () => setTimeout(run, 50), { once: true });
      setDoc(latest);
    } else run();
  };

  const reset = () => {
    if (!confirm('Вернуть стартовый код? Ваш текущий код в этом задании будет заменён.')) return;
    setFiles({ ...task.files });
    setResults(null);
  };

  const failed = results?.filter((r) => !r.ok) ?? [];
  const extensions = useMemo(() => [LANGS[active]], [active]);

  return (
    <div className="stack">
      <Markdown text={task.brief} />
      <div className="editor">
        <div className="editor-tabs">
          {fileNames.map((f) => (
            <button key={f} aria-pressed={active === f} onClick={() => setActive(f)}>{LABEL[f]}</button>
          ))}
          <span className="spacer" />
          {passed && <span className="badge badge-done">✓ Задание выполнено</span>}
        </div>
        <div className="editor-grid">
          <div className="editor-code">
            <CodeMirror
              value={files[active] ?? ''}
              theme={theme}
              extensions={extensions}
              basicSetup={{ foldGutter: false, highlightActiveLine: true }}
              onChange={(v) => setFiles((prev) => ({ ...prev, [active]: v }))}
            />
          </div>
          <div className="editor-preview">
            <div className="preview-label">Превью — обновляется само</div>
            <iframe ref={frame} title="Превью задания" srcDoc={doc} />
          </div>
        </div>
      </div>
      <div className="row">
        <button className="btn btn-primary" onClick={check}>Проверить</button>
        <button className="btn btn-ghost" onClick={reset}>Сбросить код</button>
        <span className="subtle">Код сохраняется автоматически и попадает в «Мой код».</span>
      </div>
      {results && (
        <div className="card">
          <h4>{failed.length === 0 ? '🎉 Все проверки пройдены!' : `Пройдено ${results.length - failed.length} из ${results.length}`}</h4>
          <ul className="check-list">
            {results.map((r, i) => (
              <li key={i} className={`check-item ${r.ok ? 'ok' : 'fail'}`}>
                <span className="check-icon">{r.ok ? '✓' : '○'}</span>
                <div>
                  <div>{r.check.label}</div>
                  {!r.ok && <div className="hint">Подсказка: {r.check.hint}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
