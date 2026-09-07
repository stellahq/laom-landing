// Montage financier La Margue — Est & Ouest, état au 3 septembre 2026.
// SOURCE DE VÉRITÉ des chiffres affichés sur /la-margue-est, /la-margue-ouest
// et /la-margue-notice. Les pages ne contiennent aucun montant en dur : tout
// vient d'ici. Origine des données : classeur « Montage financier La Margue
// 02092026 » et classeur « Oasis La Margue » de Greg (Drive de Charly).
//
// Certains totaux présentent 1 centime d'écart avec la somme des lignes
// (arrondis du classeur) : on affiche les totaux du classeur, jamais une somme
// recalculée, pour rester aligné avec les actes de la notaire.

import noticeRaw from './la-margue-notice.json'

const nf = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Formate un montant en euros, format fr-FR, 2 décimales. */
export function eur(n: number): string {
  return `${nf.format(n)} €`
}

/** Formate une surface, format fr-FR, 2 décimales (« 50,45 m² »). */
export function m2(n: number): string {
  return `${nf.format(n)} m²`
}

/** Formate une surface sans décimale inutile (« 60 m² », « 67,6 m² »). */
export function m2Court(n: number): string {
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m²`
}

/** Formate un coefficient (0,04 · 0,5 · 1 · 5). */
export function coef(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

export const updatedLabel = '3 septembre 2026'

/** Version du modèle, affichée en tête de chaque fiche. */
export const VERSION = '4'

/** Date et moment de la dernière mise à jour du modèle. */
export const UPDATED = '3 septembre 2026, soir'

// ============================================================
// TYPES
// ============================================================

export interface KeyFigure {
  value: string
  label: string
}

export interface Ligne {
  label: string
  montant: number
}

/**
 * Un lot à construire porté par un foyer de l'Est : un droit de construire
 * délimité et sa quote-part de parties communes (loi ELAN), hors clé
 * historique des quotes-parts. Les lots 8 à 12 de Patricia.
 */
export interface LotAConstruire {
  lot: string
  /** Ce qui sera bâti : logement à l'année, petit logement touristique. */
  nature: string
  /** Part de l'apport ventilé sur ce lot : 1 ou 0,5. */
  part: number
  capital: number
}

export interface FoyerEst {
  foyer: string
  lot: string
  /** Surface du modèle de valorisation, en m². */
  surfaceModele: number
  /** Précision sur la surface du modèle, affichée en petit dans la carte. */
  surfaceModeleNote?: string
  /** Surface mesurée au DPE, en m². */
  surfaceDpe: number
  /** Valeur conventionnelle du classeur (pas une multiplication recalculée). */
  valeurConventionnelle: number
  capital: number
  /** Capital du seul lot bâti, quand le foyer en porte un second (Magali). */
  capitalLot?: number
  /** Ce qui s'ajoute au lot bâti, en petit sous le capital retenu de la carte. */
  capitalEnPlus?: string
  /** Les lots à construire portés par le foyer, détaillés dans sa carte. */
  lotsAConstruire?: LotAConstruire[]
  /** Sous-ligne du tableau récapitulatif, colonne Capital. */
  capitalNote?: string
  /** L'unique phrase de la carte, quand elle est indispensable. */
  capitalCommentaire?: string
  fraisAnnexes: number
  fraisAnnexesDetail: Ligne[]
  total: number
  /** Sous-ligne du tableau récapitulatif, colonne Total à prévoir. */
  totalNote?: string
  /** Mention sous « Total à prévoir », dans la carte du foyer. */
  totalDetail?: string
  partCapital: string
  /** Noms du foyer tels qu'ils apparaissent dans les flux des deux phases. */
  alias: string[]
}

export interface Sortant {
  nom: string
  montant: number
}

export interface Flux {
  payeur: string
  beneficiaire: string
  montant: number
  note?: string
}

export interface Phase {
  titre: string
  total: number
  flux: Flux[]
  recus?: Sortant[]
  note: string
}

export interface Variante {
  cle: string
  titre: string
  /** Trois lignes au maximum, une idée par ligne. */
  points: string[]
}

export interface Notion {
  titre: string
  texte: string
}

/** Carte de lexique : une phrase avec un chiffre clé en gras, puis le contexte. */
export interface NotionChiffree {
  titre: string
  /** Début de la phrase, avant le chiffre clé. */
  avant: string
  /** Le chiffre clé, rendu en gras. */
  chiffre?: string
  /** Fin de la phrase, après le chiffre clé. */
  apres?: string
  /** Une seule phrase de contexte. */
  contexte?: string
}

export interface DocLink {
  titre: string
  description: string
  href: string
}

export interface LotOuest {
  lot: string
  coefficient: number
  coefficientNote?: string
  quotePart: number
  attributaire: string
  valeur: number
  valeurNote?: string
}

export interface ApportOuest {
  associe: string
  montant: number
  note?: string
}

export interface FraisAnnexesOuest {
  foyer: string
  mainALaMain: number
  /** Mention courte, rendue entre parenthèses sous le montant. */
  mainALaMainNote?: string
  foyerCommun: number
  notaire: number
}

// ============================================================
// DOCUMENTS (partagés par les trois pages)
// ============================================================

export const documents: DocLink[] = [
  {
    titre: 'Montage financier La Margue 02092026',
    description:
      "Le classeur au format d'origine : onglets DATA, SCIA LA MARGUE, SCIA LAOM, Financement SCI.",
    href: 'https://docs.google.com/spreadsheets/d/1JNQZBwZ2u4xGIIZvuDJDrv386V3LIHmB/edit',
  },
  {
    titre: 'Oasis La Margue — les montants',
    description:
      "L'onglet main à la main du classeur de Greg : le total de 53 592 € avancés par les fondateurs et son détail. Source retenue pour ce total. Une partie de ses onglets (fléchage, quote-part du domaine, foyer commun, frais de notaire, prêt Oasis) est antérieure au montage du 3 septembre.",
    href: 'https://docs.google.com/spreadsheets/d/1Kl8NIiqqaDZcPlBelCaE0fmZJ2o7xArrZ_2V5OmLfJI/edit?gid=577919867#gid=577919867',
  },
]

export const documentsNote = 'Accès sur demande à Charly.'

// ============================================================
// LA MARGUE EST
// ============================================================

export const estTotals = {
  capital: 1167696.1,
  dettes: 836328.12,
  prixLyre: 336910.21,
  fraisAnnexes: 145797.02,
  chaudiere: 20730.62,
  fosse: 16222.47,
  mainALaMain: 20416,
  notaire: 25427.93,
  foyerCommun: 63000,
}

/**
 * Les cinq lots à construire de Patricia à l'Est, lots 8 à 12 : ce qu'elle
 * n'est pas remboursée en argent. L'apport y est ventilé 1 / 1 / 0,5 / 0,5 / 0,5.
 */
export const lotsAConstruirePatricia: LotAConstruire[] = [
  { lot: 'Lot 8', nature: "Logement à l'année", part: 1, capital: 18900.31 },
  { lot: 'Lot 9', nature: "Logement à l'année", part: 1, capital: 18900.31 },
  { lot: 'Lot 10', nature: 'Petit logement touristique, 30 m²', part: 0.5, capital: 9450.15 },
  { lot: 'Lot 11', nature: 'Petit logement touristique, 30 m²', part: 0.5, capital: 9450.15 },
  { lot: 'Lot 12', nature: 'Petit logement touristique, 30 m²', part: 0.5, capital: 9450.15 },
]

/** Total du classeur pour les cinq lots ci-dessus, jamais une somme recalculée. */
export const CAPITAL_LOTS_A_CONSTRUIRE = 66151.07

export const estKeyFigures: KeyFigure[] = [
  { value: eur(estTotals.capital), label: 'Capital total de la SCIA Est' },
  { value: eur(estTotals.dettes), label: 'Dettes à rembourser aux sortants' },
  { value: eur(estTotals.prixLyre), label: 'Prix de la Lyre, tout compris' },
  { value: eur(estTotals.fraisAnnexes), label: 'Frais annexes Est, en plus des capitaux' },
]

/** Un point de la section « Pourquoi ce montage » : l'intention, puis ses précisions. */
export interface PourquoiPoint {
  titre: string
  texte: string
  /** Les phrases de l'ancienne « règle », gardées ici comme précisions. */
  precisions?: string[]
}

export const estPourquoi: PourquoiPoint[] = [
  {
    titre: "Sortir proprement de l'indivision de 2021",
    texte:
      "Chaque indivisaire qui part est remboursé au centime de ce qu'il a mis, travaux compris.",
  },
  {
    titre: 'Chacun propriétaire de son lot',
    texte:
      "Deux sociétés d'attribution, La Margue Est pour le hameau et La Margue Ouest pour le Grand Shambala et la ferme ; le capital de chacun est la valeur de son lot.",
    precisions: [
      "Personne n'achète le lot d'un autre : chacun apporte sa part, et son capital est la valeur conventionnelle de son lot.",
    ],
  },
  {
    titre: 'Personne ne porte de dette pour rien',
    texte:
      "Les apports des entrants et le prix de la Lyre paient les sortants ; ce qui manque devient un actif, des lots à construire, pas une dette sur quelqu'un.",
    precisions: [
      "Le prix de la Lyre est la variable qui boucle le système : il vaut ce qu'il faut pour que tout le monde soit remboursé.",
      `Les cinq lots à construire de Patricia à l'Est, ${eur(CAPITAL_LOTS_A_CONSTRUIRE)}, sont ce qui permet à la Lyre de sortir à ${eur(330000)} hors chaudière, ${eur(estTotals.prixLyre)} avec.`,
    ],
  },
  {
    titre: 'Rester ouvert aux suivants',
    texte:
      "La Lyre attend un foyer, cinq lots à construire attendent des bâtisseurs, une deuxième clé fixe le prix d'entrée de ceux qui viendront.",
  },
  {
    titre: 'Des frais annexes à équité',
    texte:
      'Fosse, main à la main, notaire et foyer commun se répartissent selon des clés écrites, pas à la tête du client.',
  },
]

/** Une colonne de l'encart « Où en est-on » : un statut, ses points. */
export interface EtatColonne {
  titre: string
  /** Précision de date ou d'interlocuteur, sous le titre. */
  note?: string
  items: string[]
}

export const estEtat: { date: string; colonnes: EtatColonne[] } = {
  date: '3 septembre 2026, au soir',
  colonnes: [
    {
      titre: 'Décidé',
      items: [
        'Clé du main à la main à 10,5 parts.',
        `Foyer commun à ${eur(11454.55)} par part.`,
        "Khaldoun associé de l'Ouest, apporte sa quote-part ; plus de crédit vendeur.",
        "Cinq lots à construire de Patricia à l'Est (2 logements à l'année, 3 petits touristiques de 30 m²), accord de Patricia obtenu.",
        `Lyre à ${eur(estTotals.prixLyre)} tout compris (330 000 € + sa part de chaudière).`,
        `Chaudière (devis Voda 20 730,62 €) partagée par tiers entre La Grange, la Lyre et la Source.`,
      ],
    },
    {
      titre: 'À relire',
      note: 'vendredi 4 septembre, avec Pierre Lévy',
      items: ["L'ensemble du classeur."],
    },
    {
      titre: 'À valider par le collectif',
      items: [
        'La clé du main à la main : Greg divise par 15.',
        'La variante, avec ou sans prêts en compte courant.',
        `Le foyer commun à ${eur(11454.55)}.`,
      ],
    },
    {
      titre: 'À faire',
      items: [
        'Refaire le partage partiel chez la notaire.',
        "Rédiger l'EDD Est, lots 8 à 12 compris (Charly avec NILA).",
        'Écrire la méthode de prix de la deuxième clé.',
        "Dessiner l'emplacement des cinq lots à construire.",
      ],
    },
  ],
}

export const foyersEst: FoyerEst[] = [
  {
    foyer: 'Serge & Marie-Agnès Lièvremont',
    lot: 'Gîtes Lavande + Olivier (fusionnés)',
    surfaceModele: 60,
    surfaceDpe: 50.45,
    valeurConventionnelle: 147085.09,
    capital: 105332.31,
    capitalCommentaire: `Capital = leur capacité de ${eur(120000)} moins les frais annexes.`,
    fraisAnnexes: 14667.69,
    fraisAnnexesDetail: [
      { label: 'Fosse (1 WC)', montant: 2027.81 },
      { label: 'Main à la main (0,5 part)', montant: 2552 },
      { label: 'Frais de notaire', montant: 4360.61 },
      { label: 'Foyer commun (0,5 part)', montant: 5727.27 },
    ],
    total: 120000,
    totalNote: 'capacité tout compris',
    totalDetail: 'leur capacité, tout compris',
    partCapital: '9,0 %',
    alias: ['Serge & Marie-Agnès'],
  },
  {
    foyer: 'Patricia Salgon',
    lot: 'La Grange',
    surfaceModele: 62,
    surfaceDpe: 55.15,
    valeurConventionnelle: 151987.93,
    capital: 218139.0,
    capitalLot: 151987.93,
    capitalEnPlus: `+ cinq lots à construire ${eur(CAPITAL_LOTS_A_CONSTRUIRE)}`,
    capitalNote: 'La Grange + cinq lots à construire',
    lotsAConstruire: lotsAConstruirePatricia,
    capitalCommentaire:
      "Les lots 8 à 12 sont des lots à construire, hors clé historique des quotes-parts : ce que Patricia n'est pas remboursée en argent.",
    fraisAnnexes: 23180.9,
    fraisAnnexesDetail: [
      { label: 'Fosse (1 WC)', montant: 2027.81 },
      { label: 'Main à la main (1 part, déjà avancée)', montant: 0 },
      { label: 'Frais de notaire', montant: 2788.33 },
      { label: 'Foyer commun (1 part)', montant: 11454.55 },
      { label: 'Chaudière (1/3 du devis Voda)', montant: 6910.21 },
    ],
    total: 23180.9,
    totalDetail: 'les frais annexes seuls : sa créance couvre son capital',
    partCapital: '18,7 %',
    alias: ['Patricia Salgon'],
  },
  {
    foyer: 'Entrant Lyre (foyer à trouver)',
    lot: 'La Lyre',
    surfaceModele: 114,
    surfaceDpe: 113.48,
    valeurConventionnelle: 279461.67,
    capital: 304574.53,
    capitalCommentaire: 'Capital = le prix qui boucle le montage.',
    fraisAnnexes: 32335.68,
    fraisAnnexesDetail: [
      { label: 'Provision sur actes', montant: 4811.31 },
      { label: 'Fosse (2 WC)', montant: 4055.62 },
      { label: 'Main à la main (1 part)', montant: 5104 },
      { label: 'Foyer commun (1 part)', montant: 11454.55 },
      { label: 'Chaudière (1/3 du devis Voda)', montant: 6910.21 },
    ],
    total: 336910.21,
    partCapital: '26,1 %',
    alias: ['Entrant Lyre'],
  },
  {
    foyer: 'Magali Rouby',
    lot: 'Le Ruisseau + Pergola',
    surfaceModele: 69,
    surfaceDpe: 61.7,
    valeurConventionnelle: 169147.85,
    capital: 177820.94,
    capitalLot: 169147.85,
    capitalEnPlus: `+ Pergola ${eur(8673.09)}, quote-part seule`,
    fraisAnnexes: 27877.32,
    fraisAnnexesDetail: [
      { label: 'Fosse (2 WC)', montant: 4055.62 },
      { label: 'Main à la main (1,5 part)', montant: 7656 },
      { label: 'Frais de notaire', montant: 4711.15 },
      { label: 'Foyer commun (1 part)', montant: 11454.55 },
    ],
    total: 205698.26,
    partCapital: '15,2 %',
    alias: ['Magali Rouby'],
  },
  {
    foyer: 'Grégoire Renevier',
    lot: 'Rivière',
    surfaceModele: 67.6,
    surfaceModeleNote: 'cave pondérée comprise',
    surfaceDpe: 59.8,
    valeurConventionnelle: 165715.87,
    capital: 165715.87,
    fraisAnnexes: 17524.58,
    fraisAnnexesDetail: [
      { label: 'Fosse (1 WC)', montant: 2027.81 },
      { label: 'Main à la main (1 part, déjà avancée)', montant: 0 },
      { label: 'Frais de notaire', montant: 4042.22 },
      { label: 'Foyer commun (1 part)', montant: 11454.55 },
    ],
    total: 70011.47,
    totalDetail: 'complément + frais annexes',
    partCapital: '14,2 %',
    alias: ['Grégoire Renevier'],
  },
  {
    foyer: 'David Viala & Charlotte Brun',
    lot: 'La Source (ex-maison commune)',
    surfaceModele: 80,
    surfaceDpe: 81.05,
    valeurConventionnelle: 196113.45,
    capital: 196113.45,
    fraisAnnexes: 30210.88,
    fraisAnnexesDetail: [
      { label: 'Fosse (1 WC)', montant: 2027.81 },
      { label: 'Main à la main (1 part)', montant: 5104 },
      { label: 'Frais de notaire', montant: 4714.31 },
      { label: 'Foyer commun (1 part)', montant: 11454.55 },
      { label: 'Chaudière (1/3 du devis Voda)', montant: 6910.21 },
    ],
    total: 226324.33,
    partCapital: '16,8 %',
    alias: ['Charlotte & David'],
  },
]

/** Prix au m² du modèle de valorisation, commun à tous les lots de l'Est. */
export const PRIX_M2_MODELE = 2451.42

/** Capital du seul lot bâti (identique au capital, sauf pour Magali). */
export function capitalDuLot(f: FoyerEst): number {
  return f.capitalLot ?? f.capital
}

/** Valeur du lot si on appliquait le prix au m² du modèle à la surface DPE. */
export function valeurDpe(f: FoyerEst): number {
  return PRIX_M2_MODELE * f.surfaceDpe
}

/** Ce que le capital retenu représente, ramené au m² réellement mesuré. */
export function prixM2Dpe(f: FoyerEst): number {
  return capitalDuLot(f) / f.surfaceDpe
}

export const estFraisAnnexesTotaux: Ligne[] = [
  { label: 'Fosse Est', montant: estTotals.fosse },
  {
    label: "Main à la main (payé par les foyers qui n'ont pas avancé)",
    montant: estTotals.mainALaMain,
  },
  { label: 'Frais de notaire', montant: estTotals.notaire },
  { label: 'Foyer commun', montant: estTotals.foyerCommun },
  { label: 'Chaudière (devis Voda, trois lots)', montant: estTotals.chaudiere },
]

/**
 * Le main à la main déjà avancé, foyer par foyer, les deux SCIA confondues.
 * Les fondateurs ne paient pas leur part une deuxième fois : ils récupèrent la
 * différence entre ce qu'ils ont avancé et leur propre part. Source : onglet
 * main à la main du classeur de Greg.
 */
export interface MainALaMainAvance {
  foyer: string
  avance: number
  /** Sa part de la clé à 10,5 parts : 0 pour Isabelle et Caroline. */
  part: number
  /** Le lot qui porte la part, ou la raison de son absence. */
  partNote?: string
  recupere: number
  /** Précision quand le foyer ne récupère pas ce qu'il a avancé. */
  note?: string
}

export const mainALaMainAvances: MainALaMainAvance[] = [
  { foyer: 'Patricia', avance: 24238, part: 5104, partNote: 'La Grange', recupere: 19134 },
  { foyer: 'Grégoire', avance: 10812, part: 5104, partNote: 'Rivière', recupere: 5708 },
  { foyer: 'Claire & Baptiste', avance: 9862, part: 5104, partNote: 'lot de Claire', recupere: 4758 },
  { foyer: 'Amandine & Charly', avance: 7481, part: 5104, partNote: 'Petit Shambala', recupere: 2377 },
  { foyer: 'Isabelle', avance: 1200, part: 0, partNote: 'sortante', recupere: 1200 },
  {
    foyer: 'Caroline',
    avance: 1200,
    part: 0,
    partNote: 'sortante',
    recupere: 0,
    note: 'elle ne demande pas à récupérer',
  },
]

/** Les totaux du classeur pour le tableau ci-dessus, jamais une somme recalculée. */
export const mainALaMainAvancesTotaux = {
  avance: 54793,
  parts: 20416,
  recupere: 33177,
  /** Ce que paient les foyers qui n'ont rien avancé : un euro d'arrondi en moins. */
  paye: 33176,
}

export const mainALaMainRegle =
  "Le main à la main a été avancé depuis 2021 par les quatre foyers fondateurs, plus Isabelle et Caroline pour le deck. Ils ne le paient pas une deuxième fois : ils récupèrent la différence entre ce qu'ils ont avancé et leur propre part, et ce sont les foyers qui n'ont rien avancé qui paient la leur — ce qui rembourse les fondateurs."

export const sortantsEst: Sortant[] = [
  { nom: 'Isabelle Desplats', montant: 238419.84 },
  { nom: 'Caroline Ader', montant: 300000 },
  { nom: 'Julian Quero', montant: 150000 },
  { nom: 'Orriols SARL (part Est)', montant: 129921.46 },
  { nom: 'Patricia Salgon (excédent)', montant: 13982.94 },
  { nom: "Turquoise SARL (société d'Isabelle)", montant: 4003.88 },
]

export const sortantsNote = `Isabelle et Turquoise, avec le rachat des parts et les soultes du partage, représentent ${eur(246423.75)} : c'est le « 246 K ».`

export const phase1: Phase = {
  titre: 'Phase 1 — à la signature',
  total: 531753.59,
  flux: [
    { payeur: 'Grégoire Renevier', beneficiaire: 'Caroline Ader', montant: 52486.89, note: 'cession de créance' },
    { payeur: 'Magali Rouby', beneficiaire: 'Caroline Ader', montant: 177820.94 },
    { payeur: 'Serge & Marie-Agnès', beneficiaire: 'Caroline Ader', montant: 16135.46 },
    { payeur: 'Serge & Marie-Agnès', beneficiaire: 'Julian Quero', montant: 89196.85 },
    { payeur: 'Charlotte & David', beneficiaire: 'Julian Quero', montant: 7246.44 },
    { payeur: 'Charlotte & David', beneficiaire: 'Turquoise SARL', montant: 4003.88 },
    { payeur: 'Charlotte & David', beneficiaire: 'Isabelle Desplats', montant: 184863.13 },
  ],
  recus: [
    { nom: 'Isabelle Desplats', montant: 184863.13 },
    { nom: 'Caroline Ader', montant: 246443.29 },
    { nom: 'Julian Quero', montant: 96443.29 },
  ],
  note: `Chacun des trois garde ${eur(53556.71)} en compte courant et reste associé jusqu'à l'arrivée de l'entrant.`,
}

export const phase2: Phase = {
  titre: "Phase 2 — à l'arrivée de l'entrant Lyre",
  total: 304574.53,
  flux: [
    { payeur: 'Entrant Lyre', beneficiaire: 'Isabelle Desplats', montant: 53556.71 },
    { payeur: 'Entrant Lyre', beneficiaire: 'Caroline Ader', montant: 53556.71 },
    { payeur: 'Entrant Lyre', beneficiaire: 'Julian Quero', montant: 53556.71 },
    { payeur: 'Entrant Lyre', beneficiaire: 'Orriols SARL', montant: 129921.46 },
    { payeur: 'Entrant Lyre', beneficiaire: 'Patricia Salgon', montant: 13982.94 },
  ],
  note: 'Rachat des parts et des comptes courants des trois sortants, quittance finale.',
}

export const phases: Phase[] = [phase1, phase2]

/** Une étape de la frise « Comment ça se passe ». */
export interface EtapeMontage {
  titre: string
  texte: string
  montant?: number
  /** Ce que le montant représente, en petit sous le chiffre. */
  montantNote?: string
}

export const estEtapes: EtapeMontage[] = [
  {
    titre: 'Validation du modèle',
    texte: 'Vendredi 4 septembre, Charly, David Viala et Pierre Lévy.',
  },
  {
    titre: 'Les actes chez la notaire',
    texte: 'Partage partiel, statuts des deux SCIA, cessions et quittances.',
    montant: phase1.total,
    montantNote: 'phase 1, versés aux sortants à la signature',
  },
  {
    titre: "L'entrant de la Lyre",
    texte: `Il solde Isabelle, Caroline, Julian, Orriols et l'excédent de Patricia ; ${eur(estTotals.prixLyre)} tout compris pour lui.`,
    montant: phase2.total,
    montantNote: 'phase 2',
  },
  {
    titre: "L'EDD de l'Est",
    texte:
      'Les lots sont attribués, dont les lots 8 à 12 de Patricia : chacun devient propriétaire de son lot.',
  },
  {
    titre: "L'Ouest",
    texte: "Travaux du Grand Shambala, lot de Khaldoun construit, EDD Ouest à l'achèvement.",
  },
  {
    titre: 'Les lots à construire',
    texte: 'Vendus aux prochains entrants au prix de la deuxième clé, permis au nom de la SCIA.',
  },
]

export interface FluxBloc {
  titre: string
  lignes: Flux[]
}

/**
 * Les flux des deux phases qui concernent un foyer, regroupés par moment.
 * Le rapprochement se fait sur `alias` : les phases nomment les foyers plus
 * court que la liste des capitaux (« Charly & Amandine » vs le nom complet).
 */
export function fluxFoyer(f: FoyerEst): FluxBloc[] {
  const blocs: FluxBloc[] = []
  const signature = phase1.flux.filter((x) => f.alias.includes(x.payeur))
  const arrivee = phase2.flux.filter((x) => f.alias.includes(x.payeur))
  const recus = [...phase1.flux, ...phase2.flux].filter((x) => f.alias.includes(x.beneficiaire))

  if (signature.length > 0) blocs.push({ titre: "Ce qu'il verse à la signature", lignes: signature })
  if (arrivee.length > 0) blocs.push({ titre: "Ce qu'il verse à son arrivée", lignes: arrivee })
  if (recus.length > 0) blocs.push({ titre: "Ce qu'il reçoit", lignes: recus })
  return blocs
}

export const variantes: Variante[] = [
  {
    cle: 'A',
    titre: 'Scénario prêt en compte courant',
    points: [
      "Des prêts en compte courant d'associés soldent les trois sortants dès la signature.",
      "Ils sont remboursés par l'entrant de la Lyre, jamais transformés en parts.",
      "Seule variante qui tient la date butoir d'Isabelle, le 15 novembre 2026.",
    ],
  },
  {
    cle: 'B',
    titre: 'Scénario sans prêt',
    points: [
      `Les trois sortants restent associés avec ${eur(53556.71)} chacun en compte courant jusqu'à l'arrivée de l'entrant.`,
      'Aucune reconnaissance de dette.',
      "Personne n'avance de trésorerie.",
    ],
  },
]

export const notionsEst: NotionChiffree[] = [
  {
    titre: 'Valeur conventionnelle',
    avant: 'Le prix au m² du modèle, ',
    chiffre: eur(2451.42),
    apres: ', multiplié par la surface du modèle.',
    contexte: 'La quote-part du domaine y est déjà comprise : rien à payer en plus.',
  },
  {
    titre: 'Fosse Est',
    avant: 'Devis Agussol, ',
    chiffre: eur(16222.47),
    apres: ` TTC, soit ${eur(2027.81)} par WC raccordé.`,
    contexte: 'Huit WC en tout, pour 12 équivalents-habitants. La somme va au fonds de travaux.',
  },
  {
    titre: 'Main à la main',
    avant: `${eur(53592)} avancés par les fondateurs, répartis en 10,5 parts : `,
    chiffre: eur(5104),
    apres: ` par part, ${eur(2552)} par demi-part.`,
    contexte: "Le coliving, le studio et les deux tinies n'entrent pas dans la clé.",
  },
  {
    titre: 'Foyer commun',
    avant: 'Une part par foyer, ',
    chiffre: eur(11454.55),
    apres: ', et une demi-part pour Serge & Marie-Agnès comme pour David Coste.',
    contexte: `11 parts au total, soit ${eur(126000)} sur les deux SCIA.`,
  },
  {
    titre: 'Frais de notaire',
    avant: "Les provisions du tableau de la notaire à l'Est, ",
    chiffre: eur(estTotals.notaire),
    apres: ', affectées acte par acte à qui paie.',
    contexte: 'Pas de clé forfaitaire, et deux postes restent non chiffrés.',
  },
]

// ============================================================
// LA MARGUE OUEST (LAOM)
// ============================================================

export const ouestTotals = {
  valeurLots: 1185803.29,
  quotePartUnitaire: 17346.17,
  coefficientsOuest: 12.54,
  coefficientsTotal: 19.04,
  coefficientsEst: 6.5,
  quotesPartsOuest: 217521.03,
  quotesPartsEst: 112750.13,
  lotKhaldoun: 17346.17,
  mainALaMain: 12760,
  foyerCommun: 63000,
}

export const ouestKeyFigures: KeyFigure[] = [
  { value: eur(ouestTotals.valeurLots), label: 'Valeur des lots apportés' },
  { value: eur(ouestTotals.quotePartUnitaire), label: 'Quote-part du domaine, par coefficient' },
  {
    value: `${coef(ouestTotals.coefficientsOuest)} / ${coef(ouestTotals.coefficientsTotal)}`,
    label: 'Coefficients Ouest sur le total du domaine',
  },
  { value: eur(ouestTotals.lotKhaldoun), label: 'Lot de Khaldoun, sa quote-part' },
]

export const lotsOuest: LotOuest[] = [
  { lot: 'Petit Shambala', coefficient: 1, quotePart: 17346.17, attributaire: 'Amandine & Charly', valeur: 77000 },
  { lot: 'GS rdc extrême ouest — coliving 125 m²', coefficient: 0.5, quotePart: 8673.09, attributaire: 'LAOM / Ferme du Verseau', valeur: 161760.7 },
  { lot: 'GS étage ouest — appartement', coefficient: 0.5, quotePart: 8673.09, attributaire: 'David Coste', valeur: 95633.93 },
  { lot: 'GS étage centre', coefficient: 1, quotePart: 17346.17, attributaire: 'Laetitia Brene', valeur: 130343.33 },
  { lot: 'GS rdc est — atelier 32 m²', coefficient: 0, quotePart: 0, attributaire: 'Laetitia Brene', valeur: 44896.04 },
  { lot: 'GS étage est', coefficient: 1, quotePart: 17346.17, attributaire: 'Claire & Baptiste', valeur: 40639 },
  { lot: 'GS étage extrême ouest — studio', coefficient: 0.5, quotePart: 8673.09, attributaire: 'Amandine & Charly', valeur: 15500 },
  { lot: 'GS rdc extrême est', coefficient: 1, quotePart: 17346.17, attributaire: 'David Lin', valeur: 92227.81 },
  { lot: 'GS rdc centre — foyer commun', coefficient: 0, quotePart: 0, attributaire: 'Ferme du Verseau + association', valeur: 106518.6 },
  { lot: 'Annexe', coefficient: 0, quotePart: 0, attributaire: 'Orriols SAS', valeur: 32755.68 },
  { lot: 'Tiny Eliott (touristique)', coefficient: 0.5, quotePart: 8673.09, attributaire: 'LAOM', valeur: 47507 },
  { lot: 'Tiny Claire (touristique)', coefficient: 0.5, quotePart: 8673.09, attributaire: 'Claire & Baptiste', valeur: 49000 },
  { lot: 'Ferme — serre, abris, terre', coefficient: 0.04, quotePart: 693.85, attributaire: 'Orriols SAS', valeur: 5249.54 },
  { lot: 'Accueil — salle, restaurant', coefficient: 0, quotePart: 0, attributaire: 'Ferme du Verseau', valeur: 180000 },
  { lot: 'Terrain des lodges', coefficient: 5, quotePart: 86730.87, attributaire: 'Patricia Salgon', valeur: 97932.16, valeurNote: 'partage partiel' },
  { lot: 'Logement Khaldoun (nouveau)', coefficient: 1, quotePart: 17346.17, attributaire: 'Khaldoun', valeur: 17346.17 },
]

export const lotsOuestNote = `Le total des lots ci-dessus ne se lit pas comme le total des apports : plusieurs lots sont partagés entre attributaires — le foyer commun entre la Ferme du Verseau et l'association — et Orriols SARL n'apporte à l'Ouest que des quotes-parts. Le total qui fait foi est celui des apports, ${eur(ouestTotals.valeurLots)}.`

export const deplacementsEst: Notion[] = [
  {
    titre: "Ce que Patricia apporte à l'Ouest",
    texte: `Patricia apporte à l'Ouest ${eur(97932.16)}, le terrain des lodges.`,
  },
  {
    titre: "L'apport d'Orriols SARL est limité",
    texte: `Orriols n'apporte à l'Ouest que des quotes-parts : ${eur(70078.54)}, soit ${coef(4.04)} coefficients. Sa créance Est remonte d'autant.`,
  },
  {
    titre: 'Chacun porte sa quote-part',
    texte: `Laetitia ${eur(17346.17)}, David Lin ${eur(17346.17)} et David Coste ${eur(8673.09)} apportent la leur, ${eur(43365.44)} en tout. Le partage partiel est à refaire, et l'EDD Ouest gagne un lot.`,
  },
]

export interface KhaldounLigne {
  label: string
  montant?: number
  texte?: string
  note?: string
  total?: boolean
}

/**
 * Le lot de Khaldoun : sa quote-part du domaine, qu'il apporte lui-même comme
 * associé de la SCIA Ouest depuis le 3 septembre, tard. Patricia ne finance plus
 * rien ici : ne reste qu'un prêt pour la construction, hors SCIA, à confirmer.
 */
export const khaldoun = {
  titre: 'Le lot de Khaldoun',
  lignes: [
    {
      label: 'Valeur du lot',
      montant: 17346.17,
      note: "sa quote-part du domaine, apportée par Khaldoun, associé de l'Ouest",
    },
    {
      label: 'Prêt de Patricia pour la construction',
      montant: 30000,
      note: 'hors SCIA, à confirmer',
    },
    {
      label: 'Apport en nature de Charly',
      texte: "dalle, réseaux (VRD) et gaines de l'atelier du rez-de-chaussée, à chiffrer",
    },
  ] as KhaldounLigne[],
  note: "Patricia ne transfère plus rien vers l'Ouest : ce qu'elle n'est pas remboursée en argent devient cinq lots à construire à l'Est.",
}

export const apportsOuest: ApportOuest[] = [
  { associe: 'Patricia Salgon', montant: 97932.16, note: 'terrain des lodges' },
  { associe: 'Khaldoun Alshaar', montant: 17346.17, note: 'sa quote-part, apportée par lui' },
  { associe: 'Claire Orriols & Baptiste Fromont', montant: 89639 },
  { associe: 'Amandine Orriols & Charly Aubert', montant: 92500 },
  { associe: 'Orriols SARL', montant: 70078.54, note: 'quotes-parts seules' },
  { associe: 'La Ferme du Verseau', montant: 419700.1 },
  { associe: 'David Lin', montant: 92227.81 },
  { associe: 'David Coste', montant: 95633.93 },
  { associe: 'Laetitia Brene', montant: 175239.37 },
  { associe: 'Association des habitants', montant: 35506.2 },
]

export const fraisAnnexesOuest: FraisAnnexesOuest[] = [
  { foyer: 'Amandine & Charly', mainALaMain: 0, mainALaMainNote: `déjà avancé : ${eur(7481)}, récupèrent ${eur(2377)}`, foyerCommun: 11454.55, notaire: 3386.26 },
  { foyer: 'Claire & Baptiste', mainALaMain: 0, mainALaMainNote: `déjà avancé : ${eur(9862)}, récupèrent ${eur(4758)}`, foyerCommun: 11454.55, notaire: 2128.69 },
  { foyer: 'Laetitia Brene', mainALaMain: 5104, mainALaMainNote: '1 part (l\'atelier est hors clé)', foyerCommun: 11454.55, notaire: 871.11 },
  { foyer: 'David Lin', mainALaMain: 5104, mainALaMainNote: '1 part', foyerCommun: 11454.55, notaire: 871.11 },
  { foyer: 'David Coste', mainALaMain: 2552, mainALaMainNote: '0,5 part', foyerCommun: 5727.27, notaire: 871.11 },
  { foyer: 'Khaldoun', mainALaMain: 0, mainALaMainNote: 'hors clé', foyerCommun: 11454.55, notaire: 871.11 },
  { foyer: 'LAOM / Ferme du Verseau', mainALaMain: 0, mainALaMainNote: 'coliving et tiny hors clé', foyerCommun: 0, notaire: 3396.11 },
  { foyer: 'Orriols SARL', mainALaMain: 0, foyerCommun: 0, notaire: 2128.69 },
]

/** Somme des provisions de notaire listées ci-dessus (pas un total du classeur). */
export const fraisAnnexesOuestNotaireTotal = fraisAnnexesOuest.reduce((s, c) => s + c.notaire, 0)

export const fraisAnnexesOuestNote =
  "La fosse Ouest n'est pas devisée : elle ne figure dans aucune ligne."

export const notionsOuest: NotionChiffree[] = [
  {
    titre: 'La quote-part du domaine',
    avant: `Les espaces extérieurs et leurs frais d'acquisition, divisés par ${coef(19.04)} coefficients : `,
    chiffre: eur(17346.17),
    apres: ' par coefficient 1.',
    contexte: `Soit ${eur(200000)} de terrain et ${eur(130271.16)} de frais d'acquisition.`,
  },
  {
    titre: 'Le lot de Khaldoun a fait baisser la quote-part',
    avant: `La quote-part est tombée de ${eur(18307.71)} à `,
    chiffre: eur(17346.17),
    apres: `, en passant de ${coef(18.04)} à ${coef(19.04)} coefficients.`,
    contexte: "Tout le monde y gagne, à l'Est comme à l'Ouest.",
  },
  {
    titre: 'Les lots LAOM ne paient pas les frais annexes des foyers',
    avant: 'Ni foyer commun, ni main à la main.',
    contexte: 'Le coliving et la tiny Eliott sont sortis de la clé le 3 septembre.',
  },
  {
    titre: 'Sans EDD Ouest, pas de TVA récupérable',
    avant: "L'état descriptif de division Ouest est reporté à l'achèvement des travaux.",
    contexte: "Tant qu'il n'est pas signé, LAOM ne récupère pas la TVA.",
  },
]

// ============================================================
// NOTICE
// ============================================================

export interface NoticeItem {
  point: string
  detail: string
  source: string
  date: string
}

export interface NoticeGuideItem {
  point: string
  detail: string
}

export interface NoticeSection {
  titre: string
  items: NoticeItem[]
  guides?: {
    '0209': NoticeGuideItem[]
  }
}

export interface Notice {
  titre: string
  intro: string
  sections: NoticeSection[]
}

export const notice: Notice = noticeRaw

/** Une entrée du lexique de la notice : le mot, puis ce qu'il veut dire. */
export interface LexiqueEntree {
  terme: string
  definition: string
}

export const lexique: LexiqueEntree[] = [
  {
    terme: 'SCIA',
    definition:
      "Société civile immobilière d'attribution : la société possède l'immeuble, chaque associé détient des parts qui donnent droit à un lot, en jouissance d'abord, en propriété à l'attribution.",
  },
  {
    terme: 'Indivision',
    definition:
      "La situation de 2021 : le domaine acheté à plusieurs, chacun propriétaire d'une quote-part indivise, sans lot à soi. Le montage en sort.",
  },
  {
    terme: 'EDD, état descriptif de division',
    definition:
      "Le document qui découpe l'immeuble en lots numérotés et fixe les millièmes de chacun. À l'Est il sera signé à l'arrivée de l'entrant, à l'Ouest à l'achèvement des travaux.",
  },
  {
    terme: 'Quote-part du domaine',
    definition: `La part des espaces extérieurs et des frais d'acquisition attachée à chaque lot : ${eur(17346.17)} par coefficient, ${eur(8673.09)} pour un demi. Déjà comprise dans le capital.`,
  },
  {
    terme: 'Clé historique et deuxième clé',
    definition: `La clé historique (${coef(19.04)} coefficients) est close avec les lots existants ; tout lot créé après entre par une deuxième clé, à un prix fixé par l'assemblée, plus élevé.`,
  },
  {
    terme: 'Capital',
    definition:
      'Ce que chaque associé détient dans la SCIA : la valeur conventionnelle de son lot.',
  },
  {
    terme: "Compte courant d'associé",
    definition:
      "Ce qu'un associé a avancé à la société au-delà de son capital ; une créance, remboursable, sans droits de vote.",
  },
  {
    terme: 'Lot à construire (transitoire)',
    definition:
      "Un lot fait d'un droit de construire délimité et d'une quote-part de parties communes (loi ELAN) ; les lots 8 à 12 de Patricia.",
  },
  {
    terme: 'Frais annexes',
    definition:
      'Ce que chaque lot paie en plus de son capital : fosse, main à la main, frais de notaire, foyer commun, et la chaudière pour les trois lots raccordés (La Grange, la Lyre, la Source).',
  },
  {
    terme: 'Main à la main',
    definition: `Les ${eur(53592)} avancés par les fondateurs depuis 2021 (conseil, structuration, matériel collectif), répartis en 10,5 parts : les foyers à l'année comptent 1, les gîtes de Serge & Marie-Agnès, la Pergola et David Coste 0,5. Les fondateurs (Patricia, Greg, Claire & Baptiste, Charly & Amandine) l'ont déjà avancé : ils ne paient pas leur part, ils récupèrent la différence, ${eur(mainALaMainAvancesTotaux.recupere)} en tout, payée par les foyers qui n'ont rien avancé.`,
  },
  {
    terme: 'Foyer commun',
    definition: `L'espace partagé du Grand Shambala : ${eur(11454.55)} par part de foyer, 11 parts.`,
  },
  {
    terme: 'Phase 1, phase 2',
    definition:
      "La signature (les entrants paient), puis l'arrivée de l'entrant de la Lyre (il solde le reste).",
  },
  {
    terme: 'Variantes A et B',
    definition:
      "Avec prêts en compte courant (les sortants soldés à la signature) ou sans (ils restent associés jusqu'à l'entrant).",
  },
  {
    terme: 'Sortants, restants, entrants',
    definition:
      "Ceux qui partent (Isabelle, Caroline, Julian, Orriols côté Est), ceux qui restent (Patricia, Greg), ceux qui arrivent (Serge & Marie-Agnès, Magali, Charlotte & David, l'entrant de la Lyre).",
  },
]
