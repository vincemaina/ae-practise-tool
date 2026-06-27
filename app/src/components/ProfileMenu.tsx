import { useEffect, useRef, useState } from 'react';
import type { Theme } from '../theme/useTheme';
import { Avatar } from './Avatar';

export interface Profile {
  name: string;
  imageUrl?: string;
}

/** Top-right account menu. Houses the theme toggle. "Sign in" is a local,
 *  client-only display name (no auth backend — that's still a non-goal); it
 *  exists so the avatar shows real initials when signed in without a picture. */
export function ProfileMenu({
  theme,
  onToggleTheme,
  user,
  onSignIn,
  onSignOut,
}: {
  theme: Theme;
  onToggleTheme: () => void;
  user: Profile | null;
  onSignIn: (name: string) => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function handleSignIn() {
    const name = window.prompt('Display name')?.trim();
    if (name) onSignIn(name);
    setOpen(false);
  }

  return (
    <div className="profile" ref={ref}>
      <button
        className="profile-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account"
        data-testid="profile"
      >
        <Avatar name={user?.name} imageUrl={user?.imageUrl} size={36} />
      </button>

      {open && (
        <div className="profile-menu" role="menu">
          <div className="profile-menu-head">
            <Avatar name={user?.name} imageUrl={user?.imageUrl} size={36} />
            <div className="profile-id">
              <strong>{user ? user.name : 'Guest'}</strong>
              <span className="muted">{user ? 'Signed in (local)' : 'Not signed in'}</span>
            </div>
          </div>

          <div className="menu-sep" />

          <button
            className="menu-item"
            role="menuitemcheckbox"
            aria-checked={theme === 'dark'}
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <span>Dark mode</span>
            <span className={`toggle ${theme === 'dark' ? 'on' : ''}`} aria-hidden="true">
              <span className="knob" />
            </span>
          </button>

          <div className="menu-sep" />

          {user ? (
            <button
              className="menu-item"
              role="menuitem"
              onClick={() => {
                onSignOut();
                setOpen(false);
              }}
            >
              Sign out
            </button>
          ) : (
            <button className="menu-item" role="menuitem" onClick={handleSignIn}>
              Sign in
            </button>
          )}
        </div>
      )}
    </div>
  );
}
