# Installation pas à pas

## Ce qu'il faut
Un compte Google (gratuit). Rien d'autre : pas d'hébergement, pas de serveur.

## Méthode simple, sans outil

1. Ouvre <https://script.google.com> → **Nouveau projet**. Nomme-le « Dis moi où c'est ! ».
2. Dans **Paramètres du projet** (⚙️), coche **Afficher le fichier manifeste « appsscript.json »**.
3. Copie le contenu de chaque fichier de `src/` :
   - `Code.gs`, `Base.gs`, `Partage.gs`, `Drive.gs` → fichiers de **script** du même nom ;
   - `index.html` et `Diagnostic.html` → fichiers **HTML** nommés `index` et `Diagnostic` ;
   - `appsscript.json` → remplace le contenu du manifeste.
4. Active le **service Drive avancé** (Services → ➕ → *Drive API*) : il sert aux e-mails de partage personnalisés. S'il est absent, l'application se rabat sur l'e-mail standard.
5. **Déployer** → **Nouveau déploiement** → type **Application web** :
   - Exécuter en tant que : **l'utilisateur qui accède à l'application** ;
   - Qui a accès : **Tout le monde** (les données restent protégées par le compte Google de chacun).
6. Autorise les accès demandés. L'écran « application non vérifiée » est normal pour un projet personnel : *Paramètres avancés → Accéder à…*.
7. Ouvre l'adresse du déploiement (elle se termine par `/exec`). Ta base personnelle est créée dans ton Drive à la première connexion.

## À chaque modification
Enregistre tous les fichiers modifiés, puis **Déployer → Gérer les déploiements → ✏️ → Nouvelle version**. Sans nouvelle version, l'adresse continue de servir l'ancien code.

## Avec clasp (recommandé pour développer)
```bash
npm install -g @google/clasp
clasp login
cp .clasp.json.example .clasp.json     # remplace scriptId par l'ID de ton projet
clasp push                             # envoie src/ vers Apps Script
clasp deploy                           # crée une nouvelle version du déploiement
```
Le fichier `.clasp.json` n'est pas versionné.

## Icône d'onglet (favicon)
`Code.gs` contient la constante `FAVICON_URL`, qui pointe vers `docs/favicon-64.png` de ce dépôt (adresse « raw » GitHub, dépôt public). Si tu utilises un autre dépôt, change l'adresse ou mets une chaîne vide.

## Ajouter l'application à l'écran d'accueil du téléphone
- **Android (Chrome)** : menu ⋮ → *Ajouter à l'écran d'accueil*.
- **iPhone (Safari)** : bouton Partager → *Sur l'écran d'accueil*.

## Partager avec la famille
Dans l'application : **Bases → Partager**, saisis l'adresse Gmail et choisis *lecture* ou *modification*. Envoie aussi le lien d'invitation. L'invité l'ouvre avec le même compte Google.

## En cas de problème
- Page blanche ou message d'erreur : ouvre `…/exec?page=diag` (page de diagnostic du serveur).
- Les changements n'apparaissent pas : tu as oublié la **nouvelle version** du déploiement.
- Plusieurs comptes Google sur le même appareil : ouvre l'adresse dans une fenêtre de navigation privée.
