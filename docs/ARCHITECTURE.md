# Architecture — Dis moi où c'est !

## Vue d'ensemble

Un **seul déploiement Google Apps Script** (application web), exécuté **en tant que l'utilisateur qui accède**. Il n'existe aucune base de données centrale : chaque base est un **Google Sheet** accompagné d'un **dossier Drive** (photos, sons), tous deux situés dans le Drive de son propriétaire et créés automatiquement à la première connexion.

```
 Navigateur (téléphone / PC)
   index.html  ──►  google.script.run  ──►  Code.gs  (doGet, démarrage, préférences)
                                             Base.gs  (Sheet, éléments, arbres, cache)
                                             Partage.gs (bases, rôles, invitations)
                                             Drive.gs (photos, sons, miniatures)
                                                │
                                   ┌────────────┴────────────┐
                                   ▼                         ▼
                           Google Sheets                Google Drive
                  (Elements, Categories, …)     (dossier de la base : photos, sons)
```

## Fichiers

| Fichier | Rôle |
|---|---|
| `Code.gs` | `doGet` (sert `index.html` ou `Diagnostic.html`, injecte le lien d'invitation, favicon), utilitaires de validation, `demarrer`, préférences utilisateur |
| `Base.gs` | Création et ouverture d'une base, lecture / écriture des éléments, arbres catégories et emplacements, cache serveur versionné |
| `Partage.gs` | Liste des bases d'un utilisateur, rôles, partage par e-mail, lien d'invitation, messages personnalisés |
| `Drive.gs` | Envoi et lecture des photos (avec miniatures) et des sons, nettoyage des fichiers inutilisés |
| `index.html` | Toute l'interface : styles (3 chartes clair / sombre), sprite d'icônes SVG, logique, aide et tutos |
| `Diagnostic.html` | Page de test du serveur (`…/exec?page=diag`) |
| `appsscript.json` | Manifeste : fuseau, portées OAuth (Drive, Sheets, e-mail), mode de déploiement |

## Modèle de données

Un classeur par base, avec **toutes les cellules au format texte** : rien n'est jamais interprété comme une formule ou une date par Sheets.

| Onglet | Colonnes |
|---|---|
| `Elements` | id, titre, description, type_id, type2_id, emplacement_id, emplacement2_id, photos, audio, date_achat, date_fin, prete, prete_a, date_pret, sensible, valeur_sensible, tags, date_creation, date_modif, modifie_par |
| `Categories` | id, nom, parent_id, ordre, icone, photo |
| `Emplacements` | id, nom, parent_id, ordre, icone, photo |
| `Config` | cle, valeur (nom de la base, propriétaire, version du schéma) |
| `Journal` | date, utilisateur, action, id_element |
| `Miniatures` (masqué) | photo_id, data (miniature en data-URL, ≤ 45 000 caractères) |

Catégories et emplacements forment des **arbres** (`parent_id`). Les photos et le son d'un élément sont des identifiants de fichiers du dossier de la base ; un élément peut avoir jusqu'à 12 photos et un son (5 Mo).

## Partage et rôles

- La liste des bases d'un utilisateur est conservée dans ses **UserProperties** ; elle peut être reconstruite en retrouvant les bases qu'il possède dans son Drive.
- Le partage utilise les **droits Drive** du classeur et du dossier : `lecture` ou `modification`. L'invité reçoit un e-mail personnalisé (service Drive avancé) et un **lien d'invitation** `…/exec?base=ID`.
- Le rôle est **relu dans Drive à chaque écriture** : une page ouverte avec un ancien rôle ne peut pas écrire.

## Sécurité

- Identifiants validés par `/^[\w-]{1,80}$/` avant toute utilisation, côté serveur comme côté page.
- Pièces jointes acceptées uniquement si elles sont dans le dossier de la base.
- Valeur sensible lue **à la demande** (`lireValeurSensible`), jamais incluse dans le chargement de la base, jamais exportée.
- Aucune donnée utilisateur dans du code JavaScript généré ; échappement systématique à l'affichage ; export CSV protégé contre les formules.
- Limites de taille sur tous les textes (`LIMITES`), les photos (≈ 2,6 Mo) et les sons (≈ 5 Mo).

## Performances

Apps Script ajoute environ **1,3 s de latence fixe** par appel (2 à 4 s en pratique). Parades :
- chargement de toute la base en **un seul appel**, avec **cache serveur versionné** (invalidé à chaque écriture) ;
- **cache local** (localStorage) : les dernières données s'affichent tout de suite, la mise à jour se fait en arrière-plan ;
- **interface optimiste** : l'action s'affiche immédiatement, le serveur confirme ensuite ;
- miniatures envoyées **par lots** ; photos envoyées en arrière-plan.

## Contraintes propres à Apps Script

- Google **supprime tout texte entre `/*` et `*/`**, même dans une chaîne JavaScript : ne jamais écrire `/*` ni `//` dans une chaîne de `index.html`.
- La page est servie dans un iframe : pas de manifeste PWA ; l'icône d'onglet passe par `setFaviconUrl` (PNG hébergé).
- La caméra directe est retirée : Android recharge la page à son retour ; un brouillon est conservé localement (jamais la valeur sensible).

## Tests

- `test/mock.js` : simulateur des services Google (Sheets, Drive, Properties, Cache, Lock, Utilities…).
- `test/scenarios.js` : 82 scénarios sur le backend (isolation entre comptes, rôles, partage, limites, sécurité).
- `test/ui.js` : test d'interface avec Playwright, relié au simulateur (ajout, recherche, partage entre deux comptes, brouillon, chartes).
- `test/captures.js` : génère les captures d'écran du README à partir de données fictives.
