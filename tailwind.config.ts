import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palette reprise telle quelle de l'app mobile (AppHeader.tsx,
        // BarreOr.tsx, profil.tsx, produits.tsx). Le contenu de l'app est
        // clair (blanc + crème) — seule la navigation est en anthracite/
        // turquoise. `paper`/`ink` restent les noms déjà utilisés dans tout
        // le site (évite de renommer chaque fichier) mais reprennent
        // maintenant les vraies valeurs claires de l'app.
        paper: "#FFFFFF", // fond principal (ScrollView de l'app = blanc)
        ink: "#1C1C1E", // texte principal sur fond clair (= anthracite)
        surface: "#F5F0E6", // cartes/boutons secondaires clairs (carteBio, inputs)
        "surface-border": "#E5E3DE",
        anthracite: "#1C1C1E", // barre du haut, panneau menu, carte stat mise en avant
        accent: "#3FC1C9",
        "accent-light": "#6ED4DA", // variante hover (l'app n'a pas d'état hover)
        "accent-soft": "#E6F7F8", // fond badge "Boosté"
        "accent-ink": "#0B2B2A", // texte sur fond accent (boutons turquoise)
        "gris-fonce": "#4A4A4A",
        bordure: "#3A3A3C", // bordures sur fond sombre (panneau menu)
        danger: "#DC2626",
        success: "#059669",
        muted: "#8A8A8A",
      },
      fontFamily: {
        // L'app n'utilise aucune police custom (Fonts.web.sans dans
        // constants/theme.ts = pile système). On garde une seule famille,
        // pas de serif display.
        display: ["var(--font-plex)", "system-ui", "sans-serif"],
        body: ["var(--font-plex)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
