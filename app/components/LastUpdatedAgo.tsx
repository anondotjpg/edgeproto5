"use client";

import { useEffect, useMemo, useState } from "react";

function formatTimeAgo(input: string) {
  const then = new Date(input).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - then);

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function LastUpdatedAgo({
  updatedAt,
}: {
  updatedAt: string;
}) {
  const [label, setLabel] = useState("0s ago");

  useEffect(() => {
    setLabel(formatTimeAgo(updatedAt));

    const interval = setInterval(() => {
      setLabel(formatTimeAgo(updatedAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [updatedAt]);

  const title = useMemo(() => {
    return new Date(updatedAt).toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [updatedAt]);

  return (
    <div
      className="w-[112px] shrink-0 text-left text-[13px] leading-tight text-zinc-500 tabular-nums invisible"
      title={title}
      suppressHydrationWarning
    >
      updated {label}
    </div>
  );
}