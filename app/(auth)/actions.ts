"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function seConnecter(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const redirectVers = (formData.get("redirect") as string) || "/produits";

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(
      `/connexion?erreur=${encodeURIComponent(error.message)}&redirect=${encodeURIComponent(redirectVers)}`
    );
  }

  revalidatePath("/", "layout");
  redirect(redirectVers);
}

export async function sInscrire(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const pseudo = formData.get("pseudo") as string;
  const codePromo = (formData.get("codePromo") as string)?.trim();

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/inscription?erreur=${encodeURIComponent(error.message)}`);
  }

  // Pas de trigger `handle_new_user` détecté côté base : contrairement à un
  // pattern Supabase courant, la ligne `profiles` n'est PAS créée
  // automatiquement. On réplique donc ici ce que fait l'app mobile après un
  // signUp. Si l'app crée la ligne différemment (autres colonnes, valeurs
  // par défaut spécifiques), aligne cette insertion sur son code exact
  // avant de mettre en prod.
  if (data.user) {
    const { error: erreurProfil } = await supabase.from("profiles").insert({
      id: data.user.id,
      pseudo,
      email,
    });

    if (erreurProfil) {
      redirect(`/inscription?erreur=${encodeURIComponent(erreurProfil.message)}`);
    }

    // Comme dans index.tsx : un code promo invalide ne bloque pas
    // l'inscription, juste un avertissement silencieux (console.warn côté
    // app) — même comportement ici, aucune erreur affichée à l'utilisateur.
    if (codePromo) {
      const { error: erreurPromo } = await supabase.rpc("appliquer_code_promo", {
        p_nouveau_id: data.user.id,
        p_code: codePromo,
      });
      if (erreurPromo) {
        console.warn("Code promo non appliqué :", erreurPromo.message);
      }
    }
  }

  revalidatePath("/", "layout");

  // Si la confirmation par email est activée côté Supabase Auth, `data.session`
  // est nul ici et l'utilisateur n'est pas encore connecté : on l'informe au
  // lieu de le rediriger vers une page protégée.
  if (!data.session) {
    redirect("/inscription?message=verifiez-vos-emails");
  }

  redirect(`/bienvenue?pseudo=${encodeURIComponent(pseudo)}`);
}

export async function seDeconnecter() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
