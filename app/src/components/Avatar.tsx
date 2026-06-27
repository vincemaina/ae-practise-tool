function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M6 21v-1a6 6 0 0 1 12 0v1" />
    </svg>
  );
}

/** Profile picture → initials (signed in, no pic) → guest icon. */
export function Avatar({
  name,
  imageUrl,
  size = 32,
}: {
  name?: string | null;
  imageUrl?: string | null;
  size?: number;
}) {
  if (imageUrl) {
    return (
      <img
        className="avatar avatar-img"
        src={imageUrl}
        alt={name ?? 'Profile'}
        style={{ width: size, height: size }}
      />
    );
  }
  if (name) {
    return (
      <span className="avatar avatar-initials" style={{ width: size, height: size }} aria-hidden="true">
        {initials(name)}
      </span>
    );
  }
  return (
    <span className="avatar avatar-guest" style={{ width: size, height: size }} aria-hidden="true">
      <UserIcon />
    </span>
  );
}
