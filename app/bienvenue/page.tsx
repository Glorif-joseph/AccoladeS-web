import BienvenueAnime from "@/components/BienvenueAnime";

export default async function Bienvenue({
  searchParams,
}: {
  searchParams: Promise<{ pseudo?: string }>;
}) {
  // pseudo récupéré comme dans l'app (params de navigation après signUp)
  // mais non interpolé dans les paragraphes : l'app ne l'utilise pas non
  // plus dans le texte affiché, seulement transporté au cas où.
  await searchParams;
  return <BienvenueAnime />;
}
