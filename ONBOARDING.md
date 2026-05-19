# Onboarding — Site internet LAOM (pour Eduardo)

Bienvenue. Ce guide te rend **autonome pour coder le site laom.fr seul**, sans
casser la production. Lis-le en entier une fois, puis garde-le sous la main.
Une fois installé, la doc technique profonde est dans `AGENTS.md` (même dossier).

> Règle d'or : tu ne pousses **jamais** sur `main`. Tu travailles sur `staging`.
> Tant que tu respectes ça, tu ne peux pas casser le site en ligne.

---

## 1. C'est quoi le site LAOM ?

La landing page de LAOM, l'écolieu / coliving rural en Aveyron. Esthétique
"luxury wellness", minimale, nature. Bilingue **français (défaut)** + anglais
(`/en`). En production sur **https://laom.fr**, hébergé sur Cloudflare Workers.

## 2. Stack technique (ce que tu dois savoir)

| Brique | Techno | À retenir |
|--------|--------|-----------|
| Framework | **Astro 5+** | Pages dans `src/pages/`, composants dans `src/components/` |
| Styles | **Tailwind CSS 4** | Classes utilitaires dans les composants, global dans `src/styles/global.css` |
| Gestionnaire de paquets | **Bun** | **Toujours `bun`, jamais `npm`/`yarn`/`pnpm`** |
| Hébergement | **Cloudflare Workers** | Déploiement automatique au merge sur `main` |
| SEO | `seo-checker` | `bun run seo:check` doit passer avant chaque PR |
| i18n | Astro i18n | Traductions dans `src/i18n/translations.ts` |

## 3. Prérequis à installer (une seule fois)

1. **Bun** — `curl -fsSL https://bun.sh/install | bash` puis vérifier `bun --version`
2. **Git** — déjà présent sur Mac, sinon `xcode-select --install`
3. **Claude Code** — ton copilote pour coder le site (tu peux ouvrir ce guide dedans)
4. Un **accès en écriture au repo GitHub** `amandineorriols/laom-landing`
   → demande à Charly de t'inviter (rôle *Write*).

## 4. Récupérer le projet

```bash
git clone https://github.com/amandineorriols/laom-landing.git
cd laom-landing
bun install
```

### Secrets / variables d'environnement
Le projet a besoin d'un fichier `.dev.vars` (non versionné, contient des clés
privées). **Demande-le directement à Charly** — il ne doit jamais être partagé
par mail, Slack public, ni commité. Sans lui, le build local peut échouer sur
les parties dynamiques (tracking Meta, paiements Mollie).

## 5. Lancer et vérifier en local

```bash
bun run dev       # serveur local → http://localhost:4321
bun run build     # build de prod (doit passer sans erreur)
bun run seo:check # contrôle SEO (doit passer sans erreur)
```

`bun run build` **et** `bun run seo:check` sont obligatoires et doivent être
verts avant toute Pull Request. Si l'un échoue, tu corriges avant de proposer.

## 6. Le workflow git — LE point critique

```
ta branche feature  →  staging  →  (Pull Request)  →  Charly merge sur main  →  déploiement auto en prod
```

- **`main` = production.** Chaque merge sur `main` met le site en ligne. Tu n'y
  touches jamais.
- **`staging` = ton bac à sable.** Pousser sur `staging` ne déploie **rien**.
  Tu peux expérimenter librement.
- Concrètement, pour un nouveau chantier :

```bash
git checkout staging
git pull
git checkout -b feature/nom-court-du-sujet   # ex: feature/page-evenements
# ... tu codes, tu testes (bun run build && bun run seo:check) ...
git add -A
git commit -m "Description claire de ce que tu as fait"
git push -u origin feature/nom-court-du-sujet
```

- Puis ouvre une **Pull Request vers `staging`** sur GitHub (ou demande à
  Claude Code de la créer). Décris ce que tu as changé et pourquoi.
- Quand c'est prêt à partir en prod, **Charly** fait la PR `staging → main` et
  merge. C'est le seul à toucher `main`.

## 7. Règles absolues (à ne jamais enfreindre)

- **Bun uniquement** — jamais `npm`/`yarn`/`pnpm`.
- **Images en WebP** uniquement (sauf SVG et favicons), toujours avec un `alt`.
- **Slash final** sur tous les liens internes (`/blog/` et pas `/blog`).
- **`bun run build` + `bun run seo:check`** verts avant chaque PR.
- **FR + EN** : si tu ajoutes du texte, mets à jour les deux langues
  (`src/i18n/translations.ts`).
- **Jamais de secret dans le code** ni dans un commit.
- **Jamais de push direct sur `main`.**
- Les **newsletters (LAOM Letters)** n'apparaissent jamais sur la home — uniquement
  sur `/blog/`. (Détail exact dans `AGENTS.md` §9.)

## 8. Tâches courantes (où aller)

| Je veux… | Où | Détail dans AGENTS.md |
|----------|-----|----------------------|
| Modifier un texte | `src/i18n/translations.ts` (FR + EN) | §i18n |
| Ajouter une page | `src/pages/` (et `src/pages/en/` pour l'anglais) | §Common Tasks |
| Changer un visuel | `public/images/` (WebP) | §Image Guidelines |
| Ajuster le style | classes Tailwind dans le composant, ou `src/styles/global.css` | §Design System |
| Comprendre la charte | couleurs / typo / espacements | §Design System |

Pour tout le reste (charte graphique complète, règles SEO détaillées,
structure du projet, déploiement) → **`AGENTS.md`** à la racine du repo.

## 9. En cas de pépin

- **`bun` introuvable** → réinstalle : `curl -fsSL https://bun.sh/install | bash`
- **Build échoue** → `bun run astro check` pour voir les erreurs TypeScript ;
  vérifie que les traductions FR/EN sont complètes.
- **SEO check échoue** → `bun run seo:check:report`, lis le rapport, corrige
  (souvent : image non-WebP, `alt` manquant, slash final oublié).
- **Doute sur l'impact d'un changement** → reste sur `staging`, ouvre la PR,
  demande à Charly avant que ça parte en prod.

## 10. Qui demander

- **Charly Aubert** — accès repo, secrets `.dev.vars`, validation/merge vers
  prod, toute question produit ou priorité. orion.aubert@gmail.com

---

*Dernière mise à jour : 2026-05-19. Maintenu par Charly. Si une étape ne
marche plus, signale-le pour qu'on corrige ce guide.*
