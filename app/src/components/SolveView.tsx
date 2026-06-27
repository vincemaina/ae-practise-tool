import type { Question } from '../content/types';
import { PracticeView } from './PracticeView';

/** The solve screen wrapper. Back + prev/next/shuffle navigation now lives in
 *  the TopBar; this just hosts the per-question practice loop. */
export function SolveView({
  question,
  onSolved,
  dark,
}: {
  question: Question;
  onSolved: (id: string) => void;
  dark: boolean;
}) {
  return (
    <main className="page solve-page">
      <PracticeView key={question.id} question={question} onSolved={onSolved} dark={dark} />
    </main>
  );
}
