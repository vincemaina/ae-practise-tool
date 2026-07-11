import type { Theme } from '../theme/useTheme';
import { ProfileMenu, type Profile } from './ProfileMenu';

interface SolveNav {
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onShuffle: () => void;
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === 'left' ? 'M15 18l-6-6 6-6' : 'M9 6l6 6-6 6'} />
    </svg>
  );
}

function ShuffleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  );
}

function ProgressRing({ solved, total }: { solved: number; total: number }) {
  const pct = total ? solved / total : 0;
  const r = 9;
  const circ = 2 * Math.PI * r;
  const label = `Solved ${solved} of ${total} problems`;
  return (
    <div className="progress-ring" data-testid="progress" title={label} aria-label={label} role="img">
      <svg width="26" height="26" viewBox="0 0 24 24">
        <circle className="ring-track" cx="12" cy="12" r={r} fill="none" strokeWidth="3" />
        <circle
          className="ring-fill"
          cx="12"
          cy="12"
          r={r}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          transform="rotate(-90 12 12)"
        />
      </svg>
    </div>
  );
}

export function TopBar({
  solved,
  total,
  streak,
  theme,
  onToggleTheme,
  onHome,
  nav,
  session,
  tab,
  onTab,
  user,
  onSignIn,
  onSignOut,
}: {
  solved: number;
  total: number;
  streak: number;
  theme: Theme;
  onToggleTheme: () => void;
  onHome: () => void;
  /** Present only on the solve screen — adds back + prev/next/shuffle. */
  nav?: SolveNav | null;
  /** Present while walking a practice session — shows progress, hides shuffle. */
  session?: { index: number; total: number } | null;
  /** Practice|Learn|Model mode tabs (shown on top-level pages, i.e. not solving). */
  tab: 'practice' | 'learn' | 'model';
  onTab: (t: 'practice' | 'learn' | 'model') => void;
  user: Profile | null;
  onSignIn: (name: string) => void;
  onSignOut: () => void;
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="logo-btn" onClick={onHome} aria-label="All problems" title="All problems">
          <span className="brand-mark">⌁</span>
        </button>
        {nav ? (
          <button className="link-btn" onClick={nav.onBack} data-testid="back">
            ← All problems
          </button>
        ) : (
          <div className="mode-tabs" role="tablist" aria-label="Practice or Learn">
            <button
              role="tab"
              aria-selected={tab === 'practice'}
              className={`mode-tab ${tab === 'practice' ? 'active' : ''}`}
              onClick={() => onTab('practice')}
              data-testid="tab-practice"
            >
              Practice
            </button>
            <button
              role="tab"
              aria-selected={tab === 'learn'}
              className={`mode-tab ${tab === 'learn' ? 'active' : ''}`}
              onClick={() => onTab('learn')}
              data-testid="tab-learn"
            >
              Learn
            </button>
            <button
              role="tab"
              aria-selected={tab === 'model'}
              className={`mode-tab ${tab === 'model' ? 'active' : ''}`}
              onClick={() => onTab('model')}
              data-testid="tab-model"
            >
              Model
            </button>
          </div>
        )}
      </div>

      <div className="topbar-right">
        {nav && (
          <div className="solve-nav">
            <button className="icon-btn" onClick={nav.onPrev} aria-label="Previous problem" title="Previous">
              <Chevron dir="left" />
            </button>
            {session ? (
              <span className="session-chip" data-testid="session-progress" title="Practice session progress">
                Session · {session.index}/{session.total}
              </span>
            ) : (
              <button className="icon-btn" onClick={nav.onShuffle} data-testid="shuffle" aria-label="Random problem" title="Random">
                <ShuffleIcon />
              </button>
            )}
            <button className="icon-btn" onClick={nav.onNext} aria-label="Next problem" title="Next">
              <Chevron dir="right" />
            </button>
          </div>
        )}
        {streak > 0 && (
          <span className="streak-chip" data-testid="streak" title={`${streak}-day streak`}>
            🔥 {streak}
          </span>
        )}
        <ProgressRing solved={solved} total={total} />
        <ProfileMenu
          theme={theme}
          onToggleTheme={onToggleTheme}
          user={user}
          onSignIn={onSignIn}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  );
}
