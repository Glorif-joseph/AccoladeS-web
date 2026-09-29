import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConversationThread from "@/components/ConversationThread";
import SiteHeader from "@/components/SiteHeader";

export const revalidate = 0;

export default async function Conversation({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: autreId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/connexion?redirect=/compte/messages/${autreId}`);

  const { data: autreProfil } = await supabase
    .from("profiles")
    .select("pseudo")
    .eq("id", autreId)
    .single();

  if (!autreProfil) notFound();

  const { data: messages } = await supabase
    .from("messages_prives")
    .select("id, contenu, created_at, expediteur_id")
    .or(
      `and(expediteur_id.eq.${user.id},destinataire_id.eq.${autreId}),and(expediteur_id.eq.${autreId},destinataire_id.eq.${user.id})`
    )
    .order("created_at", { ascending: true })
    .limit(100);

  // Marquer comme lus les messages reçus de cet interlocuteur, à
  // l'ouverture du fil.
  await supabase
    .from("messages_prives")
    .update({ lu: true })
    .eq("expediteur_id", autreId)
    .eq("destinataire_id", user.id)
    .eq("lu", false);

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-8 py-10">
      <SiteHeader />

      <div className="flex items-center gap-3 mb-8">
        <Link href="/compte/messages" className="text-sm hover:text-accent transition-colors">
          ← Messages
        </Link>
        <h1 className="font-display text-2xl">{autreProfil.pseudo}</h1>
      </div>

      <ConversationThread
        messagesInitiaux={messages ?? []}
        utilisateurId={user.id}
        autreId={autreId}
      />
    </main>
  );
}
