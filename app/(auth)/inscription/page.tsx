import { redirect } from "next/navigation";

// L'app n'a qu'un seul écran combiné (voir index.tsx : un state `mode`
// bascule entre connexion et inscription) — le site fait pareil maintenant
// via components/AuthScreen.tsx sur /connexion. Cette route est gardée
// uniquement pour ne pas casser d'anciens liens vers /inscription.
export default function Inscription() {
  redirect("/connexion?mode=inscription");
}
