# Dis moi où c'est !

« Dis moi où c'est ! » est un carnet d'adresses de tes affaires, de tes infos et de tes idées. Tout se retrouve à partir d'un seul champ de recherche sur ton téléphone. Tu y notes *quoi* et *où*, avec une photo, un son, une description. Les objets physiques comme les choses immatérielles (fichiers, photos, idées, codes, contrats, abonnements) sont traités de la même façon.

Application web pour téléphone et ordinateur, construite avec **Google Apps Script**. Chaque utilisateur garde ses données dans **son propre Google Drive** (un Google Sheet + un dossier pour les photos et les sons). Les bases personnelles sont privées ; une base peut être partagée par e-mail avec des droits « lecture » ou « modification ».

## Fonctionnalités
- Recherche multi-mots, filtres multicritères, liste ou tableau, export CSV, tableaux de bord
- Catégories et emplacements en arbre, avec icône et photo à chaque niveau
- Photos (galerie ou ordinateur), enregistrement sonore, description, mots-clés, date d'achat
- Suivi des prêts, informations sensibles masquées
- Plusieurs bases, partage par e-mail avec lien d'invitation
- Mode clair/sombre, trois chartes de couleurs, utilisable sur téléphone

## Organisation du dépôt
| Dossier | Contenu |
|---|---|
| `src/` | Fichiers Apps Script : `Code.gs` (point d'entrée), `Base.gs` (Sheet, éléments, arbres, cache), `Partage.gs` (bases, rôles, partage), `Drive.gs` (photos, sons), `index.html` (toute l'interface), `Diagnostic.html` (page de test du serveur, `…/exec?page=diag`), `appsscript.json` (manifeste) |
| `test/` | Simulateur Google (`mock.js`), 82 scénarios serveur (`scenarios.js`), test d'interface avec navigateur (`ui.js`) |
| `docs/` | Memory Bank du projet, brief logo/charte, captures d'écran |

## Installer dans Apps Script (sans outil)
1. Crée un projet sur https://script.google.com.
2. Copie chaque fichier de `src/` (les `.gs` en scripts, les `.html` en fichiers HTML nommés `index` et `Diagnostic`) et remplace le manifeste (Paramètres ⚙️ → « Afficher le fichier manifeste »).
3. Déployer → Nouveau déploiement → Application web : exécuter en tant que **l'utilisateur qui accède à l'application**, accès **tout le monde**.
4. À chaque modification : enregistrer, puis Déployer → Gérer les déploiements → ✏️ → **Nouvelle version**.

## Avec clasp (recommandé)
```bash
npm install -g @google/clasp
clasp login
cp .clasp.json.example .clasp.json     # puis remplace scriptId par l'ID de ton projet
clasp push                             # envoie src/ vers Apps Script
```
`clasp deploy` crée une nouvelle version du déploiement. Le fichier `.clasp.json` n'est pas versionné.

## Tests (sans Google)
```bash
npm install            # installe Playwright (test d'interface seulement)
npm test               # 82 scénarios serveur avec un simulateur Google
npx playwright install chromium && npm run test:ui   # test de l'interface + captures dans test/shots/
```

## Règles importantes pour le code de la page
- **Jamais de `/*` ni de `//` dans une chaîne de caractères JavaScript** de `index.html` : Google supprime tout ce qui est entre `/*` et `*/` à l'envoi de la page (écrire par exemple `image/\x2a`).
- Tous les identifiants reçus du serveur sont validés avant d'être mis dans la page ; aucune donnée utilisateur n'est insérée dans du code JavaScript.
- Le rôle (lecture / modification) est relu côté serveur à chaque écriture.

## Licence
Projet personnel de Jeff (OrdiNovice). Tous droits réservés tant qu'aucune licence n'est ajoutée.
