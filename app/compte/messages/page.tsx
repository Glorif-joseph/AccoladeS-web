import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { demarrerConversation } from "./actions";
import SiteHeader from "@/components/SiteHeader";

export const revalidate = 0;

export default async function Messages({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/compte/messages");

  const { data: mesMessages } = await supabase
    .from("messages_prives")
    .select("id, expediteur_id, destinataire_id, contenu, created_at, lu")
    .or(`expediteur_id.eq.${user.id},destinataire_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  // Reconstitué en JS : aucune table "conversations" en base, seulement des
  // messages individuels. On regroupe par interlocuteur pour obtenir
  // dernier message + nombre de non-lus.
  const parInterlocuteur = new Map<
    string,
    { dernierMessage: string; date: string; nonLus: number }
  >();

  for (const m of mesMessages ?? []) {
    const autreId = m.expediteur_id === user.id ? m.destinataire_id : m.expediteur_id;
    const entree = parInterlocuteur.get(autreId);
    if (!entree) {
      parInterlocuteur.set(autreId, {
        dernierMessage: m.contenu,
        date: m.created_at,
        nonLus: m.destinataire_id === user.id && !m.lu ? 1 : 0,
      });
    } else if (m.destinataire_id === user.id && !m.lu) {
      entree.nonLus += 1;
    }
  }

  const autresIds = [...parInterlocuteur.keys()];
  const { data: profils } = autresIds.length
    ? await supabase.from("profiles").select("id, pseudo").in("id", autresIds)
    : { data: [] };

  const { data: membres } = await supabase
    .from("profiles")
    .select("id, pseudo")
    .neq("id", user.id)
    .order("pseudo");

  const conversations = autresIds
    .map((id) => ({
      id,
      pseudo: profils?.find((p) => p.id === id)?.pseudo ?? "Membre AccoladeS",
      ...parInterlocuteur.get(id)!,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-8 py-10">
      <SiteHeader />

      <h1 className="font-display text-3xl mb-8">Mes messages</h1>

      {erreur && (
        <p className="mb-6 text-sm text-danger border border-danger/30 rounded-lg px-4 py-3">
          {erreur}
        </p>
      )}

      <section className="mb-10">
        <details className="border border-ink/10 rounded-xl p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Nouveau message
          </summary>
          <form action={demarrerConversation} className="mt-4 space-y-4">
            <select
              name="destinataireId"
              required
              className="w-full border-b-2 border-ink/20 focus:border-accent outline-none bg-transparent py-2"
            >
              <option value="">Choisir un membre</option>
              {membres?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.pseudo}
                </option>
              ))}
            </select>
            <textarea
              name="contenu"
              rows={2}
              required
              placeholder="Ton message..."
              className="w-full border-2 border-ink/20 focus:border-accent outline-none bg-transparent rounded-lg p-3"
            />
            <button
              type="submit"
              className="rounded-full bg-accent text-ink px-5 py-2 text-sm font-medium hover:bg-accent-light transition-colors"
            >
              Envoyer
            </button>
          </form>
        </details>
      </section>

      {conversations.length === 0 && (
        <p className="text-ink/50 text-sm">Aucune conversation pour l&rsquo;instant.</p>
      )}

      <ul className="divide-y divide-ink/10">
        {conversations.map((c) => (
          <li key={c.id}>
            <Link
              href={`/compte/messages/${c.id}`}
              className="flex items-center justify-between py-4 hover:text-accent transition-colors"
            >
              <div>
                <p className="font-medium">{c.pseudo}</p>
                <p className="text-sm text-ink/50 truncate max-w-sm">{c.dernierMessage}</p>
              </div>
              {c.nonLus > 0 && (
                <span className="rounded-full bg-accent text-ink text-xs px-2 py-1 font-medium">
                  {c.nonLus}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
