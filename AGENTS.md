# LAOM Landing Page - Agent Documentation

> ## 🎨 DA 2026 — DESIGN SYSTEM (à lire en premier)
>
> La direction artistique a changé (charte officielle Lucas Provost, juin 2026). Les sections « Design References / Design System » plus bas sont **PÉRIMÉES** (ancienne identité luxury-wellness, palette noir/vert/or, system fonts). Sources de vérité du design :
> - **`DESIGN.md`** — la charte complète (couleurs, typo, logo, formes, photos, formulaires, catalogue de composants, anti-slop).
> - **`/styleguide`** (+ `/ds2`, `/styleguide/labo`) — la doc **vivante** : éléments, sections et gabarits rendus en vrai. À ouvrir AVANT de créer une page.
>
> ### Stack
> Astro 5 · Tailwind CSS 4 · Bun · Cloudflare Workers. Dev : `bun run dev`. Build : `bun run build` (= `wrangler types && astro check && astro build`).
>
> ### Le design system (`src/components/laom/`)
> - **Tokens** (`src/styles/global.css`) : beige `#F2EBDB` · terre `#9A3922` · terre clair `#CB7A5C` (accent sur fond sombre) · vert `#73673E` · marron `#412F1F` · noir `#1D1B18` · crème `#FBF6EA`. Typo **Host Grotesk** partout (Extrabold titres / Medium Italic accents / Regular corps). Logo = **SVG officiel** (`graphics/logo-laom.svg`, composant `<Logo/>`), **jamais** une police.
> - **Éléments** : `Logo · Eyebrow · SectionHeading · Pill · StatGlass · MediaCard · ActivityCard · NumberedCard · FeatureItem · TeamCard · Testimonial · BlogCard · PopularList`.
> - **Sections** (`/sections/`) : `HeroLeader · StatsBand · AboutCards · MissionSection · MissionShowcase · HabitatsSection · ActivitiesSection · TeamSection · TestimonialsSection · FeaturesSection · BlogSection · EventList · CtaSection · ArticleBody` (+ `BookingForm · SiteFooter · PageHeader · LogoStrip`).
> - **Graphics** (`/graphics/`) : `TopoBg` (textures topo/terre), `Sprig` (botanique), `Parallax` (photo au scroll).
> - **Deux skins** : **DS1 (arrondi) = le design validé et actif** — c'est lui qu'on utilise. DS2 (angles droits / élégant, via `.ds-square`) = exploration **non validée**, gardée comme option. Switcher dans la barre du styleguide.
>
> ### Créer une nouvelle page
> 1. Ouvre `/styleguide` et repère les sections qui conviennent.
> 2. `src/pages/ma-page.astro` : importe `Layout` + les sections de `laom/sections/`, passe les props (titres, items, photos). **On assemble des composants, on n'écrit pas de markup ad hoc.**
> 3. Couleurs uniquement depuis la charte. Photos en **webp** dans `public/images/`. Pas de blanc pur (utiliser crème). Pas de hotlink externe.
>
> ### Déploiement ⚠️
> - Push **`staging`** → **staging.laom.fr** (préprod, noindex). Push **`main`** → **laom.fr** (PROD, branche protégée, CODEOWNERS = Charly).
> - Le CI lance **`astro check`** : **toute erreur TypeScript bloque le déploiement**. Lance `bunx astro check` (0 erreur) AVANT de pousser.
> - Toujours bosser sur une branche → PR. Vérifier la divergence des branches avant de merger. **Jamais de push `main` sans feu vert de Charly.**

## Project Overview

LAOM is a beautiful, multilingual landing page for a rural coliving space located in the south of Aveyron, France. The project is inspired by luxury wellness brands like Our Habitas (Tulum) and The House of AïA, featuring a minimal, elegant aesthetic with a focus on nature, wellness, and mindful living.

### Content Source
For context, inspiration, and content assets, ask Charly for the relevant
LAOM material. Content assets (photos, copy, brand) live in the LAOM "casquette"
vault, not in this repo. Do not hardcode anyone's local machine path here.

### New here? Read ONBOARDING.md first
If you are a new collaborator (e.g. Eduardo), start with `ONBOARDING.md` at the
repo root. It walks you through setup, the git workflow, and how to ship safely
without breaking production. This file (`AGENTS.md`) is the deep technical
reference you come back to once you're set up.

### What is LAOM?

LAOM is a rural coliving space that offers:
- Mountain houses with "offices" and gardens
- A place to stay and work on projects
- Community of curious people
- Homemade food and supportive ambiance
- 21 hectares of forest, river, and meadow
- Cozy rooms, shared kitchen with open-source recipes
- Creative workspaces (wooden desks, sunny sofas, tipis, flower-filled nooks)

The website serves as the digital presence for this unique ecolieu (eco-place) where nature, creation, and collective life intertwine.

## Technology Stack

- **Framework**: [Astro](https://astro.build/) v5.16+
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) v4.1+
- **Package Manager**: [Bun](https://bun.sh/) (required)
- **Deployment**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **SEO**: @capgo/seo-checker (same system as Nomad Magazine)
- **Language**: French (default) and English support via Astro i18n

## Installation

### Prerequisites

1. **Bun** must be installed on your system
   - Installation: https://bun.sh/
   - Verify installation: `bun --version`

### Install Dependencies

```bash
bun install
```

This will install all required dependencies including:
- Astro and its plugins
- Tailwind CSS
- Cloudflare Workers adapter
- SEO checker tools
- Development dependencies

## Running the Project

### Development Server

**Option 1: Command Line**
```bash
bun run dev
```

**Option 2: VS Code/Cursor Tasks**
1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type "Tasks: Run Task"
3. Select "bun: dev"

**Option 3: NPM Scripts Panel**
- Open the "NPM Scripts" panel in the sidebar
- Click on "dev"

The development server will start at `http://localhost:4321`

### Build for Production

```bash
bun run build
```

### Preview Production Build

```bash
bun run preview
```

### SEO Checking

```bash
# Check SEO compliance
bun run seo:check

# Generate detailed report
bun run seo:check:report
```

## Design References and Inspiration

> 🚫 **PÉRIMÉ (DA 2025).** Cette section et le « Design System » qui suit décrivent l'ancienne identité. Pour tout choix visuel, voir le bloc « DA 2026 » en haut + `DESIGN.md` + `/styleguide`.

### Design Philosophy

The LAOM landing page is designed with a **luxury wellness aesthetic** inspired by high-end wellness retreats and eco-lodges. The design emphasizes:

- **Minimal elegance**: Clean, uncluttered layouts with generous white space
- **Nature connection**: Earthy tones, organic shapes, and natural imagery
- **Sophisticated typography**: Light weights, generous tracking, elegant hierarchy
- **Immersive experiences**: Full-screen hero sections, beautiful photography
- **Thoughtful interactions**: Smooth animations, subtle hover effects

### Primary Design References

#### 1. Our Habitas Tulum
**URL**: https://www.ourhabitas.com/tulum/

**Key Design Elements**:
- Large hero section with location tag and immersive background
- Minimal navigation with transparent/backdrop blur header
- Typography: Light, elegant sans-serif with generous spacing
- Color palette: Natural greens, whites, blacks with subtle gradients
- Section layout: Generous padding, centered content, clear hierarchy
- Button style: Minimal borders, uppercase text, subtle hover effects
- Image treatment: Full-width immersive images with overlay gradients
- Content sections: Clear separation, elegant cards, community focus

**Design Patterns to Implement**:
- Hero: Large typography, location subtitle, CTA buttons
- Navigation: Fixed header with backdrop blur, minimal menu items
- Sections: Room/experience cards with images and descriptions
- Footer: Dark background with organized links and social proof

#### 2. The House of AïA
**URL**: https://thehouseofaia.com/

**Key Design Elements**:
- Welcoming hero with large text overlay
- Serene, calming color palette
- Emphasis on wellness and sanctuary
- Elegant form design
- Smooth scroll animations

**Design Patterns to Implement**:
- Hero messaging focused on sanctuary/soul
- Wellness-focused imagery
- Calming color transitions

#### 3. Current LAOM Website
**URL**: https://www.laom.fr/

**Key Content Elements**:
- **Tagline**: "LAOM is a rural coliving in sud of Aveyron in France"
- **Description**: "Mountain houses with 'offices' and gardens where you can stay and work on your project. Enjoy the company of curious people, homemade food, and supportive ambiance."
- **Features**:
  - 21 hectares of forest, river, and meadow
  - Cozy rooms
  - Shared kitchen with homemade open-source recipes
  - Creative workspaces (wooden desks, sunny sofas, tipis, flower-filled nooks)
- **Community**: Dancers, permaculturists, eco hackers, therapists, makers, coaches
- **Location**: Natural Park access, trails, rivers, climbing, nature immersion
- **Events**: Upcoming events section
- **Contact**: Aubert Charly (orion.aubert@gmail.com, 06.73.68.35.73)

**Visual Elements to Extract**:
- Natural, rustic imagery
- Mountain/rural setting photography
- Community and workspace photos
- Forest and nature backgrounds
- Event imagery

### Design System

#### Typography
- **Headings**: Light weight (300-400), generous tracking (0.02em - 0.05em)
- **Body**: Regular weight (400), comfortable line-height (1.6-1.8)
- **Font families**: System fonts (San Francisco, Helvetica, Arial) for performance
- **Scale**: Responsive, fluid typography from mobile to desktop

#### Color Palette
- **Primary**: `#1a1a1a` (Almost black)
- **Secondary**: `#2d5016` (Forest green - nature connection)
- **Accent**: `#d4af37` (Warm gold - luxury touch, optional)
- **Background**: `#fafafa` (Off-white, warm)
- **Text**: `#1a1a1a` on light, `#ffffff` on dark
- **Overlays**: Black with opacity (30-50%) for text readability

#### Spacing
- **Section padding**: `py-24` (6rem vertical) on desktop, `py-16` on mobile
- **Container max-width**: `max-w-7xl` (80rem) for content sections
- **Grid gaps**: `gap-12` (3rem) for grid layouts
- **Component spacing**: Consistent 4px base unit

#### Component Styles

**Hero Section**:
- Full viewport height (`min-h-screen`)
- Centered content with max-width constraint
- Background image with gradient overlay
- Large typography (5xl to 8xl for title)
- CTA buttons: Primary (white bg) and secondary (outlined)

**Navigation**:
- Fixed position with backdrop blur
- Light background with transparency (`bg-white/80`)
- Minimal border bottom
- Hover states with opacity transitions

**Cards/Sections**:
- Generous padding
- Subtle background colors or borders
- Image overlays with text
- Hover effects: subtle scale or opacity changes

**Buttons**:
- Uppercase text with letter-spacing
- Minimal borders or solid backgrounds
- Smooth transitions (300ms)
- Focus states for accessibility

#### Animation Principles
- **Fade in up**: Content appears with slight upward motion
- **Intersection Observer**: Trigger animations on scroll
- **Hover effects**: Subtle, not distracting
- **Transitions**: 300ms duration, ease-out timing
- **Reduce motion**: Respect user preferences

### Image Guidelines

**Hero Image Requirements**:
- Format: WebP only (except SVGs/favicons)
- Resolution: Minimum 1920x1080px (Full HD)
- Aspect ratio: 16:9 or wider (landscape)
- Content: Natural scenery, LAOM property, community activities
- Location: `/public/images/hero-bg.webp`

**Section Images**:
- Format: WebP only (except SVGs/favicons)
- Resolution: 1200px width for full-width, 800px for cards
- Aspect ratio: Match design needs (16:9, 4:3, square)
- Alt text: Always include descriptive alt text for SEO

**Recommended Image Sources**:
1. LAOM property photos (mountain houses, gardens, workspaces)
2. Natural surroundings (forest, river, meadows)
3. Community activities (workshops, meals, events)
4. Workspace details (desks, tipis, cozy nooks)
5. Events and gatherings

### Implementation Notes

- All design decisions should maintain the **luxury wellness aesthetic**
- Prioritize **performance**: Optimize images, lazy loading
- Ensure **accessibility**: Proper contrast ratios, focus states
- Maintain **responsiveness**: Mobile-first approach
- Keep **SEO in mind**: Semantic HTML, proper heading hierarchy

## Project Rules and Guidelines

### 1. Package Manager
- **ALWAYS use Bun** - Never use npm, yarn, or pnpm
- All scripts in package.json are configured for Bun
- CI/CD pipelines use Bun

### 2. Language Preferences
- **French is the default language** (`fr`)
- English is available at `/en`
- Always ensure translations exist for both languages
- Default locale is configured as `fr` in `astro.config.mjs`
- SEO checker configured for both `fr` and `en`

### 3. Code Style
- Use Tailwind CSS for all styling
- Follow the existing component structure in `src/components/`
- Maintain the luxury wellness aesthetic
- Use French comments when appropriate (French is default)

### 4. Design Principles
- **Minimal and elegant** - Inspired by Our Habitas and The House of AïA
- **Nature-focused** - Emphasize the connection to nature
- **Luxury wellness aesthetic** - Clean, sophisticated, calming
- **Responsive design** - Must work on all devices
- **Performance-first** - Optimize for speed and SEO

### 5. SEO Rules (Nomad Magazine)

#### URL and Link Conventions
- **Always** end all internal links with a trailing slash (`/`)
- Apply to navigation, anchors, canonical URLs, sitemap entries, and JSON-LD URLs
- Use clean, descriptive URLs with hyphens; avoid underscores and special characters

#### Image Format Requirements
- **All images must be WebP** (`.webp`) except SVGs and favicons
- Convert non-WebP images when possible; otherwise report the need
- Always include descriptive `alt` text (keywords when natural)
- Decorative images must use `alt=""` and `aria-hidden="true"`

#### SEO Metadata Best Practices
- **Title tags**: 50-60 characters, keyword near the beginning, unique per page
- **Meta descriptions**: 150-160 characters, compelling, keyword-rich, unique
- **Keywords**: include relevant terms naturally (no stuffing)
- **Open Graph**: full set (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:locale`, `og:site_name`)
- **Twitter cards**: use `name` attribute (not `property`) and include `twitter:image:alt`

#### Structured Data (JSON-LD)
- Use JSON-LD on every page with required fields: `@context`, `@type`, `name`, `description`, `url`
- All URLs in JSON-LD must end with trailing slashes
- Add `publisher` / `provider` when applicable

#### Content Structure and Headings
- One H1 per page; never skip heading levels
- Use semantic HTML (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`)
- Use descriptive headings with natural keywords

#### Accessibility (WCAG)
- Add `aria-hidden="true"` to decorative SVGs
- Add `aria-label` to icon-only buttons and forms without visible labels
- External links must use `rel="noopener noreferrer"` and note "opens in new tab" in `aria-label`
- Include a "Skip to main content" link; wrap main content in `<main id="main-content">`
- Use `focus-visible:ring` for focus styles (avoid `outline-none`)

#### Performance and Mobile
- Mobile-first responsive design
- Optimize Core Web Vitals (LCP, FID, CLS)
- Lazy-load below-the-fold images

#### Technical SEO
- Always include canonical URLs with trailing slashes
- Use `index, follow` unless a page should be excluded
- Keep sitemap updated and clean

#### Mandatory CLI Validation
- **After any page/content or metadata change**:
  1. `bun run build`
  2. `bun run seo:check`

### 6. Component Structure
- Components in `src/components/`
- Layouts in `src/layouts/`
- Pages in `src/pages/` (follow Astro i18n routing)
- Translations in `src/i18n/translations.ts`
- Utilities in `src/utils/`

### 7. Deployment
- Deploy to Cloudflare Workers
- Use GitHub Actions for automatic deployment
- Never commit sensitive data (use GitHub Secrets)
- Always run SEO check before deployment

### 7b. Git Workflow & Team Access (READ THIS)

- **Repo**: `github.com/stellahq/laom-landing` (org: stellahq)
- **`main` is production.** Any push to `main` auto-deploys to production
  (`laom.fr`) via GitHub Actions. Never push directly to `main`.
- **`staging` is the working branch.** Eduardo and other collaborators commit
  to `staging` (or a feature branch off `staging`), then open a Pull Request.
  Pushing to `staging` auto-deploys a **separate** worker (`laom-staging`) to
  **https://staging.laom.fr** for review. It never touches production.
  Staging is served with `X-Robots-Tag: noindex` (see `src/middleware.ts`) so
  it is not indexed by search engines.
  Config: `wrangler.staging.jsonc` + `.github/workflows/deploy-staging.yml`.
  Caveat: staging shares the prod D1 database (`laom-team`).
- **Charly reviews and merges** the PR into `main`. Merging into `main` is the
  single act that ships to production.
- Branch model: `feature/* → staging → (PR) → main → auto-deploy`.
- Before every PR: `bun run build` **and** `bun run seo:check` must pass.
- Note: `main` should be protected on GitHub (no direct push, no force-push).

### 7c. Garde-fous obligatoires AVANT tout merge / action prod (NE PAS SAUTER)

Règle de fond : **ne jamais qualifier un merge ou un push de "safe" sur intuition.**
Lire l'état réel d'abord, annoncer l'impact concret, puis demander le feu vert.

1. **Pré-vol divergence** — avant de proposer/ouvrir une PR `staging → main`, lancer
   et lire :
   - `git fetch origin main staging`
   - `git log --oneline origin/main..origin/staging` (ce que le merge AMÈNE)
   - `git log --oneline origin/staging..origin/main` (de combien staging est EN RETARD)
   - `git diff --diff-filter=D --name-only origin/main origin/staging` (ce que ça
     SUPPRIME/écrase en prod)
   - `git merge-base origin/main origin/staging` (depuis quand les branches ont divergé)
   Si staging est en retard de plusieurs commits sur main → **danger de régression
   prod** : resynchroniser staging sur main AVANT toute PR. Ne pas merger.
2. **Hygiène staging** — `staging` doit toujours partir d'un `main` à jour. Avant de
   commencer un chantier : `git checkout staging && git merge origin/main`. Une staging
   qui dérive de main est une bombe à retard (régression silencieuse en prod au merge).
3. **Action prod = feu vert humain.** Tout merge sur `main` (= mise en ligne) : annoncer
   l'impact concret (fichiers/contenu/code touché) et attendre l'accord explicite de
   Charly. En cas de doute → poser la question AVANT d'agir, jamais après.
  Only Amandine (repo admin) can enable that — ask her if it's not yet set.

### 8. Development Server
- **NEVER run the development server** (`bun run dev`) - The server is already running when the project starts
- You can test if the project is working or building (`bun run build`), but do not start the dev server
- The user manages the server lifecycle themselves

### 9. Newsletter / LAOM Letter Content Rule
- **LAOM Letters (newsletters) must NEVER appear on the homepage** — neither FR (`/`) nor EN (`/en`).
- On the homepage, always filter out posts tagged `"newsletter"` from the blog query: `.filter(post => !post.data.tags?.includes('newsletter'))`.
- LAOM Letters are **only visible on the `/blog/` page**, in the dedicated "Newsletters passées" archive section (rendered from the `newsletters` YAML data collection).
- When creating a new LAOM Letter:
  1. Add the `.md` file in `src/content/blog/` with `tags: ["newsletter", ...]` in frontmatter.
  2. Add the corresponding `.yaml` metadata in `src/content/newsletters/`.
  3. **Verify** the letter does NOT appear on the homepage.
- This rule applies to both FR and EN versions of the site.

## Project Structure

```
laom-landing/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD
├── .vscode/                    # VS Code/Cursor configuration
│   ├── launch.json            # Debug configuration
│   ├── settings.json          # Editor settings
│   └── tasks.json             # Task runner configuration
├── public/
│   ├── images/                # Static images
│   └── robots.txt             # SEO robots file
├── src/
│   ├── components/            # Astro components
│   │   ├── Header.astro      # Navigation header
│   │   ├── Hero.astro        # Hero section
│   │   └── Footer.astro      # Footer
│   ├── i18n/                 # Internationalization
│   │   ├── translations.ts   # Translation strings
│   │   └── utils.ts          # i18n utilities
│   ├── layouts/              # Page layouts
│   │   └── Layout.astro      # Base layout
│   ├── pages/                # Page routes
│   │   ├── index.astro       # French homepage (/)
│   │   └── en/
│   │       └── index.astro   # English homepage (/en)
│   ├── styles/               # Global styles
│   │   └── global.css        # Tailwind and custom styles
│   └── utils/                # Utilities
│       └── schema.ts         # JSON-LD schema helpers
├── .gitignore                # Git ignore rules
├── .prettierrc               # Prettier configuration
├── AGENTS.md                 # This file
├── CLAUDE.md                  # Quick reference
├── astro.config.mjs          # Astro configuration
├── package.json              # Dependencies and scripts
├── seo-checker.config.json   # SEO checker configuration
├── tsconfig.json             # TypeScript configuration
└── wrangler.jsonc            # Cloudflare Workers config
```

## Internationalization (i18n)

### Supported Languages
- **French (fr)**: Default language, available at `/`
- **English (en)**: Available at `/en`

### Adding Translations

Edit `src/i18n/translations.ts` to add or modify translations. The structure is:

```typescript
export const translations = {
  fr: {
    // French translations
  },
  en: {
    // English translations
  }
}
```

### Using Translations in Components

```astro
---
import { getTranslations } from '~/i18n/utils'

const lang = Astro.currentLocale || 'fr'
const t = getTranslations(lang)
---

<h1>{t.hero.title}</h1>
```

### Language Switcher

The header includes a language switcher that automatically handles routing between languages.

## SEO Configuration

### SEO Checker
This project uses the same SEO checker system as the [Nomad Magazine](https://github.com/Nomad-Magazine/website) project:
- Configuration in `seo-checker.config.json`
- Supports both French and English
- Integrated into CI/CD pipeline
- Same rules and best practices

### Key SEO Features
- Automatic sitemap generation
- Structured data (JSON-LD)
- Open Graph tags
- Twitter Card support (use `name` attribute)
- Proper hreflang tags
- Meta descriptions and titles
- Canonical URLs with trailing slashes

## Deployment

### Cloudflare Workers Setup

1. **Configure `wrangler.jsonc`**:
   - Set your Cloudflare account ID
   - Configure routes if using custom domain
   - Set `workers_dev: false` for production

2. **GitHub Secrets Required**:
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

3. **Automatic Deployment**:
   - Push to `main` branch
   - GitHub Actions automatically builds and deploys
   - SEO check runs before deployment

### Manual Deployment

```bash
bunx wrangler deploy
```

Make sure you have the required environment variables set.

## Reference: Nomad Magazine Project

This project is based on the structure and best practices from the [Nomad Magazine website repository](https://github.com/Nomad-Magazine/website):

### Similarities
- **SEO System**: Same SEO checker configuration and rules
- **Astro Setup**: Similar Astro configuration with Cloudflare adapter
- **Deployment**: Same GitHub Actions workflow pattern
- **Sitemap**: Similar sitemap generation with lastmod dates
- **Code Quality**: Similar linting and formatting setup

### Differences
- **Package Manager**: This project uses Bun (Nomad uses Bun too)
- **Content**: This is a landing page (Nomad is a magazine/blog)
- **i18n**: This project has French as default (Nomad uses English)
- **Design**: Tailored for LAOM's wellness/rural coliving brand

## Development Workflow

1. **Start Development**:
   ```bash
   bun run dev
   ```

2. **Make Changes**:
   - Edit components, pages, or translations
   - Changes hot-reload automatically

3. **Check SEO**:
   ```bash
   bun run seo:check
   ```

4. **Build Locally**:
   ```bash
   bun run build
   ```

5. **Preview Build**:
   ```bash
   bun run preview
   ```

6. **Commit and Push**:
   - Changes to `main` trigger automatic deployment
   - SEO check runs in CI/CD

## Common Tasks

### Adding a New Page

1. Create file in `src/pages/` (or `src/pages/en/` for English-only)
2. Use the Layout component
3. Add translations if needed
4. Add to navigation if necessary

### Modifying Translations

1. Edit `src/i18n/translations.ts`
2. Add new translation keys following the existing structure
3. Use translations in components via `getTranslations()`

### Adding Images

1. Place images in `public/images/`
2. Reference as `/images/filename.webp` in components
3. Always include alt text for SEO

### Customizing Styles

1. Edit `src/styles/global.css` for global styles
2. Use Tailwind classes directly in components
3. Follow the existing design system

## Troubleshooting

### Port Already in Use
If port 4321 is taken:
- The dev server will automatically try the next available port
- Check the terminal output for the actual port

### Bun Not Found
Make sure Bun is installed:
```bash
curl -fsSL https://bun.sh/install | bash
```

### SEO Check Failing
- Run `bun run seo:check:report` for details
- Fix issues according to the report
- Check that all images are WebP and have alt text
- Verify meta tags are present and URL slashes are correct

### Build Errors
- Run `bun run astro check` to see TypeScript errors
- Ensure all dependencies are installed: `bun install`
- Check that all translations are complete

## Additional Resources

- [Astro Documentation](https://docs.astro.build/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Bun Documentation](https://bun.sh/docs)

## Notes for AI Agents

When working on this project:
1. **Always use Bun** - Never suggest npm/yarn commands
2. **French is default** - When adding content, prioritize French
3. **Maintain aesthetic** - Keep the minimal, luxury wellness feel
4. **SEO matters** - Always consider SEO implications
5. **Check translations** - Ensure both FR and EN are updated
6. **Follow structure** - Use existing component patterns
7. **Reference Nomad** - Look at that project for patterns when needed
8. **Never run the server** - The development server is already running; you can test builds but do not start the dev server

## Contact & Support

For questions about LAOM:
- Email: orion.aubert@gmail.com
- Phone: 06.73.68.35.73
- Development Manager: Aubert Charly

---

**Last Updated**: 2026-05-19
**Project Status**: Active Development
