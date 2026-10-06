"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "messages";
const DUREE_MAX = 180; // 3 minutes : l'enregistrement s'arrête et s'envoie tout seul
const DUREE_MIN_MS = 800; // en dessous, on considère un appui accidentel

function formater(secondes: number) {
  const m = Math.floor(secondes / 60);
  const s = Math.floor(secondes % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Chrome et Firefox enregistrent en webm/ogg, Safari (iPhone) en mp4 : on
// prend le premier format que le navigateur sait produire.
function choisirMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidats = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidats.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

function extensionPour(type: string) {
  if (type.includes("mp4")) return "m4a";
  if (type.includes("ogg")) return "ogg";
  return "webm";
}

// Bouton micro. Au clic : enregistrement (point rouge + minuteur), avec
// « ✕ » pour annuler et « ➤ » pour envoyer. Le fichier est envoyé dans le
// stockage, puis `onEnvoye` reçoit son adresse et sa durée pour que le parent
// enregistre le message.
export default function EnregistreurVocal({
  utilisateurId,
  prefixe,
  onEnvoye,
  onEtat,
  classeEnvoi = "bg-anthracite text-paper",
}: {
  utilisateurId: string;
  prefixe: string;
  onEnvoye: (audioUrl: string, duree: number) => Promise<void>;
  onEtat?: (enregistrement: boolean) => void;
  classeEnvoi?: string;
}) {
  const [enregistre, setEnregistre] = useState(false);
  const [secondes, setSecondes] = useState(0);
  const [envoi, setEnvoi] = useState(false);

  const recorder = useRef<MediaRecorder | null>(null);
  const flux = useRef<MediaStream | null>(null);
  const morceaux = useRef<Blob[]>([]);
  const minuteur = useRef<ReturnType<typeof setInterval> | null>(null);
  const debut = useRef(0);
  const aEnvoyer = useRef(true);

  // Si on quitte la page en pleine prise : on coupe le micro, rien n'est envoyé.
  useEffect(() => {
    return () => {
      aEnvoyer.current = false;
      if (minuteur.current) clearInterval(minuteur.current);
      if (recorder.current && recorder.current.state !== "inactive") {
        recorder.current.stop();
      }
      flux.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function televerser(blob: Blob, duree: number, type: string) {
    setEnvoi(true);
    try {
      const supabase = createClient();
      const chemin = `${utilisateurId}/${prefixe}-vocal-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extensionPour(type)}`;

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(chemin, blob, { contentType: type.split(";")[0] });

      if (error) {
        alert(`Erreur d'envoi du vocal : ${error.message}`);
        return;
      }

      const url = supabase.storage.from(BUCKET).getPublicUrl(chemin).data.publicUrl;
      await onEnvoye(url, duree);
    } finally {
      setEnvoi(false);
    }
  }

  function terminer(envoyer: boolean) {
    aEnvoyer.current = envoyer;
    if (recorder.current && recorder.current.state !== "inactive") {
      recorder.current.stop();
    }
  }

  async function demarrer() {
    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      alert("Ton navigateur ne permet pas d'enregistrer un message vocal.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      alert("Autorise l'accès au micro pour enregistrer un message vocal.");
      return;
    }

    const mime = choisirMime();
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);

    morceaux.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) morceaux.current.push(e.data);
    };

    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (minuteur.current) clearInterval(minuteur.current);

      const dureeMs = Date.now() - debut.current;
      const type = rec.mimeType || mime || "audio/webm";

      setEnregistre(false);
      onEtat?.(false);

      if (!aEnvoyer.current || dureeMs < DUREE_MIN_MS) return;

      const blob = new Blob(morceaux.current, { type });
      if (blob.size === 0) return;

      await televerser(blob, Math.max(1, Math.round(dureeMs / 1000)), type);
    };

    recorder.current = rec;
    flux.current = stream;
    aEnvoyer.current = true;
    debut.current = Date.now();
    rec.start();

    setSecondes(0);
    setEnregistre(true);
    onEtat?.(true);

    minuteur.current = setInterval(() => {
      const ecoule = Math.floor((Date.now() - debut.current) / 1000);
      setSecondes(ecoule);
      if (ecoule >= DUREE_MAX) terminer(true);
    }, 250);
  }

  if (enregistre) {
    return (
      <div className="flex-1 flex items-center gap-3 px-2 min-w-0">
        <span
          aria-hidden="true"
          className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse shrink-0"
        />
        <span className="text-sm tabular-nums">{formater(secondes)}</span>
        <span className="flex-1 text-xs text-ink/50 truncate">Enregistrement...</span>
        <button
          type="button"
          onClick={() => terminer(false)}
          aria-label="Annuler l'enregistrement"
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface transition-colors"
        >
          ✕
        </button>
        <button
          type="button"
          onClick={() => terminer(true)}
          aria-label="Envoyer le message vocal"
          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${classeEnvoi}`}
        >
          ➤
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={demarrer}
      disabled={envoi}
      aria-label="Enregistrer un message vocal"
      className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-surface transition-colors disabled:opacity-60"
    >
      {envoi ? "…" : "🎤"}
    </button>
  );
}
