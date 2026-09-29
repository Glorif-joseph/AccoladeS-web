# AccoladeS — Site web (phase 1 : socle + auth partagée)

Site Next.js connecté au **même** projet Supabase que l'app mobile Expo
(`Glorif-joseph's Project`, réf. `dumsjeumjlwqieradjoc`). Aucune nouvelle
base de données, aucune nouvelle table créée par ce socle.

## Démarrer en local

```bash
npm install
npm run dev
```

Le fichier `.env.local` est déjà rempli avec l'URL du projet et la clé
publique (`sb_publishable_...`). Cette clé est protégée par les policies RLS
déjà actives sur toutes les tables — elle est sans danger à committer dans
un dépôt **privé**. Ne jamais y ajouter la `service_role key`.

## Ce que fait ce socle

- `/` — landing page
- `/connexion`, `/inscription` — formulaires email + mot de passe, mêmes
  identifiants que l'app mobile
- `/compte` — page protégée, affiche le profil réel depuis la table
  `profiles`
- Un middleware (`middleware.ts`) protège `/compte`, `/wallet`, `/achats`,
  `/produits/nouveau` et redirige vers `/connexion` si non connecté

## Points à vérifier avant la mise en prod (importants)

1. **Création de la ligne `profiles` à l'inscription.**
   Je n'ai trouvé aucun trigger Postgres (`handle_new_user` ou équivalent)
   qui crée automatiquement une ligne `profiles` après un `signUp` dans
   `auth.users`. `app/(auth)/actions.ts` fait donc cette insertion
   manuellement (`id`, `pseudo`, `email`). **Compare ce code avec ce que fait
   l'app mobile** après son propre `signUp` — si l'app remplit d'autres
   colonnes obligatoires ou applique une logique différente (ex. valeurs par
   défaut spécifiques, vérifications de pseudo), aligne `sInscrire()` dessus
   pour éviter deux comportements différents selon le point d'entrée.

2. **Confirmation par email.**
   Si la confirmation d'email est activée dans Supabase Auth, `signUp` ne
   crée pas de session immédiate : l'utilisateur est redirigé vers un
   message "vérifie tes emails" plutôt que connecté directement. Vérifie ce
   réglage dans Dashboard → Authentication → Providers → Email, et ajuste si
   le comportement attendu diffère.

3. **Unicité du pseudo.**
   `profiles.pseudo` a une contrainte `unique` en base — une collision
   remonte déjà comme erreur via `erreurProfil`, mais le message Postgres
   brut n'est pas convivial. À améliorer en phase 2/3 (vérification
   d'unicité côté formulaire avant soumission).

## Phase 2 — Catalogue (ajoutée)

- `/produits` — grille publique de tous les produits (lecture ouverte à tous,
  confirmée par la policy RLS `Tout le monde peut voir les produits`)
- `/produits/[id]` — détail, avec like (mise à jour optimiste côté client)
  et commentaires
- Les actions like/commentaire exigent une session ; un visiteur non connecté
  est redirigé vers `/connexion?redirect=...` puis reviendra sur la même
  page après connexion (le paramètre `redirect` est prêt mais pas encore
  branché sur `seConnecter()` — vois la remarque ci-dessous)
- Aucune création de produit ici : `produits.prix` a une contrainte
  `CHECK (prix = 2.00)` en base — chaque produit coûte exactement 2€, une
  règle métier à respecter si un formulaire de création est ajouté en
  phase 3

### À faire avant la phase 3

`seConnecter()` dans `app/(auth)/actions.ts` redirige toujours vers
`/compte` après connexion, sans tenir compte d'un éventuel paramètre
`redirect` dans l'URL (ex. après avoir cliqué "se connecter" depuis une
fiche produit). À corriger en phase 3 pour ne pas perdre le visiteur en
route.

## Phase 3 — Espace compte enrichi (ajoutée)

- **Correctif** : `seConnecter()` respecte maintenant le paramètre
  `redirect` — un visiteur renvoyé vers `/connexion` depuis une fiche
  produit ou `/compte/achats` revient au bon endroit après connexion.
- `/compte/produits` — mes produits publiés, suppression en un clic
- `/compte/produits/nouveau` — formulaire de publication (upload d'image
  + insertion en une seule Server Action). Le prix est fixé à 2 € côté
  serveur, non éditable, pour respecter la contrainte `CHECK` en base.
- `/compte/achats` — reconstitue le mécanisme "achat mensuel entre
  membres" déjà présent dans le schéma (`achats.mois`,
  `statut_verification`) :
  - déclarer un achat chez un autre membre + upload de preuve
  - côté vendeur, valider ou refuser les achats reçus, preuve affichée
    via une **URL signée** (le bucket `preuves-achats` est privé)

### ⚠️ Observation sur la policy du bucket `preuves-achats`

En inspectant les policies RLS de `storage.objects`, la policy SELECT sur
`preuves-achats` est `auth.role() = 'authenticated'` — c'est-à-dire que
**n'importe quel membre connecté peut lire n'importe quelle preuve
d'achat**, pas seulement l'acheteur et le vendeur concernés. Je n'ai rien
modifié (consigne : ne pas toucher aux policies existantes sans
vérification), mais c'est à confirmer avec toi : si ce n'est pas
intentionnel, la policy à viser serait quelque chose comme
`auth.uid() IN (SELECT acheteur_id ... UNION SELECT vendeur_id ...)`
plutôt qu'un simple `authenticated`. Je peux la corriger si tu confirmes.

## Phase 4 — Wallet (ajoutée)

- `/compte/wallet` — solde (total / disponible / en attente), historique
  des transactions, formulaire d'ajout de fonds
- Le dépôt appelle `supabase.functions.invoke("create-deposit", ...)`
  **directement** — c'est la même edge function que l'app mobile utilise
  déjà (vérifiée via son code source : elle crée le wallet si besoin, ouvre
  un paiement LeekPay, enregistre le dépôt en `pending`). Le webhook
  `leekpay-webhook` confirme le paiement côté serveur. Rien de cette
  logique n'a été dupliqué ni modifié.
- Lecture seule pour le solde et l'historique : les policies RLS de
  `wallets`, `wallet_transactions`, `wallet_deposits` et
  `wallet_withdrawals` n'autorisent que `SELECT` pour le propriétaire —
  aucune policy `INSERT`/`UPDATE` côté client, ce qui est cohérent : toutes
  les écritures passent par les edge functions en `service_role`.

### Pas encore inclus (à décider avec toi)

- **Retrait de fonds** : `wallet_withdrawals` n'a aucune policy `INSERT`
  côté client et je n'ai trouvé aucune edge function de retrait déployée
  (seulement `create-deposit` et `leekpay-webhook`). Si le retrait existe
  côté app mobile, il passe probablement par un autre mécanisme (admin,
  edge function à créer) — à clarifier avant de construire cette partie
  côté site.
- **Retour après paiement** : l'edge function `create-deposit` n'envoie
  pas de `return_url` à LeekPay, seulement un `webhook_url`. Après avoir
  payé, l'utilisateur ne sera peut-être pas automatiquement ramené sur
  `/compte/wallet` — à vérifier dans les réglages du compte LeekPay ou
  avec la doc LeekPay. Je n'ai pas touché à l'edge function partagée avec
  l'app pour éviter d'impacter le comportement mobile sans confirmation.

## Phase 5 — Campagnes (ajoutée, dernière phase du périmètre v1)

- `/campagnes` — liste publique, filtrée automatiquement aux campagnes
  actives par la policy RLS (`date_fin > now()`)
- `/campagnes/[id]` — détail, boutons Réserver / Commander
- `/compte/campagnes` — mes campagnes créées (avec compteurs réels de
  réservations/commandes, visibles seulement du propriétaire) + création
  (upload vers le bucket `campagnes`, qui exige un chemin préfixé par
  l'id utilisateur) + mes réservations en tant que membre

### ⚠️ Observation RLS importante : pas de compteur public

La policy SELECT sur `campagne_reservations` et `campagne_commandes` ne
rend visibles que **mes propres lignes**, ou **toutes les lignes si je
suis l'organisateur de la campagne**. Résultat concret : impossible
d'afficher à un visiteur quelconque un compteur "12/50 réservations" sur
`/campagnes/[id]` — la requête ne renverrait que ce que ce visiteur a le
droit de voir (0, ou 1 s'il a lui-même réservé), pas le vrai total. J'ai
donc volontairement affiché seulement l'état personnel ("Réservé ✓") sur
la page publique, et réservé les vrais compteurs à `/compte/campagnes`
où le propriétaire y a droit. Si tu veux un compteur public réel, il
faudra une fonction Postgres `SECURITY DEFINER` dédiée (à créer avec toi,
pas en autonomie).

### ⚠️ Observation RLS : campagnes expirées invisibles même du propriétaire

La policy SELECT sur `campagnes` est uniquement `date_fin > now()` — il
n'existe **aucune policy permettant au propriétaire de revoir sa propre
campagne une fois expirée**. Concrètement, `/compte/campagnes` cessera
d'afficher une campagne passée, même pour celui qui l'a créée. Je n'ai
rien modifié (toujours la même consigne : pas de policy touchée sans ton
feu vert), mais c'est probablement à corriger avec une policy
supplémentaire du type `auth.uid() = profile_id` en `OR` de la condition
actuelle.

## v1.1 — Phase 6 : Messagerie (ajoutée)

- `/salon` — salon communautaire unique, **lecture publique sans
  connexion** (confirmé par la policy RLS `SELECT true`), écriture
  réservée aux membres connectés. Mise à jour en direct via Supabase
  Realtime.
- `/compte/messages` — liste des conversations privées, reconstituée en
  JS (il n'existe pas de table "conversations", seulement des messages
  individuels avec `expediteur_id`/`destinataire_id`) ; compteur de
  non-lus par interlocuteur ; formulaire pour démarrer une nouvelle
  conversation.
- `/compte/messages/[userId]` — fil de conversation privée, mise à jour
  en direct, marquage automatique comme lu à l'ouverture.

### Bonne nouvelle : Realtime déjà activé côté base

`messages_prives` et `messages_groupe` sont déjà dans la publication
`supabase_realtime` — c'est-à-dire que l'app mobile les utilise
probablement déjà en direct. Rien à activer côté Supabase, le site
branche directement dessus (`supabase.channel(...).on("postgres_changes",...)`).

### Limite connue (mineure)

Dans `/salon`, si un nouveau membre (jamais vu dans les 100 derniers
messages chargés) écrit pendant que la page est ouverte, son pseudo est
recherché à la volée via une requête `profiles` — un léger délai est
possible avant que son nom s'affiche correctement (fallback "Membre
AccoladeS" entre-temps). Sans impact fonctionnel, juste cosmétique.

## v1.1 — Phase 7 : Pulses (ajoutée)

- `/pulses` — bande des membres ayant un pulse actif (style stories),
  filtrée automatiquement par la RLS (`expires_at > now()`)
- `/pulses/[authorId]` — lecteur plein écran : défilement automatique
  (6s/pulse), navigation tap gauche/droite, like en direct
- `/compte/pulses` — publication (upload vers le bucket `pulses`, chemin
  préfixé par l'id utilisateur comme pour `campagnes`) et suivi des vues
  réelles (visibles seulement du propriétaire, policy RLS dédiée) — les
  likes, eux, sont publics (`pulse_likes` a une policy `SELECT true`),
  donc affichés tels quels partout, contrairement aux réservations de
  campagnes en phase 5.
- `expires_at` n'est jamais fixé côté site : la colonne a un défaut
  `now() + 24h` en base, on laisse la base gérer l'expiration comme le
  fait probablement déjà l'app mobile.

### Même limite RLS qu'en phase 5 (mineure ici, le TTL de 24h l'atténue)

Comme pour `campagnes`, la policy `SELECT` de `pulses` est uniquement
`expires_at > now()` — un pulse expiré redevient invisible même pour son
auteur sur `/compte/pulses`. Vu le TTL de 24h annoncé dès la conception
du pulse, l'impact est mineur (on ne s'attend pas à revoir un vieux
pulse), mais je le note par cohérence avec l'observation de la phase 5.

## v1.1 — Phase 8 : Notifications en direct (ajoutée)

- Clochette dans `CompteNav` (visible sur toutes les pages `/compte/*`),
  avec badge du nombre de non-lues
- `/compte/notifications` — historique complet, marquage lu individuel ou
  global (`Tout marquer comme lu`), lien direct vers le contenu concerné
  quand `notifications.lien` est renseigné
- Aucune table créée, aucune policy modifiée — `notifications` avait déjà
  ses policies `SELECT`/`UPDATE` scopées au propriétaire (`auth.uid() =
  profile_id`). Pas de policy `INSERT` côté client : les notifications
  sont créées côté serveur (trigger ou edge function existante côté app),
  ce qui est cohérent et n'a pas été touché.

### ✅ Mis à jour : "en direct" par push, plus par sondage

Migration appliquée : `alter publication supabase_realtime add table notifications;`.
`NotificationBell` écoute maintenant `postgres_changes` (filtré sur
`profile_id`) au lieu de sonder toutes les 20 secondes.

## Correctifs appliqués (confirmés par toi)

**1. Policy `preuves-achats` resserrée.**
L'ancienne policy s'appelait déjà "Preuves visibles par acheteur et
vendeur" mais vérifiait seulement `auth.role() = 'authenticated'` — donc
n'importe quel membre connecté pouvait tout voir. Remplacée par une
policy qui rejoint `achats` sur `preuve_url = storage.objects.name` et
vérifie `auth.uid() IN (acheteur_id, vendeur_id)`.

**2. Compteur public réel sur les campagnes.**
Nouvelle fonction Postgres `public.campagne_compteurs(p_campagne_id uuid)`,
`SECURITY DEFINER`, qui renvoie uniquement deux nombres (réservations,
commandes) — aucune ligne, aucune identité exposée. `/campagnes/[id]`
l'appelle via `supabase.rpc(...)` et affiche maintenant "X / objectif"
au lieu du seul état personnel.

**3. Campagnes et pulses expirés visibles par leur créateur.**
Nouvelle policy `SELECT` additive sur chaque table
(`auth.uid() = profile_id`), en plus de la policy existante basée sur la
date. Les policies `SELECT` permissives se combinent en `OR` en
Postgres — la policy d'origine n'a donc pas été touchée, seulement
complétée. `/compte/campagnes` et `/compte/pulses` montrent maintenant
aussi les éléments expirés du propriétaire.

## Phase 9 : alignement visuel avec l'app mobile

Objectif : même identité visuelle des deux côtés, pas une approximation.
Palette et navigation reprises directement du code de l'app
(`components/AppHeader.tsx`, `components/BarreOr.tsx`, `constants/theme.ts`,
`app/(tabs)/profil.tsx`, `app/(tabs)/produits.tsx`) que tu as partagé.

**Ce qui a changé :**
- Tokens Tailwind (`tailwind.config.ts`) refaits sur les vraies valeurs :
  fond clair `#FFFFFF`/`#F5F0E6` (le contenu de l'app est clair, contrairement
  à ce que j'avais supposé au premier passage — seule la nav est sombre),
  accent turquoise `#3FC1C9`, anthracite `#1C1C1E` pour la barre du haut et le
  panneau menu, rouge `#DC2626` pour les badges/déconnexion. Les anciens
  tokens (`pine`, `gold`, `clay`) ont été remplacés partout (29 fichiers).
- Police Fraunces retirée : l'app n'a aucun display font custom
  (`Fonts.web.sans` dans `constants/theme.ts` = pile système), le site ne
  garde que IBM Plex Sans.
- **Navigation refaite en composant global** (`components/SiteHeader.tsx`),
  monté une fois par page plutôt que dupliqué : barre anthracite (logo +
  bouton ☰) + panneau latéral coulissant (`HeaderPanel.tsx`, équivalent du
  menu d'`AppHeader`) + barre turquoise de raccourcis pour les connectés
  (`AccentBar.tsx`, équivalent de `BarreOr`) avec badges messages/notifications
  en direct. Remplace l'ancien `CompteNav` (horizontal, /compte uniquement)
  et les en-têtes en dur de chaque page publique — supprimés.

**Simplifications volontaires par rapport à `BarreOr` :**
- Pas de compteur "nouveaux produits depuis ta dernière visite" ni "nouveaux
  pulses non vus" — logique spécifique (`derniere_visite_produits`,
  `pulse_vues`) qui aurait doublé la taille de cette phase pour un gain
  secondaire. Facile à ajouter ensuite si tu le veux.
- La barre turquoise ne s'affiche que pour les connectés (l'app l'affiche
  toujours, badges à 0 si déconnecté) — plus simple, et un visiteur non
  connecté n'a de toute façon accès à aucun des raccourcis qu'elle propose.

**Reste en attente :**
- Le vrai logo (`assets/images/logo-symbole.png`) — un carré turquoise avec
  "A" fait office de placeholder en attendant.
- `AccentBar.tsx` reprend la structure de `BarreOr.tsx` (avatar à gauche,
  raccourcis à droite, badges rouges) mais pas ses compteurs "nouveaux
  produits"/"nouveaux pulses" (voir simplifications ci-dessus) ni l'icône
  "Pulse" séparée — à ajouter si tu veux la parité complète.
- Les cartes/boutons de chaque page (coins arrondis, boutons pilule,
  étiquette de prix turquoise, cartes blanches à bordure `#E5E3DE`) n'ont
  pas encore été repris un par un — seuls les tokens de couleur globaux
  s'appliquent partout automatiquement pour l'instant. Prochaine étape
  naturelle si tu veux pousser plus loin la ressemblance.

**Correctifs après ton retour sur les icônes :**
- `components/ui/icon-symbol.tsx` (partagé) confirme que l'app affiche des
  **Material Icons** (`@expo/vector-icons/MaterialIcons`) sur Android/web,
  pas des emojis. Remplacé partout par `react-icons/md` (mêmes glyphes
  Material Design) : `MdNotifications`, `MdMessage`, `MdHome`, `MdAddCircle`.
- J'avais mis le texte "Produits" à la place de l'icône maison
  (`house.fill`) et complètement oublié le bouton texte **"Pulse"** qui
  précède les icônes dans `BarreOr` — les deux sont corrigés, dans le même
  ordre que l'app (Pulse → maison → message → cloche → plus).

**Correctifs après tes captures d'écran de la vraie page profil :**
- **Upload avatar/couverture branché** (`components/ProfilPhotos.tsx`,
  nouveau) — c'était noté comme manquant, c'est fait : carrousel de
  couverture avec pastilles + badge "+ Ajouter"/"Limite atteinte" (5 photos
  max), avatar cliquable (cycle entre plusieurs photos ou ouvre le
  sélecteur), bouton "📷 Changer profil et couverture" (l'app ouvre une
  Alert à 3 choix native, remplacée ici par un petit menu inline — pas
  d'équivalent web direct). Upload direct navigateur → Supabase Storage,
  même convention de nom de fichier que `profil.tsx`
  (`{userId}/avatar-...`/`couverture-...`), buckets et policies déjà en
  place, rien à changer côté base.
- **Badge de palier recoloré** : j'avais mis un badge teinté turquoise ;
  ta capture montre "Nouveau" en gris neutre (comme `boutonAbonnement`) —
  corrigé pour tous les paliers (je n'ai pas le code de `PalierBadge.tsx`
  donc pas de couleur différente par palier pour l'instant, seulement ce
  gris confirmé par la capture).

## Site fermé : tout derrière connexion/inscription

Sur ta demande, plus aucune page n'est visible sans compte — y compris
l'accueil, le catalogue produits, les campagnes, les pulses et le salon,
auparavant publics. Seules `/connexion` et `/inscription` restent
accessibles sans session (`lib/supabase/middleware.ts`, logique inversée :
une liste de pages publiques au lieu d'une liste de pages protégées).
Un visiteur non connecté est redirigé vers `/connexion?redirect=<page
demandée>` et atterrit sur la bonne page après connexion.

## Connexion/inscription fusionnées + écran de bienvenue

Sur ta demande, calqué exactement sur `app/index.tsx` et `app/bienvenue.tsx`
que tu as partagés :
- **`/connexion` est maintenant l'unique écran** (composant
  `AuthScreen.tsx`) avec un bouton qui bascule entre "Connexion" et
  "Créer un compte" — plus de page séparée avec un design différent.
  `/inscription` redirige simplement vers `/connexion?mode=inscription`
  pour ne pas casser d'anciens liens.
- Après **connexion** : redirection vers `/produits` (comme
  `/(tabs)/produits` dans l'app), au lieu de `/compte` précédemment.
- Après **inscription** : redirection vers `/bienvenue?pseudo=...` (comme
  `router.replace('/bienvenue', {pseudo})`), nouvel écran
  (`app/bienvenue/page.tsx` + `BienvenueAnime.tsx`) qui reproduit le
  fondu échelonné des 8 paragraphes puis fait apparaître un bouton
  "Continuer" vers `/produits`. Ajouté aux pages publiques du middleware
  (accessible même si la session met un instant à se propager après
  l'inscription).
- Comme le site est maintenant fermé (voir plus haut), `/connexion` est
  déjà la première chose qu'un visiteur non connecté voit en arrivant sur
  le site, quelle que soit la page demandée — pas besoin de déplacer
  quoi que ce soit à la racine "/".

**Reste en attente :** l'image `assets/images/bienvenue-accolades.png`
— remplacée par un dégradé turquoise→anthracite en attendant.

## Points de sécurité restants à trancher avec toi

1. **Retrait de fonds wallet** : aucune policy `INSERT` côté client ni
   edge function de retrait déployée — à clarifier comment l'app mobile
   le gère avant de construire quelque chose côté site (phase 4)
2. **Retour après paiement LeekPay** : pas de `return_url` envoyée par
   `create-deposit`, à vérifier côté compte LeekPay (phase 4)

## Bilan

Les 5 phases du périmètre v1 sont livrées (auth partagée, catalogue
produits, espace compte, wallet, campagnes), les 3 phases v1.1 demandées
sont livrées (messagerie, pulses, notifications), et 3 des 5 observations
de sécurité ont été corrigées sur ta confirmation (preuves d'achat,
compteur public de campagnes, campagnes/pulses expirés). Il reste le
retrait de fonds et le retour post-paiement LeekPay à clarifier avant
d'y toucher.

## `/` n'est plus une page vitrine

Sur ta demande ("dès le lancement, la première page = connexion/inscription
exactement comme dans l'app"), `app/page.tsx` a été vidé de son contenu
marketing (boutons "Créer un compte"/"J'ai déjà un compte") — il ne fait
plus que rediriger, comme `index.tsx` côté app : vers `/connexion` si
déconnecté (le middleware le faisait déjà avant même d'atteindre cette
page), vers `/produits` si déjà connecté. `/connexion` (`components/
AuthScreen.tsx`) reprend `index.tsx` à l'identique : un seul écran, bascule
connexion/inscription par simple lien, mêmes couleurs et mise en page.
`/inscription` redirige vers `/connexion?mode=inscription` (gardée pour ne
pas casser d'anciens liens). Après inscription, `/bienvenue`
(`components/BienvenueAnime.tsx`) reprend l'écran `bienvenue.tsx` : mêmes
paragraphes, même fondu échelonné — l'image `bienvenue-accolades.png`
n'ayant pas été partagée, un dégradé la remplace en attendant.

## Menu latéral corrigé sur la vraie liste de l'app

J'avais inventé une liste de liens (Campagnes, Pulses, Salon, Mes
produits...) au lieu de reprendre `LIENS` dans `components/AppHeader.tsx`.
Corrigé : le menu affiche maintenant exactement **Produits, Profil, Wallet,
Validations, Membres, Messages, Paramètres**, dans cet ordre. Trois ne sont
pas encore construits côté site (Validations, Membres, Paramètres) — ils
apparaissent grisés, non cliquables, plutôt que d'être masqués ou de
pointer vers une page inexistante. Dis-moi si tu veux qu'on les construise.

## Membres et Validations construits

- **`/membres`** (`membres.tsx`) — annuaire de tous les profils, recherche
  par pseudo, badge de palier, bouton Suivre. `PalierBadge.tsx` et
  `SuivreBouton.tsx` n'ont jamais été partagés : le premier reprend le gris
  neutre confirmé par ta capture (pas de code couleur par palier pour
  l'instant), le second est reconstruit à partir du schéma réel de
  `followers` — à corriger si leur vrai rendu diffère.
- **`/membres/[id]`** — fiche membre : ni `membre_id.tsx` ni
  `membre-detail.tsx` n'ont été partagés, c'est une approximation
  raisonnable (profil + produits publiés) à refaire si tu passes le vrai
  fichier.
- **`/compte/validation`** (`validation.tsx`) — repris visuellement à
  l'identique (grande carte, preuve en grand, boutons ✕/✓ rouge/vert), mais
  la logique suit `/compte/achats` plutôt que le fichier source : la vraie
  table `achats` a une colonne `statut_verification` (pas `statut` comme
  `validation.tsx` le suppose) et aucune colonne `produit_id` (pas de titre
  de produit affichable, remplacé par "Achat du {mois}"). Réutilise
  `validerAchat`, déjà correct, plutôt que dupliquer une logique basée sur
  des colonnes qui n'existent pas.
- **Paramètres** reste grisé dans le menu — pas encore construit,
  `parametres.tsx` pas encore partagé.

## Programme Ambassadeur installé

- **`/ambassadeur`** (`ambassadeur.tsx`) — devenir ambassadeur (RPC
  `devenir_ambassadeur`, déjà en place côté base, rien à migrer), affichage
  du code promo obtenu, compteur de places restantes sur 200, partage du
  code. `Share.share()` de RN n'a pas d'équivalent web direct : utilise
  l'API Web Share du navigateur quand elle existe, sinon copie le message
  dans le presse-papier.
- **Code promo à l'inscription** (`index.tsx` mis à jour) — champ optionnel
  ajouté au formulaire, applique le code via le RPC `appliquer_code_promo`
  (déjà en place aussi) après création du profil ; un code invalide
  n'empêche pas l'inscription, juste un avertissement silencieux (identique
  à l'app).
- **Menu mis à jour** avec la nouvelle version de `AppHeader.tsx` : "Wallet"
  a disparu du menu (retiré de `LIENS` dans ta dernière version — la page
  `/compte/wallet` existe toujours côté site mais n'est plus listée, comme
  dans l'app), "Créer ma boutique" et "Devenir ambassadeur" ajoutés. "Créer
  ma boutique" reste grisé (`/plateformes` pas construit, fichier pas
  partagé).

**Observé mais pas construit** : la nouvelle `AppHeader.tsx` affiche un
`<PubCarousel />` en haut de la barre anthracite (carrousel de pubs) — pas
demandé explicitement cette fois-ci, donc pas ajouté ; dis-moi si tu veux
qu'on le fasse et partage `PubCarousel.tsx`.

## `/plateformes` construit ("Créer ma boutique")

Dernier lien grisé du menu, maintenant branché (`plateformes_boutique`,
table déjà conforme au schéma attendu, rien à migrer) : liste de
plateformes externes (nom, description, couleur, initiale), lien externe
qui ouvre un nouvel onglet. Il ne reste plus que **Paramètres** grisé dans
le menu, faute de `parametres.tsx`.

## Carrousel de pubs ajouté

`PubCarousel.tsx` en fond de la barre anthracite (table `publicites`, déjà
conforme) — fondu CSS plutôt que `Animated` de RN, voile sombre par-dessus
pour garder logo et menu lisibles. Logo et bouton menu passés en `z-10`
pour rester cliquables au-dessus.

## Produits : rattrapage après relecture de la version à jour

En comparant à la version de `produits.tsx` que tu viens de partager,
j'avais raté deux choses lors de la reconstruction précédente :

- **`CampagnesRangee`** manquait entièrement (toute la rangée horizontale de
  campagnes au-dessus du catalogue) — jamais partagée non plus, reconstruite
  à partir du schéma déjà utilisé sur `/campagnes` (vignette, titre, prix,
  lien vers `/campagnes/[id]`).
- **Contrôle d'abonnement actif avant achat** (`aUnAbonnementActif`/
  `alerterAbonnementRequis`, `utils/abonnement.ts`) — pas partagé non plus,
  reconstruit à partir du modèle déjà en place sur `/compte/abonnement` :
  abonnement du mois en cours avec `statut = 'payé'`. Si absent, propose
  d'aller sur `/compte/abonnement` au lieu de bloquer silencieusement.
- **`derniere_visite_produits`** est maintenant mis à jour à chaque visite
  de `/produits` (équivalent web du `useFocusEffect` de l'app).

Le badge **"Boosté"** reste omis : sa condition dépend toujours de
`achats.produit_id`, qui n'existe pas réellement (même écart déjà
documenté). Le flux "preuve d'achat" au clic sur "Voir la boutique /
Acheter" redirige vers `/compte/achats` plutôt que d'insérer directement
(la vraie table n'a pas de colonne `produit_id` pour lier la preuve au
produit précis).

## Page Produits reconstruite

Elle datait d'avant l'alignement visuel (phase 9) et n'avait jamais été
reprise depuis — grille minimaliste, prix en €, aucune interaction. Reprend
maintenant `produits.tsx` (ProduitsScreen) : recherche par titre/vendeur,
like (❤️/🤍, en direct), commentaires (modale), partage (Web Share API ou
presse-papier), bouton "Voir la boutique / Acheter" (lien externe), badge
"Indisponible" si bloqué, palier du vendeur. Prix en $ comme partout
ailleurs sur le site.

Deux écarts assumés :
- Le badge "🚀 Boosté" dépend de `achats.produit_id`, colonne absente de la
  vraie base (même écart que pour Validations/achats) — omis.
- `AvatarRotatif.tsx` pas partagé — avatar simple à la place (pas de
  rotation entre plusieurs photos de profil).

## Déploiement

Pensé pour Vercel : `vercel deploy`, puis renseigner les deux variables
d'environnement du `.env.local` dans les réglages du projet Vercel (Project
Settings → Environment Variables).
