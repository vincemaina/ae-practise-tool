import type { Question } from '../content/types';
import { PracticeView } from './PracticeView';

/** The solve screen wrapper. Back + prev/next/shuffle navigation now lives in
 *  the TopBar; this just hosts the per-question practice loop. */
export function SolveView({
  question,
  onAttempt,
  onNext,
  dark,
}: {
  question: Question;
  onAttempt: (id: string, correct: boolean) => void;
  onNext: () => void;
  dark: boolean;
}) {
  return (
    <main className="page solve-page">
      <PracticeView
        key={question.id}
        question={question}
        onAttempt={onAttempt}
        onNext={onNext}
        dark={dark}
      />
    </main>
  );
}
