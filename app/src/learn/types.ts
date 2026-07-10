/** A single flashcard: a prompt (front) and its answer (back), plus optional code. */
export interface Flashcard {
  id: string;
  /** Shown first — the prompt/question. */
  front: string;
  /** Revealed on flip — the answer. */
  back: string;
  /** Optional code snippet shown under the answer (rendered monospaced). */
  code?: string;
}

/** A named collection of cards (v1 ships one: dbt fundamentals). */
export interface Deck {
  id: string;
  title: string;
  description: string;
  cards: Flashcard[];
}
