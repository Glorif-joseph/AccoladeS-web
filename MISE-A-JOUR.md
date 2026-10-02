# Mise à jour partielle — à fusionner dans ton dossier accolades-web existant

Mon environnement de travail a redémarré entre deux messages (limite
technique de session), donc je n'ai plus le projet complet sous la main —
seulement les fichiers nouveaux ou modifiés de cette session. Tu as déjà
tout le reste en local : copie ces fichiers par-dessus ton dossier
`accolades-web`, en respectant les mêmes chemins.

## Contenu de ce paquet

```
app/membres/[id]/page.tsx       (remplace l'approximation précédente)
app/salon/page.tsx               (remplace l'existant — corrige le plein écran)
app/compte/messages/page.tsx     (remplace l'existant)
components/MembreDetailContent.tsx   (nouveau)
components/SalonChat.tsx             (nouveau/remplace)
components/MessagesListe.tsx         (nouveau)
```

Aucune nouvelle dépendance npm — pas besoin de refaire `npm install`.

## Base de données

**Déjà appliqué** (avec ton accord) : la policy RLS des campagnes a été
corrigée — `date_fin::date >= current_date` au lieu de `date_fin > now()`,
pour qu'une campagne reste visible jusqu'à la fin de sa journée de fin,
peu importe l'heure exacte stockée. Rien à faire de ton côté.

## Ce qui a été corrigé/ajouté

- **Fiche membre** (`/membres/[id]`) — reprend maintenant fidèlement
  `DetailMembreScreen` : couverture en carrousel, avatar, stats, bio,
  boutons Suivre/Message/Appeler, campagnes et produits publiés.
- **Salon** (`/salon`) et **Messages** (`/compte/messages`) — reconstruits
  à partir de `SalonScreen`/`MessagesScreen`. Les trois pages utilisent
  maintenant un layout `flex-col` qui remplit vraiment tout l'écran
  (`h-[100dvh]`/`flex-1 min-h-0`), plutôt qu'une hauteur supposée — c'est
  probablement ce que tu avais remarqué sur les "pages pas en plein écran".
- **Messages** inclut le salon (avec badge de non-lus), la recherche, les
  conversations privées (avatar, dernier message, mise en avant si non lu).

## Écart assumé

La section **"Groupes"** de `MessagesScreen` dépend d'une table `groupes`
qui n'existe pas dans ta vraie base (vérifié en SQL) — omise plutôt que
construite sur une table absente. Dis-moi si ce système doit encore être
créé côté base (migration) avant que je le construise côté site.
