// Le montage La Margue, vu par personne — source de /la-margue-par-personne.
// Chaque fiche répond à cinq questions : ce que j'ai mis, ce que je reçois ou
// paie, ce que je détiens, mes frais annexes, ce que je signe.
//
// Les montants ne sont pas ressaisis ici quand ils existent déjà : ils sont lus
// dans src/data/la-margue-2026.ts (foyers Est, flux des deux phases, lots et
// apports Ouest, frais annexes, lot de Khaldoun). Ce fichier ne fait qu'ajouter
// ce que le classeur du 3 septembre porte en plus : créances d'origine, actes
// signés, renvois vers la section qui prouve le chiffre.

import {
  apportsOuest,
  CAPITAL_LOTS_A_CONSTRUIRE,
  eur,
  fraisAnnexesOuest,
  foyersEst,
  khaldoun,
  lotsAConstruirePatricia,
  lotsOuest,
  m2,
  m2Court,
  mainALaMainAvances,
  phase1,
  phase2,
  coef,
  type FoyerEst,
  type Flux,
  type Ligne,
  type LotAConstruire,
  type MainALaMainAvance,
} from './la-margue-2026'

// ============================================================
// TYPES
// ============================================================

/** Une ligne de fiche : un libellé à gauche, un montant ou un texte à droite. */
export interface FicheLigne {
  label: string
  montant?: number
  texte?: string
  note?: string
}

export interface FicheFrais {
  /** Absent quand la personne n'a aucun frais annexe. */
  total?: number
  /** Le détail, en une seule ligne. */
  detail: string
  note?: string
}

export interface Renvoi {
  label: string
  href: string
}

export type GroupePersonne = 'est' | 'sortants' | 'ouest'

export interface Personne {
  id: string
  nom: string
  role: string
  groupe: GroupePersonne
  /** Ce que j'ai mis : créance dans l'indivision, ou apport. */
  misEnJeu: FicheLigne[]
  /** Ce que je reçois, ce que je paie, avec le moment. */
  flux: FicheLigne[]
  /** Ce que je détiens : lot, capital, compte courant. */
  detient: FicheLigne[]
  frais: FicheFrais
  /** Les actes, en une ligne. */
  signe: string
  verifier: Renvoi[]
  note?: string
}

export interface GroupePersonnes {
  cle: GroupePersonne
  eyebrow: string
  personnes: Personne[]
}

// ============================================================
// RENVOIS
// ============================================================

const EST_FOYERS: Renvoi = { label: 'Le détail, foyer par foyer', href: '/la-margue-est/#foyers' }
const EST_SORTANTS: Renvoi = { label: 'Ce qui est remboursé', href: '/la-margue-est/#sortants' }
const EST_PHASES: Renvoi = { label: 'En deux temps', href: '/la-margue-est/#phases' }
const EST_ETAPES: Renvoi = { label: 'Comment ça se passe', href: '/la-margue-est/#phases' }
const EST_VARIANTES: Renvoi = { label: 'Les deux variantes', href: '/la-margue-est/#variantes' }
const OUEST_LOTS: Renvoi = { label: "Les lots de l'Ouest", href: '/la-margue-ouest/#lots' }
const OUEST_KHALDOUN: Renvoi = { label: 'Le lot de Khaldoun', href: '/la-margue-ouest/#khaldoun' }
const OUEST_APPORTS: Renvoi = { label: 'Ce que chacun porte', href: '/la-margue-ouest/#apports' }
const OUEST_FRAIS: Renvoi = { label: "Les frais annexes de l'Ouest", href: '/la-margue-ouest/#frais' }

// ============================================================
// LECTURE DES DONNÉES EXISTANTES
// ============================================================

const A_LA_SIGNATURE = 'à la signature'
const A_L_ARRIVEE = "à l'arrivée de l'entrant"

function foyerParAlias(alias: string): FoyerEst {
  const trouve = foyersEst.find((f) => f.alias.includes(alias))
  if (!trouve) throw new Error(`Foyer Est introuvable : ${alias}`)
  return trouve
}

/** Les flux des deux phases qui concernent ces noms, dans l'ordre du classeur. */
function versements(noms: string[], momentPhase2: string = A_L_ARRIVEE): FicheLigne[] {
  const lignes: FicheLigne[] = []

  const ajoute = (flux: Flux[], moment: string) => {
    for (const x of flux) {
      const contexte = [x.note, moment].filter(Boolean).join(' · ')
      if (noms.includes(x.payeur)) {
        lignes.push({ label: `Verse à ${x.beneficiaire}`, montant: x.montant, note: contexte })
      }
      if (noms.includes(x.beneficiaire)) {
        lignes.push({ label: `Reçoit de ${x.payeur}`, montant: x.montant, note: contexte })
      }
    }
  }

  ajoute(phase1.flux, A_LA_SIGNATURE)
  ajoute(phase2.flux, momentPhase2)
  return lignes
}

function detailLignes(lignes: Ligne[]): string {
  return lignes.map((l) => `${l.label} ${eur(l.montant)}`).join(' · ')
}

/** Les lots à construire d'un foyer, en une ligne : « Lot 8 1 part 18 800,88 € ». */
function detailLotsAConstruire(lots: LotAConstruire[]): string {
  return lots.map((l) => `${l.lot} ${coef(l.part)} part ${eur(l.capital)}`).join(' · ')
}

/** Les frais annexes d'un foyer de l'Est : le total du classeur, puis son détail. */
function fraisEst(f: FoyerEst): FicheFrais {
  return { total: f.fraisAnnexes, detail: detailLignes(f.fraisAnnexesDetail) }
}

/** Les frais annexes d'un foyer de l'Ouest : la somme des trois postes du tableau. */
function fraisOuest(nom: string): FicheFrais {
  const c = fraisAnnexesOuest.find((x) => x.foyer === nom)
  if (!c) throw new Error(`Frais annexes Ouest introuvables : ${nom}`)

  const postes: string[] = []
  if (c.mainALaMain > 0) {
    const precision = c.mainALaMainNote ? ` (${c.mainALaMainNote})` : ''
    postes.push(`Main à la main ${eur(c.mainALaMain)}${precision}`)
  }
  if (c.foyerCommun > 0) postes.push(`Foyer commun ${eur(c.foyerCommun)}`)
  postes.push(`Frais de notaire ${eur(c.notaire)}`)

  const absents: string[] = []
  if (c.mainALaMain === 0) {
    absents.push(`main à la main${c.mainALaMainNote ? ` (${c.mainALaMainNote})` : ''}`)
  }
  if (c.foyerCommun === 0) absents.push('foyer commun')
  const fin = absents.length > 0 ? ` · ni ${absents.join(', ni ')}` : ''

  return {
    total: c.mainALaMain + c.foyerCommun + c.notaire,
    detail: postes.join(' · ') + fin,
    note: 'somme des postes du tableau Ouest',
  }
}

function lotsDe(attributaire: string): FicheLigne[] {
  return lotsOuest
    .filter((l) => l.attributaire === attributaire)
    .map((l) => ({ label: l.lot, montant: l.valeur, note: l.valeurNote }))
}

/** Ce qu'un foyer a avancé au titre du main à la main, et ce qu'il récupère. */
function avanceMainALaMain(foyer: string): MainALaMainAvance {
  const a = mainALaMainAvances.find((x) => x.foyer === foyer)
  if (!a) throw new Error(`Avance de main à la main introuvable : ${foyer}`)
  return a
}

function apportDe(associe: string): number {
  const a = apportsOuest.find((x) => x.associe === associe)
  if (!a) throw new Error(`Apport Ouest introuvable : ${associe}`)
  return a.montant
}

/** Le détail chiffré du lot de Khaldoun, repris tel quel de la fiche Ouest. */
function lignesKhaldoun(): FicheLigne[] {
  return khaldoun.lignes.map((l) => ({
    label: l.label,
    montant: l.montant,
    texte: l.texte,
    note: l.note,
  }))
}

const AUCUN_FRAIS: FicheFrais = {
  detail: 'Aucun : les frais annexes sont portés par les foyers qui entrent.',
}

/** Libellé commun de la ligne de récupération du main à la main. */
const RECUPERE_MAM = 'Récupère au titre du main à la main'

const avancePatricia = avanceMainALaMain('Patricia')
const avanceGreg = avanceMainALaMain('Grégoire')
const avanceClaire = avanceMainALaMain('Claire & Baptiste')
const avanceCharly = avanceMainALaMain('Amandine & Charly')
const avanceIsabelle = avanceMainALaMain('Isabelle')
const avanceCaroline = avanceMainALaMain('Caroline')

// ============================================================
// LES FOYERS DE L'EST
// ============================================================

const serge = foyerParAlias('Serge & Marie-Agnès')
const patricia = foyerParAlias('Patricia Salgon')
const lyre = foyerParAlias('Entrant Lyre')
const magali = foyerParAlias('Magali Rouby')
const greg = foyerParAlias('Grégoire Renevier')
const charlotteDavid = foyerParAlias('Charlotte & David')

const foyersDeLEst: Personne[] = [
  {
    id: 'lievremont',
    nom: 'Serge & Marie-Agnès Lièvremont',
    role: "Entrants à l'Est",
    groupe: 'est',
    misEnJeu: [
      {
        label: "Ce qu'ils mettent, tout compris",
        montant: serge.total,
        note: `capital ${eur(serge.capital)} + frais annexes ${eur(serge.fraisAnnexes)}`,
      },
    ],
    flux: versements(serge.alias),
    detient: [{ label: serge.lot, montant: serge.capital, note: 'capital dans la SCIA Est' }],
    frais: fraisEst(serge),
    signe: 'Statuts de la SCIA Est, cessions de parts et quittances Ader et Quero.',
    verifier: [EST_FOYERS, EST_PHASES],
  },
  {
    id: 'patricia',
    nom: 'Patricia Salgon',
    role: "Restante, à l'Est et à l'Ouest",
    groupe: 'est',
    misEnJeu: [
      { label: "Sa créance dans l'indivision Est", montant: 232121.94 },
    ],
    flux: [
      ...versements(patricia.alias),
      {
        label: RECUPERE_MAM,
        montant: avancePatricia.recupere,
        note: `${eur(avancePatricia.avance)} avancés depuis 2021, moins sa part de ${eur(avancePatricia.part)} ; payé par les foyers qui n'ont pas avancé`,
      },
    ],
    detient: [
      { label: patricia.lot, montant: 151987.93, note: 'capital dans la SCIA Est' },
      {
        label: 'Lots 8 à 12, à construire',
        montant: CAPITAL_LOTS_A_CONSTRUIRE,
        note: detailLotsAConstruire(lotsAConstruirePatricia),
      },
      {
        label: "Apport à la SCIA Ouest",
        montant: apportDe('Patricia Salgon'),
        note: 'le terrain des lodges, seul apport Ouest',
      },
      {
        label: 'Prêt à Khaldoun',
        montant: 30000,
        note: 'pour construire, hors SCIA, à confirmer',
      },
    ],
    frais: fraisEst(patricia),
    signe:
      'Partage partiel, quittance partielle puis quittance finale. Pas de crédit vendeur ; un contrat de prêt si le prêt à Khaldoun est confirmé.',
    verifier: [EST_FOYERS, OUEST_KHALDOUN],
  },
  {
    id: 'entrant-lyre',
    nom: 'Futur entrant de la Lyre',
    role: 'Foyer à trouver',
    groupe: 'est',
    misEnJeu: [
      {
        label: 'Prix tout compris',
        montant: lyre.total,
        note: `capital ${eur(lyre.capital)} + frais annexes ${eur(lyre.fraisAnnexes)}`,
      },
    ],
    flux: versements(lyre.alias, 'à son arrivée'),
    detient: [
      {
        label: lyre.lot,
        montant: lyre.capital,
        note: `${m2Court(lyre.surfaceModele)} au modèle, ${m2(lyre.surfaceDpe)} au DPE`,
      },
    ],
    frais: fraisEst(lyre),
    signe: 'Cession de parts et quittances, entrée aux statuts de la SCIA Est.',
    verifier: [EST_PHASES, EST_ETAPES],
  },
  {
    id: 'magali',
    nom: 'Magali Rouby',
    role: "Entrante à l'Est",
    groupe: 'est',
    misEnJeu: [
      { label: 'Son apport', montant: magali.capital },
      {
        label: 'Total à prévoir',
        montant: magali.total,
        note: `apport + frais annexes ${eur(magali.fraisAnnexes)}`,
      },
    ],
    flux: versements(magali.alias),
    detient: [
      { label: 'Le Ruisseau', montant: 169147.85, note: 'capital dans la SCIA Est' },
      { label: 'La Pergola', montant: 8673.09, note: 'quote-part seule' },
    ],
    frais: fraisEst(magali),
    signe: 'Statuts de la SCIA Est, cession de parts et quittance Ader.',
    verifier: [EST_FOYERS, EST_PHASES],
  },
  {
    id: 'greg',
    nom: 'Grégoire Renevier',
    role: "Restant à l'Est",
    groupe: 'est',
    misEnJeu: [
      { label: 'Son apport historique', montant: 113228.98 },
      { label: 'Son complément', montant: 52486.89, note: 'versé à Caroline par cession de créance' },
      {
        label: "Ce qu'il sort en tout",
        montant: greg.total,
        note: `complément + frais annexes ${eur(greg.fraisAnnexes)}`,
      },
    ],
    flux: [
      ...versements(greg.alias),
      {
        label: RECUPERE_MAM,
        montant: avanceGreg.recupere,
        note: `${eur(avanceGreg.avance)} avancés, moins sa part de ${eur(avanceGreg.part)}`,
      },
    ],
    detient: [{ label: greg.lot, montant: greg.capital, note: 'capital dans la SCIA Est' }],
    frais: fraisEst(greg),
    signe: 'Cession de créance Ader vers Renevier, statuts de la SCIA Est.',
    verifier: [EST_FOYERS, EST_PHASES],
  },
  {
    id: 'viala-brun',
    nom: 'David Viala & Charlotte Brun',
    role: "Entrants à l'Est",
    groupe: 'est',
    misEnJeu: [
      { label: 'Leur apport', montant: charlotteDavid.capital },
      {
        label: 'Total à prévoir',
        montant: charlotteDavid.total,
        note: `apport + frais annexes ${eur(charlotteDavid.fraisAnnexes)}`,
      },
    ],
    flux: versements(charlotteDavid.alias),
    detient: [
      {
        label: charlotteDavid.lot,
        montant: charlotteDavid.capital,
        note: 'capital dans la SCIA Est',
      },
    ],
    frais: fraisEst(charlotteDavid),
    signe: 'Statuts de la SCIA Est, cessions de parts et quittances Desplats, Quero et Turquoise.',
    verifier: [EST_FOYERS, EST_PHASES],
  },
]

// ============================================================
// CEUX QUI SORTENT
// ============================================================

const ceuxQuiSortent: Personne[] = [
  {
    id: 'isabelle',
    nom: 'Isabelle Desplats',
    role: 'Sortante',
    groupe: 'sortants',
    misEnJeu: [
      { label: 'Ses apports', montant: 219953.84 },
      { label: 'Ses travaux sur la Lyre', montant: 18466 },
      { label: "Ce qu'elle a mis en tout", montant: 238419.84 },
    ],
    flux: [
      ...versements(['Isabelle Desplats']),
      {
        label: RECUPERE_MAM,
        montant: avanceIsabelle.recupere,
        note: 'avancés pour le deck, elle demande à les récupérer',
      },
    ],
    detient: [
      {
        label: "Compte courant, jusqu'à l'entrant",
        montant: 53518.04,
        note: 'elle reste associée jusque-là, ou soldée dès la signature dans la variante avec prêts',
      },
      {
        label: 'Avec Turquoise, ses parts et les soultes',
        montant: 246423.75,
        note: 'le « 246 K »',
      },
    ],
    frais: AUCUN_FRAIS,
    signe: 'Cession de ses parts et quittances.',
    verifier: [EST_SORTANTS, EST_VARIANTES],
    note: "Date butoir qu'elle a posée : 15 novembre 2026.",
  },
  {
    id: 'turquoise',
    nom: 'Turquoise SARL',
    role: "Société d'Isabelle",
    groupe: 'sortants',
    misEnJeu: [{ label: 'Sa créance', montant: 4003.88 }],
    flux: versements(['Turquoise SARL']),
    detient: [
      { label: 'Ses 1 000 parts', texte: 'rachetées par les sept associés restants' },
    ],
    frais: AUCUN_FRAIS,
    signe: 'Cession de ses 1 000 parts et quittance.',
    verifier: [EST_SORTANTS],
  },
  {
    id: 'caroline',
    nom: 'Caroline Ader',
    role: 'Sortante',
    groupe: 'sortants',
    misEnJeu: [{ label: "Ce qu'elle a mis", montant: 300000 }],
    flux: [
      ...versements(['Caroline Ader']),
      { label: 'Total reçu à la signature', montant: 246481.96, note: 'les trois versements ci-dessus' },
      {
        label: 'Main à la main',
        texte: `${eur(avanceCaroline.avance)} avancés pour le deck`,
        note: avanceCaroline.note,
      },
    ],
    detient: [
      {
        label: "Compte courant, jusqu'à l'entrant",
        montant: 53518.04,
        note: 'elle reste associée jusque-là',
      },
    ],
    frais: AUCUN_FRAIS,
    signe: 'Cessions de parts et quittances, cession de créance vers Grégoire Renevier.',
    verifier: [EST_SORTANTS, EST_PHASES],
  },
  {
    id: 'julian',
    nom: 'Julian Quero',
    role: 'Sortant',
    groupe: 'sortants',
    misEnJeu: [{ label: "Ce qu'il a mis", montant: 150000 }],
    flux: [
      ...versements(['Julian Quero']),
      { label: 'Total reçu à la signature', montant: 96481.95, note: 'les deux versements ci-dessus' },
    ],
    detient: [
      {
        label: "Compte courant, jusqu'à l'entrant",
        montant: 53518.04,
        note: 'il reste associé jusque-là',
      },
    ],
    frais: AUCUN_FRAIS,
    signe: 'Cessions de parts et quittances.',
    verifier: [EST_SORTANTS, EST_PHASES],
  },
  {
    id: 'orriols-sarl',
    nom: 'Orriols SARL',
    role: "Sortante à l'Est, apporteuse à l'Ouest",
    groupe: 'sortants',
    misEnJeu: [{ label: "Ce qu'elle a mis", montant: 200000 }],
    flux: versements(['Orriols SARL']),
    detient: [
      {
        label: "Quotes-parts qui restent à l'Ouest",
        montant: 70078.54,
        note: `lots de la famille et de LAOM, ${coef(4.04)} coefficients`,
      },
    ],
    frais: fraisOuest('Orriols SARL'),
    signe: "Partage partiel, cession de ses sept parts et quittance à l'arrivée de l'entrant.",
    verifier: [EST_SORTANTS, OUEST_APPORTS],
  },
]

// ============================================================
// LES FOYERS DE L'OUEST
// ============================================================

/** Ce qu'un associé de l'Ouest sort en numéraire : ses frais annexes. */
function fluxOuest(frais: FicheFrais, note: string): FicheLigne[] {
  if (frais.total === undefined) return [{ label: 'Aucun versement', texte: note }]
  return [{ label: 'À payer à la signature', montant: frais.total, note }]
}

const fraisCharly = fraisOuest('Amandine & Charly')
const fraisClaire = fraisOuest('Claire & Baptiste')
const fraisLaetitia = fraisOuest('Laetitia Brene')
const fraisLin = fraisOuest('David Lin')
const fraisCoste = fraisOuest('David Coste')
const fraisKhaldoun = fraisOuest('Khaldoun')
const fraisLaom = fraisOuest('LAOM / Ferme du Verseau')

const LOT_APPORTE = 'ses frais annexes ; le lot, lui, est apporté en nature'

const foyersDeLOuest: Personne[] = [
  {
    id: 'khaldoun',
    nom: 'Khaldoun Alshaar',
    role: "Entrant à l'Ouest",
    groupe: 'ouest',
    misEnJeu: [
      {
        label: 'Sa quote-part du domaine',
        montant: apportDe('Khaldoun Alshaar'),
        note: "son apport à la SCIA Ouest, qu'il porte lui-même",
      },
    ],
    flux: lignesKhaldoun(),
    detient: lotsDe('Khaldoun'),
    frais: fraisKhaldoun,
    signe: `Entrée aux statuts de la SCIA Ouest, apport de sa quote-part ; un contrat de prêt si le prêt de ${eur(30000)} de Patricia est confirmé.`,
    verifier: [OUEST_KHALDOUN, OUEST_FRAIS],
    note: "Charly prend en charge la dalle, les réseaux et les gaines de l'atelier du rez-de-chaussée.",
  },
  {
    id: 'orriols-aubert',
    nom: 'Amandine Orriols & Charly Aubert',
    role: "Associés à l'Ouest",
    groupe: 'ouest',
    misEnJeu: [
      {
        label: 'Leur apport',
        montant: apportDe('Amandine Orriols & Charly Aubert'),
        note: `Petit Shambala ${eur(77000)} + studio ${eur(15500)}`,
      },
    ],
    flux: [
      ...fluxOuest(fraisCharly, LOT_APPORTE),
      {
        label: RECUPERE_MAM,
        montant: avanceCharly.recupere,
        note: `${eur(avanceCharly.avance)} avancés, moins leur part de ${eur(avanceCharly.part)}`,
      },
    ],
    detient: lotsDe('Amandine & Charly'),
    frais: fraisCharly,
    signe: 'Statuts de la SCIA Ouest, apport de leurs lots.',
    verifier: [OUEST_APPORTS, OUEST_FRAIS],
  },
  {
    id: 'orriols-fromont',
    nom: 'Claire Orriols & Baptiste Fromont',
    role: "Associés à l'Ouest",
    groupe: 'ouest',
    misEnJeu: [
      {
        label: 'Leur apport',
        montant: apportDe('Claire Orriols & Baptiste Fromont'),
        note: `lot ${eur(40639)} + tiny ${eur(49000)}`,
      },
    ],
    flux: [
      ...fluxOuest(fraisClaire, LOT_APPORTE),
      {
        label: RECUPERE_MAM,
        montant: avanceClaire.recupere,
        note: `${eur(avanceClaire.avance)} avancés, moins leur part de ${eur(avanceClaire.part)}`,
      },
    ],
    detient: lotsDe('Claire & Baptiste'),
    frais: fraisClaire,
    signe: 'Statuts de la SCIA Ouest, apport de leurs lots.',
    verifier: [OUEST_APPORTS, OUEST_FRAIS],
  },
  {
    id: 'laetitia',
    nom: 'Laetitia Brene',
    role: "Associée à l'Ouest",
    groupe: 'ouest',
    misEnJeu: [
      {
        label: 'Son apport',
        montant: apportDe('Laetitia Brene'),
        note: `logement ${eur(130343.33)} + atelier ${eur(44896.04)}`,
      },
      { label: 'Dont sa quote-part du domaine', montant: 17346.17 },
    ],
    flux: fluxOuest(fraisLaetitia, LOT_APPORTE),
    detient: lotsDe('Laetitia Brene'),
    frais: fraisLaetitia,
    signe: 'Statuts de la SCIA Ouest, apport de ses lots.',
    verifier: [OUEST_LOTS, OUEST_FRAIS],
  },
  {
    id: 'david-lin',
    nom: 'David Lin',
    role: "Associé à l'Ouest",
    groupe: 'ouest',
    misEnJeu: [
      { label: 'Son apport', montant: apportDe('David Lin') },
      { label: 'Dont sa quote-part du domaine', montant: 17346.17 },
    ],
    flux: fluxOuest(fraisLin, LOT_APPORTE),
    detient: lotsDe('David Lin'),
    frais: fraisLin,
    signe: 'Statuts de la SCIA Ouest, apport de son lot.',
    verifier: [OUEST_LOTS, OUEST_FRAIS],
  },
  {
    id: 'david-coste',
    nom: 'David Coste',
    role: "Associé à l'Ouest",
    groupe: 'ouest',
    misEnJeu: [
      { label: 'Son apport', montant: apportDe('David Coste') },
      { label: 'Dont sa quote-part du domaine', montant: 8673.09, note: 'un demi-coefficient' },
    ],
    flux: fluxOuest(fraisCoste, LOT_APPORTE),
    detient: lotsDe('David Coste'),
    frais: fraisCoste,
    signe: 'Statuts de la SCIA Ouest, apport de son lot.',
    verifier: [OUEST_LOTS, OUEST_FRAIS],
  },
  {
    id: 'ferme-du-verseau',
    nom: 'La Ferme du Verseau / LAOM',
    role: "Société associée à l'Ouest",
    groupe: 'ouest',
    misEnJeu: [
      {
        label: 'Son apport',
        montant: apportDe('La Ferme du Verseau'),
        note: 'coliving, foyer commun, tiny Eliott, accueil',
      },
    ],
    flux: fluxOuest(fraisLaom, 'sa provision de notaire'),
    detient: [
      {
        label: 'Coliving, foyer commun, tiny Eliott, accueil',
        texte: 'les lots apportés par la Ferme du Verseau',
      },
    ],
    frais: fraisLaom,
    signe: 'Statuts de la SCIA Ouest, apport de ses lots.',
    verifier: [OUEST_LOTS, OUEST_FRAIS],
  },
  {
    id: 'association',
    nom: 'Association des habitants',
    role: "Associée à l'Ouest",
    groupe: 'ouest',
    misEnJeu: [
      {
        label: 'Son apport',
        montant: apportDe('Association des habitants'),
        note: 'un tiers du foyer commun',
      },
    ],
    flux: [
      { label: 'Aucun versement', texte: 'son apport est sa part du foyer commun' },
    ],
    detient: [
      { label: 'Foyer commun', montant: 35506.2, note: 'un tiers' },
    ],
    frais: { detail: 'Aucun : ni main à la main, ni foyer commun, ni provision de notaire.' },
    signe: 'Statuts de la SCIA Ouest.',
    verifier: [OUEST_APPORTS],
  },
]

// ============================================================
// LES TROIS GROUPES
// ============================================================

export const groupesPersonnes: GroupePersonnes[] = [
  { cle: 'est', eyebrow: "Les foyers de l'Est", personnes: foyersDeLEst },
  { cle: 'sortants', eyebrow: 'Ceux qui sortent', personnes: ceuxQuiSortent },
  { cle: 'ouest', eyebrow: "Les foyers de l'Ouest", personnes: foyersDeLOuest },
]

export const personnesIntro =
  'Cliquez sur votre nom. Les montants viennent du classeur du 3 septembre.'
