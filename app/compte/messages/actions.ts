"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function demarrerConversation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?redirect=/compte/messages");
  }

  const destinataireId = formData.get("destinataireId") as string;
  const contenu = (formData.get("contenu") as string)?.trim();

  if (!destinataireId || !contenu) {
    redirect(
      `/compte/messages?erreur=${encodeURIComponent("Choisis un membre et écris un message.")}`
    );
  }

  await supabase.from("messages_prives").insert({
    expediteur_id: user.id,
    destinataire_id: destinataireId,
    contenu,
  });

  revalidatePath("/compte/messages");
  redirect(`/compte/messages/${destinataireId}`);
}
