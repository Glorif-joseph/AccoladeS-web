"use client";

import { useEffect, useRef, useState } from "react";

const CATEGORIES = [
  {
    nom: "Visages",
    icone: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "😊", "😇", "🙂",
      "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝",
      "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥳", "🤩", "😏", "😒", "😞", "😔",
      "😟", "😕", "🙁", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠",
      "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗",
      "🤔", "🫡", "🤭", "🤫", "😶", "😐", "😑", "😬", "🙄", "😯", "😮", "😲",
      "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒",
    ],
  },
  {
    nom: "Gestes",
    icone: "👍",
    emojis: [
      "👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉",
      "👆", "👇", "☝️", "👋", "🤚", "🖐️", "✋", "🖖", "👏", "🙌", "👐", "🤲",
      "🤝", "🙏", "💪", "🫶", "✍️", "🤳", "👀", "👂", "👃", "👄", "🧠", "🫵",
    ],
  },
  {
    nom: "Cœurs et symboles",
    icone: "❤️",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕",
      "💞", "💓", "💗", "💖", "💘", "💝", "💯", "🔥", "✨", "⭐", "🌟", "💫",
      "⚡", "💥", "💢", "💦", "💤", "✅", "❌", "❓", "❗", "⚠️", "🔔", "➕",
    ],
  },
  {
    nom: "Fête et activités",
    icone: "🎉",
    emojis: [
      "🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🥈", "🥉", "🎯", "🎮", "🎵", "🎶",
      "🎤", "🎧", "🎬", "📷", "📚", "🎓", "⚽", "🏀", "🏈", "🎾", "🏐", "🥊",
      "🏋️", "🚴", "🏊", "🧘", "💃", "🕺", "🎂", "🍾", "🥂", "🍻", "☕", "🍵",
    ],
  },
  {
    nom: "Nature et nourriture",
    icone: "🐶",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🦁", "🐯", "🐸", "🐵",
      "🐔", "🐧", "🐦", "🦋", "🌸", "🌹", "🌻", "🌴", "🌍", "🌈", "☀️", "🌙",
      "🍎", "🍌", "🍉", "🍇", "🍓", "🥭", "🍍", "🍕", "🍔", "🍟", "🌭", "🍿",
      "🍩", "🍪", "🍫", "🍗", "🥩", "🍞", "🧀", "🥗", "🍜", "🍣", "🌽", "🥕",
    ],
  },
  {
    nom: "Objets et lieux",
    icone: "💼",
    emojis: [
      "📱", "💻", "🖥️", "📞", "📍", "💡", "💰", "💳", "💵", "🛒", "🛍️", "📦",
      "💼", "📝", "📅", "📎", "🔒", "🔑", "🚗", "🚕", "🚌", "✈️", "🚀", "🏠",
      "🏢", "🏪", "🏥", "🏫", "⏰", "⌛", "📈", "📉", "🔧", "🛠️", "🎒", "👕",
    ],
  },
];

// Bouton 😊 + panneau de sélection. Aucune dépendance externe : le parent
// reçoit l'émoji choisi via `onChoisir` et l'insère où il veut dans son champ.
export default function EmojiPicker({
  onChoisir,
}: {
  onChoisir: (emoji: string) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [categorie, setCategorie] = useState(0);
  const conteneur = useRef<HTMLDivElement>(null);

  // Ferme le panneau en cliquant ailleurs ou avec Échap.
  useEffect(() => {
    if (!ouvert) return;

    function clicDehors(e: MouseEvent | TouchEvent) {
      if (conteneur.current && !conteneur.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    function echap(e: KeyboardEvent) {
      if (e.key === "Escape") setOuvert(false);
    }

    document.addEventListener("mousedown", clicDehors);
    document.addEventListener("touchstart", clicDehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", clicDehors);
      document.removeEventListener("touchstart", clicDehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);

  // onMouseDown + preventDefault : le champ de saisie garde le focus
  // pendant qu'on choisit un émoji.
  const garderFocus = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div ref={conteneur} className="relative shrink-0">
      <button
        type="button"
        onMouseDown={garderFocus}
        onClick={() => setOuvert((v) => !v)}
        aria-label="Choisir un émoji"
        aria-expanded={ouvert}
        className="w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-surface transition-colors"
      >
        😊
      </button>

      {ouvert && (
        <div
          role="dialog"
          aria-label="Émojis"
          className="absolute bottom-full left-0 mb-2 z-20 w-72 max-w-[calc(100vw-1.5rem)] bg-paper border border-surface-border rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="flex border-b border-surface-border">
            {CATEGORIES.map((c, i) => (
              <button
                key={c.nom}
                type="button"
                onMouseDown={garderFocus}
                onClick={() => setCategorie(i)}
                aria-label={c.nom}
                aria-pressed={i === categorie}
                className={`flex-1 py-2 text-lg border-b-2 transition-colors ${
                  i === categorie
                    ? "border-accent bg-surface"
                    : "border-transparent hover:bg-surface"
                }`}
              >
                {c.icone}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-8 gap-0.5 p-2 h-48 overflow-y-auto">
            {CATEGORIES[categorie].emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onMouseDown={garderFocus}
                onClick={() => onChoisir(emoji)}
                className="h-9 rounded-lg text-2xl flex items-center justify-center hover:bg-surface"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
