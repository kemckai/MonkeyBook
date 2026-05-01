import React from 'react';

export default function MonkeyAvatar({ monkeyId, size = 36, className = '' }) {
  if (!monkeyId) {
    return <span className={`avatar-placeholder ${className}`} style={{ width: size, height: size }}>🙈</span>;
  }

  return (
    <img
      src={`/api/identity/avatar/${monkeyId}.svg`}
      alt="Monkey avatar"
      className={`monkey-avatar ${className}`}
      width={size}
      height={size}
    />
  );
}
