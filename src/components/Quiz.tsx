import { useState } from 'react';
import type { QuizQuestion } from '../lib/types';
import { actions, useProgress } from '../lib/progress';
import { MiniFrame } from './MiniFrame';
import { Markdown } from './Markdown';

export function Quiz({ questions, lessonKey }: { questions: QuizQuestion[]; lessonKey: string }) {
  const progress = useProgress();
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [round, setRound] = useState(0);
  const best = progress.lessons[lessonKey]?.quizBest;
  const done = answers.every((a) => a !== null);
  const score = answers.filter((a, i) => a === questions[i].correct).length;
  const need = Math.ceil(questions.length * 0.6);

  const answer = (qi: number, oi: number) => {
    const next = answers.map((a, i) => (i === qi ? oi : a));
    setAnswers(next);
    if (next.every((a) => a !== null)) {
      const s = next.filter((a, i) => a === questions[i].correct).length;
      if (best === undefined || s > best) actions.updateLesson(lessonKey, { quizBest: s, quizTotal: questions.length });
    }
  };

  return (
    <div key={round}>
      {questions.map((q, qi) => {
        const a = answers[qi];
        return (
          <div className="quiz-q" key={qi}>
            <div className="eyebrow">Вопрос {qi + 1} из {questions.length}</div>
            <Markdown text={q.q} className="prose" />
            {q.preview && (
              <div className="card" style={{ padding: 0, overflow: 'hidden', maxWidth: 360 }}>
                <MiniFrame html={q.preview.html} css={q.preview.css} height={q.preview.height ?? 240} title="Макет к вопросу" />
              </div>
            )}
            <div className="quiz-options" role="group">
              {q.options.map((o, oi) => {
                let cls = 'quiz-option';
                if (a !== null && oi === q.correct) cls += ' correct';
                else if (a === oi) cls += ' wrong';
                return (
                  <button key={oi} className={cls} disabled={a !== null} onClick={() => answer(qi, oi)}>
                    {o}
                  </button>
                );
              })}
            </div>
            {a !== null && (
              <div className="quiz-explain">
                <strong>{a === q.correct ? 'Верно. ' : 'Не совсем. '}</strong>
                {q.explain}
              </div>
            )}
          </div>
        );
      })}
      <div className="card row">
        {done ? (
          <span>
            Результат: <strong>{score} из {questions.length}</strong>.{' '}
            {score >= need ? 'Квиз пройден ✓' : `Нужно хотя бы ${need} — попробуйте ещё раз.`}
          </span>
        ) : (
          <span className="muted">Для зачёта нужно {need} правильных из {questions.length}.{best !== undefined && ` Ваш лучший результат: ${best}.`}</span>
        )}
        <span className="spacer" />
        {done && (
          <button className="btn" onClick={() => { setAnswers(questions.map(() => null)); setRound(round + 1); }}>
            Пройти заново
          </button>
        )}
      </div>
    </div>
  );
}
