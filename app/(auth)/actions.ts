"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type ClientServeur = Awaited<ReturnType<typeof createClient>>;

// Indicatif ajouté aux numéros saisis sans indicatif international.
const INDICATIF_DEFAUT = "+243"; // RDC

// Met un numéro saisi à la main au format international (E.164), seul format
// accepté par Supabase : « 081 234 5678 », « 81 234 5678 », « 0812345678 »,
// « 00243812345678 » ou « +243 81 234 5678 » donnent tous « +243812345678 ».
// Retourne null si le numéro n'a pas une forme valide.
function normaliserTelephone(saisie: string): string | null {
  let s = saisie.replace(/[\s().-]/g, "");

  if (s.startsWith("00")) s = "+" + s.slice(2);

  if (!s.startsWith("+")) {
    if (/^243\d{9}$/.test(s)) s = "+" + s; // indicatif tapé sans le « + »
    else if (s.startsWith("0")) s = INDICATIF_DEFAUT + s.slice(1);
    else s = INDICATIF_DEFAUT + s;
  }

  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}

// Messages d'erreur Supabase (en anglais) -> français.
function traduireErreur(message: string) {
  const m = message.toLowerCase();

  if (m.includes("user already registered"))
    return "Ce numéro ou cette adresse est déjà utilisé. Connecte-toi.";
  if (m.includes("password should be at least"))
    return "Le mot de passe est trop court (6 caractères minimum).";
  if (m.includes("invalid login credentials"))
    return "Identifiant ou mot de passe incorrect.";
  if (m.includes("phone not confirmed") || m.includes("email not confirmed"))
    return "Ce compte n'est pas encore confirmé. Contacte le support.";
  if (m.includes("unable to validate email") || m.includes("invalid format"))
    return "Adresse e-mail invalide.";
  if (m.includes("rate limit") || m.includes("for security purposes"))
    return "Trop de tentatives. Patiente un peu avant de réessayer.";
  if (m.includes("phone") && m.includes("disabled"))
    return "L'inscription par téléphone n'est pas activée pour le moment.";

  return message;
}

// Crée la ligne `profiles` et applique le code promo, une fois le compte créé
// et connecté.
//
// Pas de trigger `handle_new_user` détecté côté base : la ligne `profiles`
// n'est PAS créée automatiquement. On réplique donc ici ce que fait l'app
// mobile après un signUp. Si l'app crée la ligne différemment (autres
// colonnes, valeurs par défaut), aligne cette insertion sur son code exact.
async function finaliserInscription(
  supabase: ClientServeur,
  user: User,
  pseudo: string,
  codePromo: string
) {
  // Supabase renvoie le téléphone sans le « + » : on le remet.
  const telephone = user.phone
    ? user.phone.startsWith("+")
      ? user.phone
      : `+${user.phone}`
    : null;

  // On n'envoie que les champs connus : un compte créé par téléphone n'a pas
  // d'e-mail (la colonne reste vide plutôt que d'y mettre une valeur factice).
  const ligne: Record<string, string> = { id: user.id, pseudo };
  if (telephone) ligne.telephone = telephone;
  if (user.email) ligne.email = user.email;

  const { error: erreurProfil } = await supabase.from("profiles").insert(ligne);
  if (erreurProfil) return erreurProfil.message;

  // Comme dans index.tsx : un code promo invalide ne bloque pas
  // l'inscription, juste un avertissement silencieux.
  if (codePromo) {
    const { error: erreurPromo } = await supabase.rpc("appliquer_code_promo", {
      p_nouveau_id: user.id,
      p_code: codePromo,
    });
    if (erreurPromo) {
      console.warn("Code promo non appliqué :", erreurPromo.message);
    }
  }

  return null;
}

// Connexion par téléphone OU par e-mail (les comptes existants créés avec un
// e-mail continuent de fonctionner). Retourne une erreur à afficher ; en cas
// de succès, redirige.
export async function seConnecter(formData: FormData): Promise<{ erreur: string }> {
  const supabase = await createClient();

  const identifiant = ((formData.get("identifiant") as string) ?? "").trim();
  const password = formData.get("password") as string;

  const redirectVers = (formData.get("redirect") as string) || "/produits";

  let resultat;
  if (identifiant.includes("@")) {
    resultat = await supabase.auth.signInWithPassword({ email: identifiant, password });
  } else {
    const telephone = normaliserTelephone(identifiant);
    if (!telephone) {
      return {
        erreur: "Entre un numéro de téléphone valide (ex. +243 81 234 5678) ou ton e-mail.",
      };
    }
    resultat = await supabase.auth.signInWithPassword({ phone: telephone, password });
  }

  if (resultat.error) {
    return { erreur: traduireErreur(resultat.error.message) };
  }

  revalidatePath("/", "layout");
  redirect(redirectVers);
}

// Inscription avec un numéro de téléphone et un mot de passe, sans code de
// confirmation : le compte est créé et connecté tout de suite, puis le profil
// est créé. Retourne une erreur à afficher ; en cas de succès, redirige vers
// la page de bienvenue.
export async function sInscrire(formData: FormData): Promise<{ erreur: string }> {
  const supabase = await createClient();

  const telephone = normaliserTelephone((formData.get("telephone") as string) ?? "");
  const password = formData.get("password") as string;
  const pseudo = ((formData.get("pseudo") as string) ?? "").trim();
  const codePromo = ((formData.get("codePromo") as string) ?? "").trim();

  if (!pseudo) return { erreur: "Le pseudo est obligatoire." };
  if (!telephone) {
    return { erreur: "Numéro de téléphone invalide. Exemple : +243 81 234 5678." };
  }

  const { data, error } = await supabase.auth.signUp({ phone: telephone, password });

  if (error) return { erreur: traduireErreur(error.message) };

  // Numéro déjà utilisé par un compte existant : Supabase peut ne pas
  // renvoyer d'erreur, mais un utilisateur sans aucune identité.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { erreur: "Ce numéro est déjà utilisé. Connecte-toi." };
  }

  // Pas de session : la confirmation par SMS est encore activée dans Supabase.
  // (Authentication → Providers → Phone → « Enable phone confirmations »
  // doit être désactivé pour une inscription sans code.)
  if (!data.session || !data.user) {
    return {
      erreur:
        "Inscription impossible pour le moment : la confirmation par SMS est encore activée côté serveur.",
    };
  }

  const erreurProfil = await finaliserInscription(supabase, data.user, pseudo, codePromo);
  if (erreurProfil) {
    return { erreur: `Ton compte est créé, mais le profil n'a pas pu l'être : ${erreurProfil}` };
  }

  revalidatePath("/", "layout");
  redirect(`/bienvenue?pseudo=${encodeURIComponent(pseudo)}`);
}

export async function seDeconnecter() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
