# MEMORY BANK — Projet « Dis moi où c'est ! » (ex « Où est-ce ? »)
Synthèse du projet — état au 08/11/2026 (étape 4 terminée : outil déployé et fonctionnel, code sur GitHub ; prochaine étape : logo et charte graphique).
À lire en premier dans toute nouvelle conversation du projet.

## 1. En une phrase
Application web multi-utilisateurs (PC + smartphone) en Google Apps Script qui permet de retrouver en quelques secondes où se trouve une affaire physique (outils, factures, papiers) ou immatérielle (fichiers, photos, idées, infos, codes, contrats), et à qui on a prêté quoi.

## 2. Qui / contexte
- Porteur : Jeff (OrdiNovice), technicien informatique indépendant et futur coach IA ; à l'aise avec Apps Script.
- Projets Apps Script déjà réalisés avec Claude : « Nouvel outil OrdiNovice » et « Ré-organisation Les Brunants » → réutiliser leurs conventions.
- Usage : famille (base partagée) + base perso privée + amis testeurs ayant chacun leur propre base.
- Dossier local du projet : `C:\Users\JEFF2\Documents\AI\Appli ou site codes\Ou est-ce`.

## 3. Décisions VALIDÉES
### Architecture
- Un seul déploiement Apps Script, « Exécuter en tant que : l'utilisateur qui accède ». Une base = un Google Sheet + un dossier Drive (photos/sons) dans le Drive de l'utilisateur, créés automatiquement à la 1re connexion. Isolation totale entre comptes.
- Partage par e-mail, rôles `lecture` / `modification`. Lien d'invitation `…/exec?base=ID`. Plusieurs bases par utilisateur ; liste en UserProperties.
- Écran Google « application non vérifiée » accepté pour les testeurs.
- Suppression définitive avec alerte. Infos sensibles masquées au clic. Plusieurs centaines d'éléments par base. Français uniquement.
- Prêt : case + « prêté à » + date, « marquer comme rendu ». Date d'achat / inscription : facultative.
- Interface en UN SEUL fichier `index.html` (validé). Code sur GitHub : https://github.com/ordinovice-pixel/DisMoiOuCest (dossier `src/` = fichiers Apps Script, compatible clasp ; `test/` = tests ; `docs/` = documentation).

### Navigation (7 rubriques)
Accueil (recherche) · Tableaux de bord · Mes Infos (filtres, liste/tableau, CSV) · Catégories & emplacements · Ajouter · Bases · Aide (À quoi ça sert / Fonctionnalités / Tutos à venir).

### Formulaire
Sélecteur avec création à la volée ; 2ᵉ catégorie / 2ᵉ emplacement ; photos ajoutées depuis la galerie ou l'ordinateur (la prise de photo en direct est RETIRÉE : Android recharge la page) et envoyées en arrière-plan ; son (enregistreur natif ou import, 5 Mo max ; lecture via blob, téléchargement proposé si format non lisible) ; brouillon sauvegardé sur le téléphone (jamais la valeur sensible).
Listes : icônes 📝 description / 📷 photo / 🎙️ son ; description visible dans les listes sauf si l'élément est sensible.
Catégories & emplacements : icône et photo pour chaque niveau (aide un inconnu à retrouver l'endroit) ; sous-emplacements proposés Armoire / Placard / Tiroir / Étagère + nom libre (ex. Garage › Armoire › Près du frigo) ; bouton « Suggérer des icônes ».
Partage : e-mails Google Drive personnalisés (lien d'invitation + explication bases perso/partagée) via le service Drive avancé activé dans appsscript.json ; repli sur l'e-mail standard si indisponible.

### Apparence
Clair / sombre ; 3 chartes (Azur, Océan, Indigo) ; pastel par groupe. Nom provisoire « Dis moi où c'est ! », pas de logo. Alternatives : Trouvetou, Mémorange, Tout-Retrouvé, Casa Range, Ça se range où ?, Le Retrouvoir.

## 4. Modèle de données (implémenté)
Onglets : Elements, Categories, Emplacements (arbres parent_id ; colonnes ajoutées : icone, photo), Config, Journal, Miniatures (masqué).
Elements : id, titre, description, type_id, type2_id, emplacement_id, emplacement2_id, photos, audio, date_achat, date_fin, prete, prete_a, date_pret, sensible, valeur_sensible, tags, date_creation, date_modif, modifie_par.
Sécurité : valeur sensible lue à la demande ; rôle relu dans Drive à chaque écriture ; pièces jointes limitées aux fichiers de l'appli ; cellules en texte ; côté interface : tous les identifiants reçus sont validés (`/^[\w-]{1,80}$/`), export CSV protégé contre les formules.
Performances mesurées : ~1,3 s de latence fixe par appel → interface optimiste, cache local (localStorage), miniatures par lot.

## 5. État d'avancement
- FAIT : prompt v3, POC, mini-test Android, architecture, backend (Code.gs, Base.gs, Partage.gs, Drive.gs, Diagnostic.html), interface `index.html`, déploiement réel testé sur téléphone et PC (« ça fonctionne ») ; tests : 82 scénarios backend + test d'interface Playwright.
- FAIT (08/11) : e-mails de partage personnalisés, icônes de contenu dans les listes, rubrique Aide, icône + photo des catégories/emplacements, description dans les listes, GitHub créé (https://github.com/ordinovice-pixel/DisMoiOuCest).
- LEÇONS : (1) Google supprime du code tout texte situé entre `/*` et `*/` même dans une chaîne → ne jamais écrire `/*` ni `//` dans une chaîne JS (écrire `image/\x2a`) ; (2) `index.html` est servi sans moteur de modèles (`__INVITE__` remplacé dans Code.gs) ; (3) un filet d'erreur affiche les erreurs à l'écran avec bouton de remise à zéro ; (4) la caméra directe fait recharger la page sous Android → retirée ; (5) coller TOUS les fichiers modifiés puis « Nouvelle version » du déploiement.
- À FAIRE : test du 2ᵉ compte (Héloïse) ; vérifier les e-mails de partage ; logo et charte graphique (nouvelle conversation, brief : `claude/Brief_Logo_Charte_Dis_moi_ou_c_est.md`) ; contenu des tutos ; clasp en local (voir README du dépôt) ; tests avec amis ; idées v2 (§7).

## 6. Risques et points à surveiller
Rechargement de la page Android après la caméra (brouillon prévu) ; latence Apps Script (~2–4 s/appel) ; quotas ; écran « non vérifiée » ; tester isolation avec 2 comptes ; 1000+ éléments.

## 7. Idées pour plus tard
Alertes date_fin (garantie / abonnement) ; rappel de retour de prêt ; QR par emplacement ; pré-remplissage IA depuis une photo ; import CSV ; raccourci écran d'accueil ; recherche vocale ; code-barres ; historique visible.

## 8. Prochaines étapes
1. ✔ Mini-test · 2. ✔ Architecture · 3. ✔ Backend · 4. ✔ Interface déployée · 5. ✔ GitHub.
6. Logo + charte graphique (conversation dédiée, en restant cohérent avec l'outil).
7. Test 2ᵉ compte, amis testeurs, tutos.
8. Idées v2 : alertes date_fin, rappel de prêt, QR par emplacement, pré-remplissage IA.

## 9. Fichiers de référence
Projet Claude : `POC_Dis_moi_ou_c_est.html` (maquette d'origine), `Prompt_Dis_moi_ou_c_est_v3.md` (cahier des charges), `Brief_Logo_Charte_Dis_moi_ou_c_est.md` (brief logo/charte).
GitHub : https://github.com/ordinovice-pixel/DisMoiOuCest (`src/`, `test/`, `docs/`).

## 10. Message de démarrage conseillé pour une nouvelle conversation
« Lis la Memory Bank du projet puis le brief logo/charte. On travaille sur le logo et la charte graphique de « Dis moi où c'est ! » en restant cohérent avec l'outil (index.html). »
