// Menu principal unifie des pages labo (espace de travail staging).
// Source de verite unique : modifier ce tableau se repercute sur les 5 pages labo
// qui passent ces liens a <SiteNav> (accueil, le-lieu, coliving, notre-histoire,
// newsletter). Le CTA "Candidater" reste cable page par page (navCta / ctaText).
// Pas de lien "Accueil" : le logo LAOM ramene a /accueil-labo (logoHref).
// Hors menu volontairement : /quiz-labo (lead magnet) et /liens-labo (hub bio).
export interface NavLink {
  label: string
  href: string
}

export const laboNav: NavLink[] = [
  { label: 'Le lieu', href: '/le-lieu/' },
  { label: 'Coliving entrepreneurs', href: '/coliving/' },
  { label: 'Moms & Kids', href: '/coliving-moms-kids/' },
  { label: 'Notre histoire', href: '/notre-histoire/' },
  { label: 'Newsletter', href: '/newsletter/' },
]

// Version anglaise du menu. Le lien FR / EN est ajouté automatiquement par SiteNav.
export const laboNavEn: NavLink[] = [
  { label: 'The place', href: '/en/le-lieu/' },
  { label: 'Entrepreneurs coliving', href: '/en/coliving/' },
  { label: 'Moms & Kids', href: '/en/coliving-moms-kids/' },
  { label: 'Our story', href: '/en/notre-histoire/' },
  { label: 'Newsletter', href: '/en/newsletter/' },
]
