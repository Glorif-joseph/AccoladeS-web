import AuthScreen from "@/components/AuthScreen";

export default async function Connexion({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; redirect?: string; mode?: string }>;
}) {
  const { erreur, redirect: redirectVers, mode } = await searchParams;

  return (
    <AuthScreen
      redirectVers={redirectVers ?? "/produits"}
      erreur={erreur}
      modeInitial={mode === "inscription" ? "inscription" : "connexion"}
    />
  );
}
