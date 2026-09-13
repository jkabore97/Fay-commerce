# Fay & Partenaires — Site e-commerce & gestion de stock

Site vitrine B2B **sans prix affichés** (vente au lot, sur devis) et **tableau de
bord de gestion** (stock, ventes, achats, comptabilité) pour **Fay &
Partenaires**, spécialiste en boulonnerie à Ouagadougou depuis 1998.

> Le catalogue public ne montre jamais de prix : le client compose une **demande
> de devis**. Le back-office reprend la puissance de gestion du dépôt `dbms`
> (comptabilité en partie double, stock, ventes/retours) adaptée à une seule
> entreprise.

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Pile technique](#pile-technique)
- [Architecture](#architecture)
- [Rôles & accès](#rôles--accès)
- [Mise en route](#mise-en-route)
- [Base de données Supabase](#base-de-données-supabase)
- [Créer le premier administrateur](#créer-le-premier-administrateur)
- [Développement local](#développement-local)
- [Déploiement (Vercel)](#déploiement-vercel)
- [Personnaliser le site (CMS)](#personnaliser-le-site-cms)
- [Sécurité](#sécurité)
- [Structure du projet](#structure-du-projet)

---

## Fonctionnalités

**Vitrine publique (sans prix)**
- Page d'accueil avec écran de démarrage animé, bannières promo, catégories,
  produits en avant, secteurs servis, partenaires.
- Catalogue par famille (boulonnerie, visserie, écrous, rondelles, tiges
  d'ancrage, roulements) avec recherche.
- Fiche produit : galerie, caractéristiques techniques, disponibilité
  (« En stock » / « Sur commande ») — **jamais de prix**.
- **Demande de devis** : le visiteur constitue un panier de produits + quantités,
  puis envoie ses coordonnées. Il reçoit une référence `DV-AAAA-0000`.
- Pages À propos & Contact, formulaire de contact, SEO, responsive, animations.

**Tableau de bord (admin & employés)**
- Vue d'ensemble : ventes du jour, graphique 14 jours, stock bas, derniers devis.
- **Produits** : CRUD complet, catégories, prix d'achat/vente, seuil de stock.
- **Stock & mouvements** : historique en append-only, corrections d'inventaire,
  alertes de stock bas, valeur du stock.
- **Ventes** : enregistrement multi-lignes, retours (par écriture inverse).
- **Achats** : réception de marchandise (augmente le stock + écriture comptable),
  fournisseurs.
- **Devis** : boîte de réception des demandes, suivi de statut, conversion en vente.
- **Comptabilité** (partie double) : résultat, bilan, balance, grand livre, plan
  comptable, saisie de dépenses/recettes et transferts.
- **Contenu du site (CMS)** : édition de tout le texte de la vitrine, bannières &
  promotions, logos partenaires — sans toucher au code.
- **Équipe** : création de comptes employés, gestion des rôles.

---

## Pile technique

| Couche | Choix |
|---|---|
| Framework | Next.js 14 (App Router) + React 18 + TypeScript |
| Style | Tailwind CSS (thème acier/laiton), animations Framer Motion |
| Graphiques | Recharts |
| Base de données / Auth / Stockage | Supabase (PostgreSQL, RLS, Auth, Storage) |
| Icônes | lucide-react |

---

## Architecture

```
Navigateur (public)                Navigateur (personnel)
      │ RPC storefront_* (sans prix)      │ session Supabase (cookies)
      ▼                                   ▼
┌───────────────────────── Next.js (App Router) ─────────────────────────┐
│  (site)/      vitrine publique — Server Components + RPC anonymes        │
│  admin/       back-office — Server Components (RLS) + Client mutations   │
│  api/admin/   routes serveur (création d'employés, service-role)         │
│  middleware   rafraîchit la session, protège /admin                      │
└─────────────────────────────────────────────────────────────────────────┘
      │
      ▼
┌───────────────────────────── Supabase ─────────────────────────────────┐
│  PostgreSQL + RLS : staff, products, stock_movements, sales, purchases, │
│  accounts/journal (partie double), quote_requests, site_content,        │
│  banners, partners. Fonctions SECURITY DEFINER pour la vitrine et les   │
│  écritures. Storage : bucket public « media ».                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Principe clé — les prix ne fuient jamais.** La table `products` n'est pas
lisible par le rôle `anon`. La vitrine lit le catalogue via des fonctions
`storefront_*` (SECURITY DEFINER) qui ne renvoient ni le prix d'achat, ni le prix
de vente, ni la quantité exacte (seulement une disponibilité booléenne).

---

## Rôles & accès

| Domaine | Employé | Admin |
|---|:---:|:---:|
| Catalogue (produits, catégories) | ✅ | ✅ |
| Stock & corrections d'inventaire | ✅ | ✅ |
| Ventes & retours | ✅ | ✅ |
| Demandes de devis | ✅ | ✅ |
| Prix d'achat / marge / valeur du stock | ❌ | ✅ |
| Achats & fournisseurs | ❌ | ✅ |
| Comptabilité (livres, rapports) | ❌ | ✅ |
| Contenu du site, bannières, partenaires | ❌ | ✅ |
| Gestion de l'équipe | ❌ | ✅ |

L'accès est décidé par une seule table, `staff` : une ligne active liée au compte
Supabase, de rôle `admin` ou `employee`. La RLS applique ce tableau côté base ;
l'interface ne fait que le refléter.

---

## Mise en route

### Prérequis
- Node.js ≥ 18.18
- Un projet [Supabase](https://supabase.com) (gratuit pour démarrer)

### 1. Installer les dépendances
```bash
npm install
```

### 2. Configurer l'environnement
Copiez `.env.example` vers `.env.local` et renseignez les valeurs de votre projet
Supabase (Dashboard → Project Settings → API) :
```bash
cp .env.example .env.local
```
```
NEXT_PUBLIC_SUPABASE_URL=https://VOTRE-PROJET.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=clé-anon-publishable
SUPABASE_SERVICE_ROLE_KEY=clé-service-role-secrète   # côté serveur uniquement
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> Le site **fonctionne sans Supabase** : la vitrine s'affiche avec un contenu par
> défaut. Mais le catalogue dynamique, les devis et le tableau de bord ont besoin
> de la base.

---

## Base de données Supabase

Ouvrez **Supabase → SQL Editor**, collez le contenu de
[`supabase/apply_all.sql`](supabase/apply_all.sql) et exécutez-le une fois. Ce
fichier regroupe toutes les migrations (`supabase/migrations/`), il est
ré-exécutable sans risque, et il :

- crée les tables, la RLS et les fonctions ;
- crée le bucket de stockage public `media` ;
- installe le **plan comptable** de base ;
- insère les **6 familles de produits** et quelques produits de démonstration.

Pour régénérer le bundle après avoir ajouté une migration :
```bash
node scripts/build-bundle.mjs
```

---

## Créer le premier administrateur

Le premier admin ne peut pas être créé depuis l'application (il faut déjà être
admin pour en créer un). Après avoir **créé un compte** (voir plus bas), promouvez-le
depuis l'éditeur SQL de Supabase :

```sql
insert into staff (id, full_name, role)
select id, 'Faïçal — Fay & Partenaires', 'admin'
from auth.users
where email = 'VOTRE-EMAIL@exemple.com'
on conflict (id) do update set role = 'admin', is_active = true;
```

**Créer le compte** au préalable : Supabase → Authentication → Users → *Add user*
(email + mot de passe), ou activez l'inscription. Ensuite connectez-vous sur
`/login`. Les employés suivants se créent directement depuis **Admin → Équipe**.

---

## Développement local

```bash
npm run dev        # http://localhost:3000
npm run build      # build de production
npm run lint       # ESLint
npm run typecheck  # TypeScript (tsc --noEmit)
```

- Vitrine : `/`, `/catalogue`, `/produit/[slug]`, `/devis`, `/a-propos`, `/contact`
- Back-office : `/login` puis `/admin`

---

## Déploiement (Vercel)

1. Poussez le dépôt sur GitHub.
2. Sur [Vercel](https://vercel.com), *New Project* → importez le dépôt (framework
   Next.js détecté automatiquement).
3. Ajoutez les variables d'environnement (les mêmes que `.env.local`) dans
   **Project → Settings → Environment Variables**. `SUPABASE_SERVICE_ROLE_KEY`
   reste secret (ne jamais préfixer par `NEXT_PUBLIC_`).
4. Déployez. Mettez `NEXT_PUBLIC_SITE_URL` à l'URL de production.

> **Framework = Next.js (important).** Le fichier `vercel.json` épingle
> `framework: nextjs` et la commande de build, ce qui force Vercel à construire
> l'application correctement. Si le projet a été importé alors que `main` était
> encore vide, Vercel peut avoir mémorisé le preset **« Other »** (site statique,
> sans build) — ce qui donne une page **404: NOT_FOUND** de Vercel sur toutes les
> routes. Dans ce cas : **Project → Settings → Build & Development Settings →
> Framework Preset = Next.js**, laissez *Output Directory* par défaut, puis
> **Deployments → Redeploy**. Avec `vercel.json` en place, un simple redéploiement
> suffit.

Dans Supabase → Authentication → URL Configuration, ajoutez l'URL de production
aux *Redirect URLs*.

---

## Personnaliser le site (CMS)

Tout le contenu de la vitrine s'édite depuis **Admin → Contenu** :
accueil (hero), à propos, contact, SEO, pied de page. Les visuels promotionnels
et les publicités partenaires se gèrent dans **Bannières & promos** et
**Partenaires**. Les images sont téléversées dans le bucket `media` (ou collées
depuis une URL externe). Aucune intervention sur le code n'est nécessaire.

Les valeurs par défaut (issues du profil de l'entreprise) vivent dans
`src/lib/content.ts` et s'affichent tant qu'un contenu n'a pas été enregistré.

---

## Sécurité

- **RLS partout.** Chaque table est protégée ; la clé `anon` est publique par
  conception et c'est la RLS qui protège les données.
- **Prix privés.** `products` n'est pas exposé à `anon` ; la vitrine passe par des
  fonctions qui excluent prix et quantités.
- **Moindre privilège.** Les fonctions `SECURITY DEFINER` sont révoquées de
  `public` puis accordées explicitement (`anon` seulement pour la vitrine et
  l'envoi de devis).
- **Livres inviolables.** Les écritures comptables ne sont ni modifiées ni
  supprimées ; une erreur se corrige par une écriture inverse.
- **Secrets.** Aucune clé n'est committée. `SUPABASE_SERVICE_ROLE_KEY` ne sert
  que côté serveur (création d'employés).

---

## Structure du projet

```
src/
  app/
    (site)/          vitrine publique (accueil, catalogue, produit, devis, …)
    admin/           tableau de bord (produits, stock, ventes, achats,
                     devis, comptabilité, contenu, bannières, partenaires, équipe)
    api/admin/       routes serveur (création d'employés)
    login/           connexion du personnel
  components/
    ui/              kit d'interface (Button, Field, Table, Modal, Toast, …)
    site/            composants vitrine (header, footer, cartes produit, …)
    admin/           composants back-office (shell, formulaires, graphiques)
    brand/           logo, marque animée, écran de démarrage
    quote/           panier de devis
  lib/               types, clients Supabase, requêtes, contenu, utilitaires
supabase/
  migrations/        schéma SQL (0001 → 0008)
  apply_all.sql      bundle à coller dans Supabase
scripts/
  build-bundle.mjs   régénère apply_all.sql
```

---

© Fay & Partenaires — Ouagadougou, Burkina Faso.
