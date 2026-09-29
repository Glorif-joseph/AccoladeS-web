"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

export default function LikeButton({
  action,
  likedInitial,
  countInitial,
  connected,
  produitId,
}: {
  action: () => Promise<void>;
  likedInitial: boolean;
  countInitial: number;
  connected: boolean;
  produitId: string;
}) {
  const [liked, setLiked] = useState(likedInitial);
  const [count, setCount] = useState(countInitial);
  const [isPending, startTransition] = useTransition();

  if (!connected) {
    return (
      <Link
        href={`/connexion?redirect=/produits/${produitId}`}
        className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-5 py-2 text-sm hover:border-accent transition-colors"
      >
        ♡ {countInitial} — se connecter pour aimer
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        setLiked((l) => !l);
        setCount((c) => (liked ? c - 1 : c + 1));
        startTransition(() => {
          action();
        });
      }}
      className={`inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm transition-colors disabled:opacity-60 ${
        liked
          ? "border-accent bg-accent/10 text-accent"
          : "border-ink/20 hover:border-accent"
      }`}
    >
      {liked ? "♥" : "♡"} {count}
    </button>
  );
}
