# LAOM Image Manager

Outil de gestion des images pour le site LAOM.

## Fonctionnalites

- **Phototheque organisee** : photos classees par dossiers thematiques
- **Detection des placeholders** : analyse automatique des pages .astro
- **Compression automatique** : conversion en WebP optimise
- **Renommage SEO** : noms de fichiers generes depuis le contexte
- **Publication auto** : commit + push automatique apres placement d'une image
- **Audit SEO** : verification et suggestion de renommage des images existantes

## Installation

```bash
# Depuis la racine du projet LAOM
npm run image-manager

# Ou raccourci
npm run im
```

## Utilisation

1. L'outil ouvre automatiquement `http://localhost:3001`
2. Le serveur Astro demarre en parallele sur `http://localhost:3000`

### Workflow

1. **Ajouter des photos** : glisser-deposer dans la zone d'upload
2. **Selectionner une page** : cliquer dans la liste des pages
3. **Placer une image** : glisser une photo sur un placeholder
4. **C'est publie** : l'image est compressee, le code est modifie, le site est deploye

### Dossiers phototheque

Les photos sources sont organisees dans `/phototheque/` :
- `grand-shambala/`
- `petit-shambala/`
- `salle-pratique/`
- `domaine/`
- `portraits/`
- `non-classe/`

### Audit SEO

Cliquer sur "Auditer SEO" pour analyser les noms des images existantes et recevoir des suggestions de renommage optimise.

## Architecture

```
tools/image-manager/
├── server.js          # Serveur Express
├── lib/
│   ├── astro-parser.js    # Detection placeholders
│   ├── image-processor.js # Compression WebP
│   ├── git-publisher.js   # Auto commit/push
│   ├── phototheque.js     # Gestion photos
│   └── seo-auditor.js     # Audit SEO
└── public/
    ├── index.html
    ├── styles.css
    └── app.js
```

## API

| Endpoint | Methode | Description |
|----------|---------|-------------|
| `/api/pages` | GET | Liste des pages avec placeholders |
| `/api/pages/:path` | GET | Detail d'une page |
| `/api/phototheque` | GET | Liste des dossiers et photos |
| `/api/phototheque/upload` | POST | Upload de photos |
| `/api/images/process` | POST | Compression et renommage |
| `/api/git/publish` | POST | Commit et push |
| `/api/seo/audit` | GET | Audit des images |
