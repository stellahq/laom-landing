# DESIGN.md — Design System LAOM

Source de vérité visuelle du site laom.fr. Toute page/section se construit **à partir des composants** de `src/components/laom/`. Voir le rendu vivant sur **`/styleguide`**.

> Charte officielle : Lucas Provost. Assets : Drive « Direction Artistique » (logo SVG, fonts, brandboard PDF).

---

## 1. Couleurs (tokens)

Définis en CSS vars dans `src/styles/global.css` (`:root`).

| Rôle | Token | Hex | Usage |
|------|-------|-----|-------|
| Beige | `--color-beige` | `#F2EBDB` | Fond principal |
| Terre | `--color-terre` | `#9A3922` | Accent : CTA, liens, logo, cercles d’action, mot accentué (italique) |
| Terre clair | — | `#CB7A5C` | **Accent sur fond sombre** (marron/photo) où la terre serait illisible. Classes `.acc-light`, `.eyebrow--light` |
| Vert | `--color-vert` | `#73673E` | Secondaire, eyebrows sur fond clair |
| Marron | `--color-marron` | `#412F1F` | Titres + panneaux/sections sombres |
| Noir | `--color-noir` | `#1D1B18` | Texte courant |
| Crème | `--color-creme` | `#FBF6EA` | Sections alternées / cartes |

**Règle de contraste** : texte courant ≥ 4.5:1. Sur marron/photo → texte beige, accent terre clair (jamais terre foncée). Pas de gris délavé.

**Rythme des sections** : alterner les aplats pleine largeur — `beige → crème → terre → marron`. Jamais 2 sections identiques qui se suivent. Deux bandes fortes max par page (une terre, une marron).

---

## 2. Typographie

- **Host Grotesk** partout. Chargée via Google Fonts (`Layout.astro`).
  - **Extrabold (800)** → titres (H1/H2). Classe utilitaire : `font-extrabold`.
  - **Medium Italic (500 italic)** → sous-titres et **mots accentués** (`.acc` terre / `.acc-light` terre clair).
  - **Regular (400)** → corps, descriptions.
- **Fraunces (serif)** → **uniquement le logo / wordmark `LAOM`** (`.font-logo`). Jamais pour du texte courant ou des titres.
- Échelle titres : `clamp` plafonné à ~6rem. Letter-spacing titres `-0.02em`/`-0.03em`. `text-balance` sur H1–H3.
- Longueur de ligne corps : 65–75 caractères max.

> Détail technique : les couleurs de titres par défaut sont dans `@layer base` pour que les utilitaires `text-[...]` gardent la priorité.

---

## 3. Logo

- Wordmark serif terre. Header sur fond clair → terre `#9A3922`. Header transparent sur photo → beige `#F2EBDB`.
- Footer / wordmark géant → serif, terre ou beige selon le fond.
- Fichiers officiels : `public/brand/` (SVG principal + secondaire + favicon). Préférer le **SVG** au texte quand dispo.

---

## 4. Formes & motion

- **Rayons** : `rounded-2xl` (média, cartes), `rounded-3xl` (gros blocs/cartes verre), `rounded-full` (pills, cercles), `rounded-[2rem]` (bannières, footer).
- **Pills** : tous les boutons sont arrondis (`.pill` + `.pill-primary|light|outline`).
- **Cercle d’action** : `.circle-btn` (flèche ↗ terre) sur les cartes média.
- **Motion** : `.lift` (survol cartes), `.imgzoom` (zoom image au survol). Ease-out, pas de bounce. `prefers-reduced-motion` géré globalement. Pas d’apparition qui masque le contenu par défaut.

---

## 5. Photos

- **Vraies photos du lieu/communauté** (jamais de stock). Optimisées en **webp** dans `public/images/`.
- Ratios : héros plein écran ; cartes habitat/activité `4/5` ; blog `16/11` ; bannières `16/6`–`16/7`.
- Overlays texte : dégradé `from-[#1D1B18]/85` (hero) ou `bg-[#412F1F]/70` (page header / form). Toujours vérifier la lisibilité du texte par-dessus.
- Verre (`.glass`, `.glass-dark`) **uniquement** sur photo/fond sombre, avec parcimonie.

---

## 6. Formulaires

- Champs : fond beige, `rounded-xl`, focus ring terre. Labels beige sur fond sombre. Astérisque terre pour requis.
- Bouton d’envoi : `.pill-primary` pleine largeur.
- **Branchement** : la newsletter (email seul) → Kit. Les formulaires multi-champs (réservation/contact) → **Worker Cloudflare + Resend** (jamais Kit, qui ne garde que l’email). Définir `action` du `<form>` ; non branché par défaut.

---

## 7. Catalogue des composants (`src/components/laom/`)

| Composant | Rôle |
|-----------|------|
| `SiteNav` | Nav (transparent sur hero / solide sinon) |
| `Hero` | Ouverture : photo + titre/accent + CTA + slot `aside` (stats/avatars) |
| `Eyebrow` | Label de section (vert / clair) |
| `SectionHeading` | Titre H1–H3 + mot accentué italique |
| `Pill` | Bouton (primary/light/outline, flèche option) |
| `StatGlass` | Chiffre clé en verre |
| `MediaCard` | Carte photo + encart verre + flèche (habitats/lieux) |
| `ActivityCard` | Carte photo + dégradé + flèche haut + label bas |
| `NumberedCard` | Carte numérotée 01–04 (séquence réelle uniquement) |
| `FeatureItem` | Bénéfice icône + titre + texte |
| `TeamCard` | Portrait + nom + rôle |
| `Testimonial` | Avis + avatar |
| `BlogCard` | Vignette article |
| `PopularList` | Carte marron « les plus lus » |
| `LogoStrip` | Bandeau partenaires / presse |
| `CtaBanner` | Bannière photo + boutons + carte à puces |
| `BookingForm` | Section réservation (form verre + texte/image) |
| `SiteFooter` | Footer arrondi marron |
| `PageHeader` | En-tête de page intérieure |
| `StickyCta` | Barre CTA fixe en bas (mobile) — « Candidater ». `static` pour la démo |

---

## 8. Anti-slop (à éviter)

- Pas de **gradient text**, pas de **border latérale colorée** comme accent.
- **Eyebrow & cartes numérotées** : font partie de cette DA, mais ne pas en abuser — un eyebrow par section max, numéros seulement pour une vraie séquence.
- Verre = ponctuel, jamais décoratif partout.
- Tester chaque titre à tous les breakpoints (pas de débordement).
