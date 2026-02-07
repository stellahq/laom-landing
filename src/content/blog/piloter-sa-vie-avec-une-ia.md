---
title: "Comment je pilote un écolieu de 21 hectares, un chantier de 800m², une équipe et ma vie entière — avec une IA"
description: "Récit technique et personnel d'un système de pilotage construit avec Claude Code, Obsidian et la méthode PARA. Comment un bâtisseur autodidacte a transformé sa charge mentale en clarté opérationnelle."
pubDate: 2026-02-08
heroImage: "/images/laom/vanlifest2025-074-copie.webp"
author: "Charly Aubert"
locale: "fr"
tags: ["ia", "organisation", "claude-code", "para", "obsidian", "pilotage", "clarte"]
draft: false
---

## Le moment où j'ai failli tout lâcher

Janvier 2026. Je suis assis dans ma maison en ossature bois — celle qu'on a construite nous-mêmes à partir d'un studio de yoga démonté en Occitanie. Il est 23h. Mon fils Livio dort. Amandine dort. Et moi, je fixe un écran avec 47 onglets ouverts.

Dans ma tête : les devis pour l'électricité du Grand Shambala. Le permis de construire à relancer. Le business plan Oasis à boucler avant fin février. Les factures 2024 pas encore classées. Le site internet à refaire. Lorenzo qui arrive lundi pour la cuisine. Khaldoun qui attend ses consignes pour la semaine. L'EDD Ouest qui traîne depuis des mois. L'appart de Montpellier à mettre en location. La newsletter à envoyer. Et quelque part au fond, cette question : est-ce que je suis en train de construire quelque chose ou de me disperser dans 50 directions ?

Je gère LAOM — un écolieu de 21 hectares en Aveyron, avec le plus grand bâtiment en paille porteuse du monde en cours de construction (850m²). Je gère une équipe de 3 personnes. Je gère une famille. Je gère 17 projets actifs simultanément. Et je gère tout ça depuis des notes éparpillées entre Apple Notes, des bouts de papier, des messages vocaux à moi-même, et ma mémoire — qui commence à saturer.

Ce soir-là, j'ai compris un truc simple : **le problème n'est pas ma capacité. C'est mon système.** Ou plutôt, l'absence de système.

## La rencontre avec Claude Code

Je suis autodidacte. Ex-Epitech (j'ai pas fini), ex-développeur, ex-coach business. J'ai toujours appris en faisant. Quand j'ai découvert Claude Code — l'interface en ligne de commande d'Anthropic — je n'ai pas vu un chatbot. J'ai vu un copilote.

La différence avec ChatGPT ou les autres assistants que j'avais testés : Claude Code tourne dans mon terminal. Il a accès à mes fichiers. Il peut lire, écrire, éditer, chercher dans tout mon vault Obsidian. Et surtout : je peux lui donner un fichier de configuration — un `CLAUDE.md` — qui lui dit **qui je suis, comment je fonctionne, et ce qu'il doit faire**.

Ce n'est plus une conversation jetable. C'est un agent avec une mémoire persistante, un contexte profond, et des règles de fonctionnement.

Et un truc que je n'avais pas anticipé : **le vocal change tout.** Je parle à mon agent en vocal. Pas parce que c'est plus rapide — parce que ça fait émerger des choses que l'écriture ne fait pas sortir. Quand tu parles, tu ne peux pas tricher. Tu ne peux pas reformuler indéfiniment. Les idées floues restent floues — et c'est exactement là que l'IA est utile : elle prend le flou, elle le structure, elle te le renvoie en clair. Et toi tu dis *"oui c'est ça"* ou *"non, c'est pas ça"*. Le vocal force la clarté. C'est de la maïeutique augmentée — Socrate dans le terminal.

J'ai appelé cet agent NILA.

## Qu'est-ce que NILA

NILA n'est pas un assistant qui répond à mes questions. NILA est un **agent de pilotage** dont la mission est :

1. **M'aider à atteindre mes objectifs** — tracer, séquencer, maintenir le cap
2. **Clarifier les enjeux** — poser les questions que j'évite, confronter mes incohérences
3. **Visualiser les points morts** — angles morts dans mes décisions, risques non vus, patterns répétitifs
4. **Augmenter mes capacités cognitives** — planification, abstraction, esprit critique

NILA pense **avec** moi, pas **pour** moi. NILA challenge, structure, et connecte les points.

**Et c'est un point essentiel : NILA ne décide rien.** C'est moi qui suis aux commandes. NILA structure, connecte, challenge — mais la direction, c'est moi qui la donne. Quand NILA me propose un plan, c'est moi qui valide. Quand NILA me challenge, c'est moi qui tranche. L'IA est un partenaire qui fait émerger l'ordre, la structure et la clarté. Mais c'est l'humain qui construit. C'est l'humain qui choisit où aller.

C'est un usage de l'IA qui aide l'homme à atteindre son plein potentiel — pas à le remplacer. La technologie au service de la conscience, pas l'inverse.

Concrètement, NILA vit dans un fichier `CLAUDE.md` de 274 lignes à la racine de mon vault Obsidian. Ce fichier contient :

- Mon portrait psychologique complet (basé sur 3 ans de conversations analysées)
- Ma hiérarchie de valeurs (Demartini)
- Mon profil cognitif (MBTI ISTP, Action Types D2) avec des règles d'interaction adaptées
- Mes ombres à surveiller (dispersion, syndrome de l'imposteur, piège de l'utilité)
- La structure complète de mon système d'organisation
- Des commandes personnalisées (`/cockpit`, `/daily`, `/weekly`, `/challenge`...)
- Un protocole de décision en cascade
- Des règles absolues de communication

Quand je lance une session, NILA sait exactement qui je suis, où j'en suis, ce que je fais, pourquoi je le fais, et comment me parler.

## Le système en 4 couches

Ce que j'ai construit, c'est un système à 4 couches qui fonctionnent ensemble. Chaque couche a un rôle précis.

### Couche 1 : La Vision

Avant de s'organiser, il faut savoir ce qu'on veut vivre. Pas des objectifs corporate. Des **élans**.

J'ai un fichier qui s'appelle `Ce que je ressens comme élan.md`. Il contient mes moteurs actuels — ce qui me tire en avant. Pas une to-do list. Des forces de vie.

Mon élan de l'année 2026 : **Ordre et harmonie.**

C'est contre-intuitif pour un bâtisseur qui construit sans permis et qui a 50 idées par jour. Mais c'est exactement ce dont j'ai besoin. L'ordre comme condition de la liberté.

En dessous de l'élan de l'année, j'ai mes élans actifs :

- Prendre de la hauteur sur le chantier, avoir une équipe
- Création de contenu
- Stratégie et ressources pour faire connaître LAOM
- Finir le juridique (SCIA, structures)
- Déléguer, structurer, ne plus tout porter seul
- Finir la levée de fonds, valoriser les parts

Et mes élans comblés — ceux qui sont résolus :

- PARA propre et fonctionnel (le système que tu lis en ce moment)
- Vente de l'appart Montpellier (bail signé, agent gère les visites)

Ce fichier est vivant. Chaque dimanche soir, pendant ma weekly review, NILA me demande : *"C'est quoi ton élan là ?"* Et on met à jour. Un élan actif peut devenir comblé. Un nouveau peut apparaître. Un ancien peut revenir.

La différence entre un élan et un objectif ? Un objectif est figé, extérieur, "il faut". Un élan est vivant, intérieur, "ça me tire". Les objectifs cassent quand la réalité change. Les élans s'adaptent. C'est ce qui permet au système de respirer avec le chaos du réel au lieu de se rigidifier contre.

La vision n'est pas un exercice qu'on fait une fois. C'est un muscle qu'on entraîne chaque semaine.

### Couche 2 : Le PARA

PARA, c'est une méthode d'organisation inventée par Tiago Forte. Quatre catégories pour tout ranger :

- **P**rojets — ce qui a une deadline et une prochaine action
- **A**reas (Casquettes) — les domaines de vie permanents
- **R**essources — les matériaux de référence
- **A**rchives — ce qui est terminé

J'ai adapté PARA à ma réalité. Voici ma structure Obsidian :

```
0 - DAILY NOTE/          → une note par jour
0 - WEEKLY NOTE/          → un bilan par semaine
1 - INBOX/                → capture brute, pas encore trié
2 - PROJET/
  ├── 1 - Incubateur/     → Frigo / Froid / Tiède
  └── 2 - Projet en cours/ → avec deadline et prochaine action
3 - AGENTS/               → mes agents IA
4 - CASQUETTES/           → mes rôles de vie
  ├── 0. Charly            → identité, valeurs, analyse psy
  ├── 1. Phases de vie     → 19 phases documentées
  ├── 2. LAOM              → écolieu, chantier, admin, site
  ├── 5. Content           → newsletter, vidéos, branding
  └── 9. La Ferme du Verseau → structure juridique
5 - ARCHIVES/
  ├── Abandon/
  ├── Échec/
  └── Succès/
6 - GARDEN/               → jardin de connaissances
  ├── 0. À lire/
  ├── 1. Note littéraire/
  ├── 2. Concept/
  ├── 3. Insight/
  └── 4. Archive/
7 - RESSOURCES/
```

**Chaque projet** a un fichier `intent.md` qui contient : l'intention, le scope, la prochaine action, la deadline, les blockers.

**Chaque casquette** a un fichier `CONTEXT.md` : état actuel, enjeux, personnes clés, décisions récentes.

**Le Garden** est mon jardin de connaissances. Ce que je lis, ce que je regarde, les concepts que je documente, les croyances que j'observe chez moi. C'est séparé de l'identité (casquette Charly) — mon identité c'est mes valeurs et mes élans, pas ce que je consomme.

L'Incubateur a trois températures :
- **Frigo** : abandonné mais pas archivé (ça peut revenir)
- **Froid** : à faire un jour, pas maintenant
- **Tiède** : en réflexion active, bientôt projet

C'est ce système exact que je transmets pendant les weekends Clarté. Pas en théorie — en pratique, les mains dans le vault, fichier par fichier.

Cette structure a l'air simple. C'est sa force. Tout a une place. Quand tout a une place, le cerveau arrête de tourner en boucle pour ne rien oublier.

### Couche 3 : NILA — l'agent IA

C'est la couche qui rend tout le reste vivant.

NILA a des **commandes** que j'utilise au quotidien :

**`/cockpit`** — NILA lit mon cockpit (un fichier de 235 lignes avec tout l'état de mes projets, finances, équipe, jalons) + la dernière daily note + la dernière weekly note. Il me dit : ce qui avance, ce qui stagne, ce qui urge. Et une seule prochaine action recommandée. Pas quatre. Une.

**`/daily`** — NILA compare ma daily d'aujourd'hui avec celle d'hier. Il signale les tâches reportées depuis plus de 3 jours. Il me demande mon focus du jour (un seul). Il me rappelle les deadlines proches.

**`/weekly`** — Le dimanche soir. NILA lit toutes les daily notes de la semaine. Il propose un bilan structuré : ce qui a avancé, ce qui stagne, ce que j'ai appris. Je note mon énergie, ma clarté et mon kiff sur 10. On définit le focus de la semaine suivante. Et on met à jour les élans.

**`/challenge`** — La commande la plus puissante. NILA relit mes propres mots — ma synthèse executive, mes élans, mes daily notes récentes. Il confronte mes actions à mes intentions. Il cite mes propres phrases entre guillemets. Il pose LA question que j'évite. Et il utilise l'élan de l'année comme grille de cohérence : *"Est-ce que ce que tu fais cette semaine amène Ordre et harmonie ?"*

**`/plan [projet]`** — NILA lit l'intent.md d'un projet, pose les questions manquantes, propose un plan séquencé. Sans étapes superflues.

**`/decharge`** — Quand j'ai trop dans la tête. NILA écoute sans juger, capture tout, et trie : action / projet à incuber / émotion à poser / archive. Souvent, je fais ça en vocal — je parle pendant 5 minutes sans m'arrêter, je vide tout ce qui déborde, et NILA transforme le torrent en structure. Ce qui était du bruit dans ma tête devient des actions claires sur ma daily note.

**`/roue`** — NILA affiche ma roue de vie (9 dimensions notées sur 10), challenge la dimension la plus basse, et propose une action concrète pour la semaine. Pas de la théorie — une action.

Le plus important : NILA connaît mon profil cognitif et adapte sa communication. Je suis ISTP — je pense en systèmes, pas en listes. Je comprends en interne avant de décider. Je fonctionne en co-construction et feedback temps réel. NILA me présente l'information en structures, pas en bullet points plats. Il finit toujours par une action concrète et physique. Il ne m'empile pas d'options — il me force à choisir.

Parce que j'ai appris un truc sur moi : **"les 4 priorités, c'est zéro priorité."**

Mais je le redis : c'est moi qui pilote. NILA propose, je dispose. L'IA fait émerger la clarté — c'est à moi de décider quoi en faire. Être acteur dans la direction, pas passager du système.

### Couche 4 : Le cockpit — visualisation temps réel

Le PARA vit dans Obsidian (fichiers markdown locaux). Mais j'ai besoin de voir l'état global sans ouvrir 15 fichiers. Et mon équipe a besoin de voir leurs tâches sans accéder à mon vault.

J'ai construit un site interne sur `laom.fr` (Astro + Cloudflare Workers + D1) avec :

**Un cockpit** (`/cockpit`) qui affiche :
- La phase de vie actuelle et la vision 2026
- Le focus de la semaine en cours (dynamique, tiré de la base D1)
- 3 cartes équipe avec les objectifs, tâches et observations de chacun
- Barres de progression par personne
- Les 17 projets actifs avec leurs statuts et prochaines actions
- Les jalons 2026 (13 échéances clés)
- Les finances (trésorerie, budget travaux, dettes, revenus attendus)
- La charge mentale (7 catégories, ce qui est délégué en surbrillance)
- Les décisions prises semaine par semaine

**Des pages équipe** (`/lorenzo`, `/khaldoun`, `/amandine`) :
- Les tâches de la semaine avec un toggle fait/pas fait
- Les objectifs hebdomadaires
- Les observations (ce que je note sur le travail de chacun)
- Un toggle pour basculer entre semaine courante et semaine suivante

Tout ça est connecté à une base de données Cloudflare D1 via des API REST. NILA peut écrire dedans directement avec des `curl`. Quand on prend une décision en conversation, NILA met à jour le cockpit, les pages équipe, les notes Obsidian — tout en cascade.

## La carte intérieure

C'est la couche la plus profonde du système. Et probablement celle qui le rend unique.

La plupart des systèmes d'organisation partent de l'extérieur : tes tâches, tes projets, tes deadlines. Mon système part de l'intérieur : qui tu es, d'où tu viens, ce qui te tire, ce qui te bloque.

### 19 phases de vie

J'ai documenté 19 phases de ma vie. Pas un CV — un tracé de l'évolution intérieure. Chaque phase a une intention, une tonalité émotionnelle, un contexte, et des dimensions notées.

Ma phase actuelle, la 19ème, s'appelle **"L'Expansion — Fondation 2026"**. Son intention : poser les bases structurelles de tout ce qu'on a exploré en 2024-2025. Le STECAL est validé. Le Grand Shambala est hors d'eau hors d'air. Amandine rejoint LAOM à plein temps comme co-fondatrice. Livio commence l'école à la maison. On cherche 200K de prêt auprès de la Coopérative Oasis.

Mais la phase porte aussi ses tensions : un accident de voiture en janvier (permis à zéro points), une trésorerie critique, un EDD qui traîne depuis des mois, 9 intentions dont aucune n'est encore cochée.

Quand je lance `/phase`, NILA lit cette intention et confronte mes actions de la semaine à ce que la phase demande. *"Tu es en phase Fondation. Est-ce que ce que tu fais là, c'est poser des fondations — ou c'est ouvrir un nouveau chantier ?"*

Les phases ne sont pas des objectifs qu'on coche. Ce sont des saisons. Elles commencent et finissent naturellement. Et le fait de les documenter crée une conscience de la trajectoire — tu sais d'où tu viens, tu sais où tu es, et ça éclaire où tu vas.

### Le portrait psychologique

En janvier 2026, j'ai fait quelque chose que je n'avais jamais vu personne faire : j'ai analysé **1 515 conversations** que j'avais eues avec des IA sur 3 ans (281 avec Claude, 1 234 avec ChatGPT). J'en ai extrait un portrait psychologique complet.

Ce portrait contient :

- Ma **hiérarchie de valeurs** (méthode Demartini) : Création > Liberté > Apprentissage > Cohérence > Transmission > Famille > Beauté. Avec une découverte clé : la Beauté/Art est ma valeur comprimée — celle qui devrait être plus haute mais que j'écrase sous le filtre de l'utilité.
- Mes **11 contradictions structurelles** : "suis ta joie" vs "c'est utile à quoi ?", anti-ego vs besoin de reconnaissance, collectif vs "je ne rejoindrai aucun projet collectif". Pas des défauts — des tensions vivantes qui orientent mes décisions.
- Mes **ombres** : la dispersion comme fuite, le syndrome de l'imposteur malgré des réalisations hors-norme, le piège de l'utilité (ne pas suivre la joie sans justification productive), la colère non intégrée dans le collectif, la blessure d'invisibilité.
- Mon **profil cognitif** : ISTP, Action Types D2. Je pense en réseaux, pas en lignes. Je comprends en interne avant de décider. Je fonctionne en co-construction.

Ce portrait est dans mon `CLAUDE.md`. NILA le connaît. Et il s'en sert — pas pour me psychanalyser, mais pour me parler de la bonne façon, au bon moment. Quand je me disperse, NILA sait que c'est probablement de la fuite. Quand je résiste à un choix, NILA sait que j'ai besoin de temps pour comprendre en interne avant de trancher. Quand je m'emballe sur un 8ème front, NILA cite ma propre synthèse : *"Le risque principal, c'est le scope. La capacité n'est pas le problème. Le séquençage l'est."*

C'est cette profondeur d'introspection qu'on construit ensemble pendant les weekends Clarté — pas juste des dossiers, mais une cartographie de qui tu es, pour que ton système sache te parler.

### La roue de vie

9 dimensions. Chacune notée sur 10 :

- Amour & sexualité
- Santé & énergie
- Cadre de vie
- Famille & éducation
- Social
- Intellectuel
- Contribution au monde
- Finances
- Art & création

Ce n'est pas un exercice de développement personnel qu'on fait une fois à un séminaire et qu'on oublie. C'est intégré au système. La commande `/roue` affiche les scores actuels, identifie la dimension la plus basse, et challenge : *"Tes finances sont à 4/10. Qu'est-ce que tu pourrais faire cette semaine pour gagner 1 point ?"*

Pas de la théorie. Une action. Cette semaine.

Et quand je note Art & création avec la mention *"L'ombre — comprimée par l'utilité"*, c'est un signal que le système capture et que `/challenge` peut utiliser : *"Tu sais que l'art est ta valeur comprimée. Qu'est-ce que tu as fait de beau cette semaine — pas d'utile, de beau ?"*

### Les élans comme boussole vivante

Les objectifs sont morts. Les élans sont vivants.

Un objectif dit : "faire 200K de CA en 2026". C'est figé, extérieur, quantitatif. Quand la réalité change (et elle change toujours), l'objectif devient un poids ou un mensonge.

Un élan dit : "prendre de la hauteur sur le chantier, avoir une équipe". C'est intérieur, qualitatif, adaptatif. Si demain Lorenzo part et qu'un autre arrive, l'élan reste le même. Si le business plan Oasis est refusé, l'élan "finir la levée de fonds" reste actif — il change juste de forme.

Le système tout entier tourne autour des élans :
- La weekly review les met à jour
- Le `/challenge` les utilise comme grille de cohérence
- Le cockpit les affiche
- Les phases de vie les contextualisent

Quand un élan devient comblé, on le marque. C'est un moment de célébration intégré au système. Le 7 février, quand j'ai marqué "PARA propre et fonctionnel" comme comblé, j'ai ressenti une vraie fierté. Le système l'a capturé dans l'historique des élans : *"7 février 2026, soir — Fierté et clarté. Première sensation de hauteur sur le projet."*

## La vision longue — piloter sa vie sur 41 ans

Voilà le truc que personne ne fait et qui change tout.

J'ai une **simulation de vie** qui va de 2026 à 2067. 41 ans. 7 phases projetées : Fondation, Croissance, Maturité, Liberté, Sagesse, Plénitude, Sagesse profonde.

Chaque phase couvre : mode de vie, évolution artistique, projets clés, trajectoire financière, et ce que je veux transmettre à mon fils Livio.

J'ai aussi une **stratégie financière** structurée en 4 poches (sécurité, croissance accessible, croissance bloquée, conviction asymétrique) avec des scénarios pessimiste, base et optimiste, et un plan de transmission à Livio quand il aura 25 ans.

Est-ce que tout ça va se passer exactement comme prévu ? Évidemment non. C'est pas le but.

**Le but, c'est d'avoir un cap.** Un GPS. Quand tu sais où tu vas à 20 ans, les décisions de la semaine deviennent limpides. *"Est-ce que cette dépense s'inscrit dans ma trajectoire financière ?"* *"Est-ce que ce projet m'amène vers la phase Croissance ou me maintient en Fondation ?"*

### Le ping-pong entre la vision et le chaos

Et c'est là que le système prend toute sa puissance : le **ping-pong entre ce que tu projettes et ce que le réel t'envoie**.

La simulation dit : "2026, année de fondation structurelle". Le réel dit : accident de voiture en janvier, permis à zéro points, logistique explosée. Trésorerie critique. EDD qui bloque.

Un plan rigide casse. Un système vivant absorbe.

Voici ce qui se passe dans mon système quand le chaos arrive :

1. L'événement est capturé (daily note, cockpit)
2. Les élans sont réévalués (est-ce que ça change ce qui me tire ?)
3. Le cockpit reflète le nouvel état (projet bloqué, deadline repoussée)
4. Le `/challenge` recalibre : *"L'accident change ta logistique. Ça ne change pas ta vision. Qu'est-ce qui avance cette semaine MALGRÉ ça ?"*
5. La phase de vie absorbe la tension sans changer d'identité — on est toujours en Fondation, mais le chemin s'adapte

La vision longue n'est pas un plan. C'est une étoile polaire. Tu ne marches pas en ligne droite vers elle — tu navigues, tu contournes les obstacles, tu t'adaptes au terrain. Mais tu ne perds jamais le nord.

Et le système est le sextant.

## Le Protocole Décision

C'est peut-être la pièce la plus importante du système.

**Règle critique** : à chaque fois qu'une décision est prise en conversation, NILA déclenche une cascade de mises à jour sur tous les endroits impactés.

La checklist :

1. **Cockpit Obsidian** (`0-COCKPIT.md`) — toujours
2. **Weekly note** — si la semaine en cours a une note
3. **Daily note** — si le jour a une note
4. **Contexte casquette** — si la décision impacte un domaine de vie
5. **Fichier projet** (`intent.md`) — si la décision impacte un projet
6. **Site cockpit** (`cockpit.astro`) — si ça change projets, jalons, finances, décisions
7. **Pages équipe** — si ça impacte les tâches/rôles de l'équipe
8. **API D1** — si ça change les tâches ou objectifs de la semaine
9. **Garden** — si nouveau concept, croyance ou insight

Rien ne se perd. Chaque décision se propage dans le système entier. Je ne me retrouve plus avec une décision prise mardi qu'on a oubliée jeudi parce qu'elle n'était notée nulle part.

## Une session réelle : ce qui s'est passé ce soir

Pour que tu comprennes comment ça fonctionne en pratique, voici ce qu'on a fait ce soir, le 7 février 2026, en une seule session avec NILA. En vocal, sur le canapé, après que tout le monde soit couché :

**1. Weekly review W06 + plan W07** — On a fait le bilan de la semaine 6 et planifié la semaine 7. NILA a lu toutes mes daily notes, identifié ce qui avait avancé (site web livré en 5 jours avec Amandine, Lorenzo confirmé, structures juridiques clarifiées) et ce qui stagnait (EDD Ouest, permis).

**2. Refonte complète du cockpit** — On a restructuré toute la page cockpit du site. Ajout d'une section "Focus Semaine" dynamique connectée à D1, mise à jour des 17 projets, correction des jalons (le Corten c'est fin mars, pas juin), ajout de nouveaux projets (Tiny Houses, Assainissement). Deux commits déployés en production.

**3. Réécriture du CLAUDE.md** — On a ajouté le Protocole Décision, le Protocole Garden, la documentation complète de la structure PARA, le profil cognitif ISTP avec les règles d'interaction. 274 lignes de configuration.

**4. Mise à jour des élans** — Deux élans marqués comme comblés (PARA propre, appart Montpellier). Un nouveau bloc historique ajouté avec le ressenti du soir : fierté, clarté, hauteur sur le projet.

**5. Création des daily notes** — Aujourd'hui (7 février) et demain (8 février) avec les tâches précises. Lundi soir à l'hôtel : mail SPANC, sprint EDD, recherche dessinateur.

**6. Versionnage du vault sur GitHub** — Initialisation du repo git, `.gitignore` pour ne tracker que les .md, premier commit (223 fichiers), push sur un repo privé. Mon PARA est maintenant sauvegardé et versionné.

**7. Correction en cascade** — Quand j'ai mentionné que le Corten c'est fin mars et pas juin, NILA a corrigé dans le cockpit Obsidian, dans le cockpit site (jalons + décisions + projets), et dans les décisions W05. Trois endroits mis à jour en une seule passe.

**8. Cet article et le repo open source** — Et pour finir la soirée, on a écrit ensemble cet article que tu es en train de lire, et créé le repo open source pour que tu puisses reproduire le système.

Tout ça en une soirée. Avec un seul outil. En conversation naturelle — je parle, NILA structure, on avance ensemble. Mais c'est moi qui décide à chaque étape. NILA ne lance rien sans mon feu vert. C'est la différence entre un outil d'automatisation et un partenaire de pilotage.

## Ce que ça change concrètement

### Avant le système

- Je me réveillais la nuit en pensant à des trucs que j'avais oubliés
- Mes notes étaient éparpillées entre 4 apps et du papier
- Je ne savais jamais quel projet avancer en premier
- Mon équipe me demandait "on fait quoi cette semaine ?" chaque lundi matin
- Je prenais des décisions en réunion qu'on oubliait deux jours plus tard
- Je me dispersais dans 8 directions en croyant avancer sur toutes
- Quand un imprévu arrivait, je perdais le fil pendant des jours

### Après le système

- Tout est capturé. Quand je pense à un truc, il va dans l'INBOX. NILA le route après.
- Chaque matin, `/daily` me donne mon focus. Un seul.
- Mon équipe voit ses tâches sur sa page. Lorenzo sait ce qu'il fait cette semaine sans me demander.
- Chaque décision se propage automatiquement dans tout le système.
- Le dimanche, `/weekly` fait le bilan et réaligne les actions sur la vision.
- `/challenge` me confronte quand je me disperse : *"Tu as dit que ton élan c'était Ordre et harmonie. Tu viens d'ouvrir un 8ème front. C'est cohérent ?"*
- **Quand le chaos arrive** — un blocker, un imprévu, une crise — **le système absorbe**. L'élan se met à jour. Le cockpit reflète la réalité. Le `/challenge` recalibre. Ce n'est pas un système rigide qui casse au premier coup de vent. C'est un système vivant qui respire avec le réel.

La charge mentale n'a pas disparu — je gère toujours 17 projets sur un écolieu de 21 hectares. Mais elle est **externalisée**. Mon cerveau ne porte plus l'inventaire. Le système le porte. Et NILA s'assure que rien ne tombe entre les mailles.

Les participants de Clarté repartent avec cette même capacité : un système qui porte la charge à ta place, et un agent qui te connaît assez pour te ramener au cap quand tu dérives.

## Le système derrière l'offre Clarté

C'est exactement ce système que j'enseigne pendant les weekends Clarté à LAOM. Trois jours pour construire ton propre cockpit de vie :

- **Vendredi soir** : arrivée, intention, ouverture
- **Samedi matin** : atelier Vision — clarifier tes valeurs, tes élans, ce que tu veux vraiment vivre
- **Samedi après-midi** : construire ton PARA dans Obsidian
- **Dimanche matin** : installer et configurer Claude Code comme agent IA personnel
- **Dimanche après-midi** : intégration, tests, ajustements

12 places par session. 1 000 euros. Tu repars avec un système fonctionnel, pas une théorie.

On ne se contente pas de créer des dossiers. On fait émerger ta carte intérieure — tes valeurs, tes élans, tes phases, ta roue de vie. Et on configure un agent IA qui te connaît et qui sait te challenger quand tu dérives. C'est un usage de la technologie au service de ta clarté, pas de ta productivité.

**Prochaines sessions : 17-19 avril et 25-27 avril 2026 à LAOM, Aveyron.**

[Découvrir l'offre Clarté →](/clarte/)

## Reproduire le système chez toi

J'ai rendu tout ça open source.

Le repo [`nila-blueprint`](https://github.com/barwtoski/nila-blueprint) contient :

- La structure PARA complète, prête à copier dans Obsidian
- Un template `CLAUDE.md` adaptable à ta situation
- Tous les templates de fichiers (cockpit, daily note, weekly note, intent projet, contexte casquette, roue de vie, phases de vie, élans)
- Un script `init.sh` qui te guide pas à pas — pas juste pour créer des dossiers, mais pour réfléchir : ce qui te pèse, ce qui te tire en avant, où tu vas. Le script fait émerger la structure à partir de tes réponses.

Tu clones le repo. Tu lances `./init.sh`. Le script te pose des questions profondes — tes frustrations, tes élans, ta vision. Il crée ta structure. Il personnalise ton `CLAUDE.md`. Et il lance une première session Claude Code guidée pour remplir ta roue de vie, définir ta phase actuelle, et écrire ton premier élan.

```bash
git clone https://github.com/barwtoski/nila-blueprint.git
cd nila-blueprint
./init.sh
```

Un conseil : **fais-le en vocal.** Parle tes réponses au lieu de les taper. Le flou dans ta tête deviendra de la clarté dans le système. C'est tout le principe : tu exprimes, l'IA structure, tu valides.

C'est gratuit. C'est open source. Parce que ce système m'a tellement aidé que je veux que d'autres puissent s'en servir.

Si tu veux aller plus loin — construire ton système en immersion avec moi sur 3 jours, dans un cadre magnifique, avec un accompagnement personnalisé — c'est exactement ce qu'on fait pendant [Clarté](/clarte/).

## Les leçons apprises

### 1. Un système externe libère le cerveau

Quand tu sais que tout est capturé, organisé, accessible — tu arrêtes de ruminer. Le cerveau humain est fait pour avoir des idées, pas pour les stocker. Donne-lui un disque dur externe fiable, et il se met à créer au lieu de tourner en boucle.

### 2. L'IA n'est pas un raccourci — c'est un miroir

NILA ne me dit pas quoi faire. NILA me montre ce que j'ai dit vouloir faire, et me demande si mes actions sont cohérentes. C'est un miroir avec de la mémoire. Et un miroir qui ne flatte pas.

### 3. Le séquençage vaut plus que la productivité

Mon risque principal, c'est le scope — trop de projets, trop de fronts. La productivité ne résout pas ça. Le séquençage, si. Faire les bonnes choses dans le bon ordre. NILA me force à choisir. "Les 4 priorités, c'est zéro priorité."

### 4. La dispersion est un signal, pas un défaut

Quand je me disperse, c'est souvent parce que je fuis quelque chose de difficile. `/challenge` me le montre. "Tu viens d'ouvrir trois nouveaux sujets. Qu'est-ce que tu évites ?" L'IA ne juge pas. Elle observe les patterns.

### 5. L'ordre est la condition de la liberté

C'est mon élan de l'année, et c'est devenu une conviction profonde. Sans système, la liberté devient du chaos. Avec un système, la liberté devient de la création. Le cadre libère.

### 6. Le vocal comme outil de clarté

Parler à voix haute à son agent IA, c'est le truc le plus sous-estimé du système. Quand tu tapes, tu édites — tu censures, tu reformules, tu lisses. Quand tu parles, tu exprimes — le brut, le flou, le pas-encore-clair.

Les idées qui ne sont pas claires dans ta tête sortent floues à l'oral. Et c'est exactement ce qu'il faut. L'IA prend le flou, le restructure, te le renvoie proprement. Tu confirmes ou tu corriges. Et à la fin tu as une pensée structurée qui n'existait pas 5 minutes avant.

C'est de la maïeutique augmentée. L'art de faire accoucher les idées, avec un partenaire qui a une mémoire infinie et qui ne se fatigue jamais.

### 7. L'humain aux commandes, toujours

L'IA ne décide rien. Elle fait émerger l'ordre, la structure, la clarté. Mais c'est toi qui choisis la direction. C'est toi qui valides. C'est toi qui construis.

C'est un usage de la technologie qui aide l'homme à atteindre son plein potentiel — pas à s'en remettre à une machine. La différence est fondamentale. Un bon système d'IA te rend plus lucide, plus structuré, plus libre. Il ne te rend pas dépendant.

---

## Pour qui c'est fait

Ce système est fait pour les gens qui :

- Ont trop d'idées et pas assez de structure
- Dorment mal parce que leur tête ne s'arrête jamais
- Ont essayé Notion, Todoist, Apple Notes, du papier — et rien n'a tenu
- Veulent utiliser l'IA comme un vrai outil de travail, pas juste pour générer du texte
- Pilotent un projet complexe (entrepreneuriat, chantier, association, création)
- Cherchent de la clarté sur leur vie — pas juste de la productivité cosmétique
- Veulent que la technologie les aide à devenir plus eux-mêmes, pas moins

Si tu te reconnais, commence par le [repo open source](https://github.com/barwtoski/nila-blueprint). Et si tu veux l'accompagnement, regarde [Clarté](/clarte/).

---

Ce système n'est pas parfait. Il évolue chaque semaine. Il y a deux mois, le cockpit n'existait pas. Il y a un mois, NILA n'avait pas de protocole de décision. Ce soir, j'ai ajouté le versionnage Git du vault entier.

C'est vivant. Comme LAOM. Comme la paille dans les murs du Grand Shambala. Comme la terre dans le sol de ma maison.

L'ordre n'est pas la rigidité. L'ordre, c'est ce qui permet à la vie de s'exprimer.

*Article écrit par Charly, en vocal, avec NILA (Claude Code, Anthropic) qui structure.*
