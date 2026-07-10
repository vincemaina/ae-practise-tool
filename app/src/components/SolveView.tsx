import type { Question } from '../content/types';
import type { DialectFilter } from '../content/dialects';
import { PracticeView } from './PracticeView';

/** The solve screen wrapper. Back + prev/next/shuffle navigation now lives in
 *  the TopBar; this just hosts the per-question practice loop. */
export function SolveView({
  question,
  onAttempt,
  onNext,
  nextLabel,
  dark,
  dialect,
}: {
  question: Question;
  onAttempt: (id: string, correct: boolean) => void;
  onNext: () => void;
  /** Label for the post-solve advance link (default "Next recommended →"). */
  nextLabel?: string;
  dark: boolean;
  dialect: DialectFilter;
}) {
  return (
    <main className="page solve-page">
      <PracticeView
        key={question.id}
        question={question}
        onAttempt={onAttempt}
        onNext={onNext}
        nextLabel={nextLabel}
        dark={dark}
        dialect={dialect}
      />
    </main>
  );
}
