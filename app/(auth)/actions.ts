"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type ClientServeur = Awaited<ReturnType<typeof createClient>>;

// Messages d'erreur Supabase (en anglais) -> français.
function traduireErreur(message: string) {
  const m = message.toLowerCase();

  if (m.includes("user already registered"))
    return "Cette adresse e-mail est déjà utilisée. Connecte-toi.";
  if (m.includes("password should be at least"))
    return "Le mot de passe est trop court (6 caractères minimum).";
  if (m.includes("invalid login credentials"))
    return "E-mail ou mot de passe incorrect.";
  if (m.includes("email not confirmed"))
    return "Ton adresse e-mail n'est pas encore confirmée.";
  if (m.includes("unable to validate email") || m.includes("invalid format"))
    return "Adresse e-mail invalide.";
  if (m.includes("token") && (m.includes("expired") || m.includes("invalid")))
    return "Code invalide ou expiré. Demande un nouveau code.";
  if (m.includes("rate limit") || m.includes("for security purposes"))
    return "Trop de tentatives. Patiente un peu avant de réessayer.";

  return message;
}

// Crée la ligne `profiles` et applique le code promo. Appelée UNE FOIS le
// compte confirmé (session active) : avant, la base refuserait l'insertion
// car il n'y a pas encore d'utilisateur connecté. Le pseudo et le code promo
// ont été gardés dans les informations du compte au moment de l'inscription.
//
// Pas de trigger `handle_new_user` détecté côté base : la ligne `profiles`
// n'est PAS créée automatiquement. On réplique donc ici ce que fait l'app
// mobile après un signUp. Si l'app crée la ligne différemment (autres
// colonnes, valeurs par défaut), aligne cette insertion sur son code exact.
async function finaliserInscription(supabase: ClientServeur, user: User) {
  const meta = (user.user_metadata ?? {}) as { pseudo?: string; code_promo?: string };
  const pseudo = (meta.pseudo ?? "").trim();
  const codePromo = (meta.code_promo ?? "").trim();

  const { data: existant } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existant) return { pseudo, erreur: null as string | null };

  const { error: erreurProfil } = await supabase.from("profiles").insert({
    id: user.id,
    pseudo,
    email: user.email ?? "",
  });

  if (erreurProfil) {
    return {
      pseudo,
      erreur: `Ton e-mail est confirmé, mais la création du profil a échoué : ${erreurProfil.message}`,
    };
  }

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

  return { pseudo, erreur: null as string | null };
}

// Retourne une erreur à afficher, ou `nonConfirme` si l'adresse e-mail attend
// encore son code (l'écran propose alors d'en renvoyer un).
export async function seConnecter(
  formData: FormData
): Promise<{ erreur: string; nonConfirme?: boolean }> {
  const supabase = await createClient();

  const email = ((formData.get("email") as string) ?? "").trim();
  const password = formData.get("password") as string;

  const redirectVers = (formData.get("redirect") as string) || "/produits";

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      erreur: traduireErreur(error.message),
      nonConfirme: error.message.toLowerCase().includes("email not confirmed"),
    };
  }

  revalidatePath("/", "layout");
  redirect(redirectVers);
}

// Étape 1 : crée le compte et envoie le code par e-mail.
// Retourne { etape: "code", email } pour afficher l'écran de saisie du code.
export async function sInscrire(
  formData: FormData
): Promise<{ erreur: string } | { etape: "code"; email: string }> {
  const supabase = await createClient();

  const email = ((formData.get("email") as string) ?? "").trim();
  const password = formData.get("password") as string;
  const pseudo = ((formData.get("pseudo") as string) ?? "").trim();
  const codePromo = ((formData.get("codePromo") as string) ?? "").trim();

  if (!pseudo) return { erreur: "Le pseudo est obligatoire." };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { pseudo, code_promo: codePromo } },
  });

  if (error) return { erreur: traduireErreur(error.message) };

  // Adresse déjà utilisée par un compte confirmé : Supabase ne renvoie pas
  // d'erreur, mais un utilisateur sans aucune identité.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { erreur: "Cette adresse e-mail est déjà utilisée. Connecte-toi." };
  }

  // Confirmation par e-mail désactivée côté Supabase : la session existe déjà,
  // on garde l'ancien comportement (profil + bienvenue).
  if (data.session && data.user) {
    const resultat = await finaliserInscription(supabase, data.user);
    if (resultat.erreur) return { erreur: resultat.erreur };

    revalidatePath("/", "layout");
    redirect(`/bienvenue?pseudo=${encodeURIComponent(resultat.pseudo)}`);
  }

  // Confirmation activée : un code vient d'être envoyé par e-mail.
  return { etape: "code", email };
}

// Étape 2 : vérifie le code reçu. Si c'est bon, le compte est confirmé et
// connecté, le profil est créé, puis redirection vers la page de bienvenue.
export async function verifierCode(formData: FormData): Promise<{ erreur: string }> {
  const email = ((formData.get("email") as string) ?? "").trim();
  const code = ((formData.get("code") as string) ?? "").replace(/\s/g, "");

  if (!/^\d{6,10}$/.test(code)) {
    return { erreur: "Entre le code à 6 chiffres reçu par e-mail." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "signup",
  });

  if (error || !data.user) {
    return { erreur: traduireErreur(error?.message ?? "Code invalide ou expiré.") };
  }

  const resultat = await finaliserInscription(supabase, data.user);
  if (resultat.erreur) return { erreur: resultat.erreur };

  revalidatePath("/", "layout");
  redirect(`/bienvenue?pseudo=${encodeURIComponent(resultat.pseudo)}`);
}

export async function renvoyerCode(
  email: string
): Promise<{ ok: true } | { erreur: string }> {
  const supabase = await createClient();

  const { error } = await supabase.auth.resend({ type: "signup", email });

  if (error) return { erreur: traduireErreur(error.message) };
  return { ok: true };
}

export async function seDeconnecter() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
