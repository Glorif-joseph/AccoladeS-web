"use client";

import { useRef, useState } from "react";

function formater(secondes: number) {
  const m = Math.floor(secondes / 60);
  const s = Math.floor(secondes % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Lecteur de message vocal : ▶ / ❚❚, barre de progression et durée.
// La durée vient de la base (les fichiers enregistrés dans le navigateur
// n'indiquent souvent pas leur durée). Les couleurs suivent celles de la bulle.
export default function VocalPlayer({
  url,
  duree,
}: {
  url: string;
  duree?: number | null;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [lecture, setLecture] = useState(false);
  const [position, setPosition] = useState(0);

  const total = duree && duree > 0 ? duree : 0;

  function basculer() {
    const a = audio.current;
    if (!a) return;

    if (a.paused) {
      // Un seul vocal à la fois.
      document.querySelectorAll("audio").forEach((autre) => {
        if (autre !== a) autre.pause();
      });
      a.play().catch(() => alert("Impossible de lire ce message vocal sur cet appareil."));
    } else {
      a.pause();
    }
  }

  const progression = total ? Math.min(100, (position / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2.5 w-52 max-w-full">
      <audio
        ref={audio}
        src={url}
        preload="metadata"
        onPlay={() => setLecture(true)}
        onPause={() => setLecture(false)}
        onEnded={() => {
          setLecture(false);
          setPosition(0);
        }}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
      />

      <button
        type="button"
        onClick={basculer}
        aria-label={lecture ? "Mettre en pause" : "Écouter le message vocal"}
        className="shrink-0 w-9 h-9 rounded-full border-[1.5px] border-current flex items-center justify-center text-xs"
      >
        {lecture ? "❚❚" : "▶"}
      </button>

      <div className="flex-1 min-w-0">
        <div className="relative h-1.5 rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-current opacity-20" />
          <div className="relative h-full bg-current" style={{ width: `${progression}%` }} />
        </div>
        <p className="text-[11px] mt-1 opacity-70 tabular-nums">
          {lecture || position > 0 ? formater(position) : formater(total)}
        </p>
      </div>
    </div>
  );
}
