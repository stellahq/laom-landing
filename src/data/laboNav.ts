// Menu principal unifie des pages labo (espace de travail staging).
// Source de verite unique : modifier ce tableau se repercute sur les 5 pages labo
// qui passent ces liens a <SiteNav> (accueil, le-lieu, coliving, notre-histoire,
// newsletter). Le CTA "Candidater" reste cable page par page (navCta / ctaText).
// Hors menu volontairement : /quiz-labo (lead magnet) et /liens-labo (hub bio).
export interface NavLink {
  label: string
  href: string
}

export const laboNav: NavLink[] = [
  { label: 'Accueil', href: '/accueil-labo/' },
  { label: 'Le lieu', href: '/le-lieu-labo/' },
  { label: 'Coliving', href: '/coliving-labo/' },
  { label: 'Notre histoire', href: '/notre-histoire-labo/' },
  { label: 'Newsletter', href: '/newsletter-labo/' },
]
