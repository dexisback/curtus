"use client";

import { useMemo, useState } from "react";

export function getAvatarInitials(name?: string | null) {
  const raw = (name ?? "").trim();
  if (!raw) return "U";
  const parts = raw.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Props = {
  name?: string | null;
  src?: string | null;
  alt?: string;
  className?: string;
  imgClassName?: string;
  fallbackClassName?: string;
  fallbackStyle?: React.CSSProperties;
  initials?: string;
};

export default function AvatarWithFallback({
  name,
  src,
  alt,
  className = "",
  imgClassName = "",
  fallbackClassName = "",
  fallbackStyle,
  initials,
}: Props) {
  const [failed, setFailed] = useState(false);
  const hasSrc = Boolean(src && !failed);
  const fallbackInitials = useMemo(() => initials ?? getAvatarInitials(name), [initials, name]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {hasSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={alt ?? (name ? `${name} avatar` : "avatar")}
          className={`h-full w-full object-cover ${imgClassName}`}
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className={`flex h-full w-full select-none items-center justify-center ${fallbackClassName}`}
          style={fallbackStyle}
          aria-label={alt ?? (name ? `${name} avatar` : "avatar")}
        >
          {fallbackInitials}
        </div>
      )}
    </div>
  );
}

// — Shared avatar with initials fallback for missing/broken images.
