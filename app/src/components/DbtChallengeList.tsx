import type { DbtChallenge } from '../dbt';

/** The Model pillar's landing page: pick a dbt challenge to work on. */
export function DbtChallengeList({
  challenges,
  onOpen,
}: {
  challenges: DbtChallenge[];
  onOpen: (slug: string) => void;
}) {
  return (
    <main className="page problem-list-page">
      <div className="list-head">
        <h1 className="page-title">dbt challenges</h1>
        <span className="muted">{challenges.length}</span>
      </div>
      <p className="muted session-intro">
        Build models in a mini-dbt project — <code>ref()</code>/<code>source()</code>,
        materializations, and incremental models — then get graded on what the build produces.
      </p>

      <div className="tracks">
        {challenges.map((c) => (
          <button
            key={c.id}
            type="button"
            className="track-card"
            onClick={() => onOpen(c.slug)}
            data-testid={`dbt-${c.slug}`}
          >
            <strong>{c.title}</strong>
            <span className="muted track-desc">{c.prompt}</span>
            <span className="track-progress muted">
              {Object.keys(c.starter).length} file{Object.keys(c.starter).length === 1 ? '' : 's'}
              {c.increment ? ' · incremental' : ''}
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}
