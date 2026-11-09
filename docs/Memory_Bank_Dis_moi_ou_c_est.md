# MEMORY BANK — Projet « Dis moi où c'est ! » (ex « Où est-ce ? »)
Synthèse du projet — état au 08/11/2026 (étape 4 terminée : outil déployé et fonctionnel, code sur GitHub ; étape 6 : identité visuelle VALIDÉE et INTÉGRÉE dans index.html v10).
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
Barre du bas à 6 rubriques (v10) : Accueil (recherche) · Tableaux de bord · Mes Infos (filtres, liste/tableau, CSV) · **Ajouter & Modifier** (bouton « Ajouter un élément » + arbre Catégories & emplacements, qui n'est plus une rubrique à part) · Bases · Aide (À quoi ça sert / Fonctionnalités / Tutos).

### Formulaire
Sélecteur avec création à la volée ; 2ᵉ catégorie / 2ᵉ emplacement ; photos ajoutées depuis la galerie ou l'ordinateur (la prise de photo en direct est RETIRÉE : Android recharge la page) et envoyées en arrière-plan ; son (enregistreur natif ou import, 5 Mo max ; lecture via blob, téléchargement proposé si format non lisible) ; brouillon sauvegardé sur le téléphone (jamais la valeur sensible).
Listes : icônes 📝 description / 📷 photo / 🎙️ son ; description visible dans les listes sauf si l'élément est sensible.
Catégories & emplacements : icône et photo pour chaque niveau (aide un inconnu à retrouver l'endroit) ; sous-emplacements proposés Armoire / Placard / Tiroir / Étagère + nom libre (ex. Garage › Armoire › Près du frigo) ; bouton « Suggérer des icônes ».
Partage : e-mails Google Drive personnalisés (lien d'invitation + explication bases perso/partagée) via le service Drive avancé activé dans appsscript.json ; repli sur l'e-mail standard si indisponible.

### Identité visuelle (VALIDÉE le 08/11/2026)
- Nom conservé : « Dis moi où c'est ! » (avec le point d'exclamation). Logotype en minuscules, « où » en couleur d'accent. Alternatives écartées : Trouvetou, Mémorange, Tout-Retrouvé, Casa Range, Ça se range où ?, Le Retrouvoir.
- Logo : repère de carte (pin) contenant une loupe (piste A « Le Repère »). Icône d'application = carré arrondi d'accent avec repère blanc et loupe d'accent. Favicon : traits de la loupe épaissis (4,5).
- Trois chartes conservées, chacune en clair et en sombre, avec les 3 pastilles dans l'en-tête et le bouton clair/sombre : **Océan (PAR DÉFAUT)**, Azur, Indigo. Style épuré : 7 rôles de couleur (fond, surface, encre, secondaire, filet, accent, accent doux), un seul accent par écran, pastels de groupe atténués (4 teintes en rotation), orange réservé au badge « prêté ».
- Accents : Océan #0E7C86 (clair) / #4FD1D9 (sombre) ; Azur #1F6FD1 / #5AA3FF ; Indigo #4338CA / #9A93FF. Fonds sombres : Océan #0A1A1D, Azur #0C1624, Indigo #0F0F24. Variables complètes dans `identite-final.html`.
- Typographie : polices système pour l'interface (inchangé) ; Manrope 800 pour le logotype (à convertir en tracés SVG pour les usages hors application).
- Icônes : jeu de 21 icônes SVG au trait fin (24 px, trait 1,8, extrémités arrondies, `currentColor`) en sprite `<symbol>` : home, dash, infos, layers, plus, users, help, tool, doc, photo, mic, lock, loan, pin, tag, search, cal, edit, trash, share, moon/sun (+ logo). Remplacent les emojis de l'interface.
- Ton : tutoiement, phrases courtes, un peu malin. Slogan : « Retrouve tout, en quelques secondes. »
- Fichiers livrés : `identite-final.html` (styles des 3 chartes, sprite, en-tête, pastilles, consignes JS), SVG et PNG (icône claire/sombre 512 et 192, favicon 32/64, monochrome). Planches de présentation : artifact « Dis moi où c'est — 3 pistes d'identité » (5 planches).

## 4. Modèle de données (implémenté)
Onglets : Elements, Categories, Emplacements (arbres parent_id ; colonnes ajoutées : icone, photo), Config, Journal, Miniatures (masqué).
Elements : id, titre, description, type_id, type2_id, emplacement_id, emplacement2_id, photos, audio, date_achat, date_fin, prete, prete_a, date_pret, sensible, valeur_sensible, tags, date_creation, date_modif, modifie_par.
Sécurité : valeur sensible lue à la demande ; rôle relu dans Drive à chaque écriture ; pièces jointes limitées aux fichiers de l'appli ; cellules en texte ; côté interface : tous les identifiants reçus sont validés (`/^[\w-]{1,80}$/`), export CSV protégé contre les formules.
Performances mesurées : ~1,3 s de latence fixe par appel → interface optimiste, cache local (localStorage), miniatures par lot.

## 5. État d'avancement
- FAIT : prompt v3, POC, mini-test Android, architecture, backend (Code.gs, Base.gs, Partage.gs, Drive.gs, Diagnostic.html), interface `index.html`, déploiement réel testé sur téléphone et PC (« ça fonctionne ») ; tests : 82 scénarios backend + test d'interface Playwright.
- FAIT (08/11) : e-mails de partage personnalisés, icônes de contenu dans les listes, rubrique Aide, icône + photo des catégories/emplacements, description dans les listes, GitHub créé, **logo et charte graphique validés (voir §3)**.
- FAIT (09/11) : v10 commitée sur GitHub (c4aee27, branche main : src/index.html, src/Code.gs avec setFaviconUrl, test/ui.js adapté — `node test/ui.js` passe sans erreur) ; docs/favicon-64.png déjà dans le dépôt. Reste à coller v10 + Code.gs dans Apps Script et créer une nouvelle version du déploiement.
- COMPATIBILITÉ iPhone (analyse, NON testée sur vrai iPhone) : devrait fonctionner dans Safari ; à vérifier : iOS 16.2+ probablement requis (color-mix, inset), enregistreur son iPhone (m4a), cache local effacé par Safari après ~7 jours (données rechargées depuis le Drive, brouillon perdu), plusieurs comptes Google sur l'iPhone (défaut connu d'Apps Script : ouvrir en navigation privée), barre du bas près de l'indicateur d'accueil en plein écran. Idée : test WebKit (Playwright) puis essai sur iPhone réel.
- LEÇON v10 : deux fichiers de même nom (`index_v10.html`) ont circulé ; toujours vérifier que la version collée contient « TUTOS » (≈ 94 Ko).
- LEÇONS : (1) Google supprime du code tout texte situé entre `/*` et `*/` même dans une chaîne → ne jamais écrire `/*` ni `//` dans une chaîne JS (écrire `image/\x2a`) ; (2) `index.html` est servi sans moteur de modèles (`__INVITE__` remplacé dans Code.gs) ; (3) un filet d'erreur affiche les erreurs à l'écran avec bouton de remise à zéro ; (4) la caméra directe fait recharger la page sous Android → retirée ; (5) coller TOUS les fichiers modifiés puis « Nouvelle version » du déploiement.
- FAIT (08/11) : identité intégrée dans `index_v10.html` (3 chartes clair/sombre, Océan par défaut, sprite de 26 symboles = 21 validés + x, check, refresh, alert, download ; en-tête avec logo ; emojis d'interface remplacés, ceux des catégories/emplacements conservés ; état vide d'accueil). `Code_v10.gs` ajoute `setFaviconUrl` (PNG 64 à pousser dans `docs/` du dépôt GitHub public).
- FAIT (09/11) : 8 tutos pas à pas dépliables (Aide › Tutos : premier élément, photos/son, catégories/emplacements, filtres, prêts, partage, info sensible, raccourci écran d'accueil — le dernier écrit de mémoire, à tester sur téléphone, sans captures d'écran) ; textes justifiés avec césure ; débordements corrigés (mots longs coupés, boutons des lignes de l'arbre compacts) ; en-tête resserré sur petits écrans ; rubrique « Catégories & emplacements » fusionnée dans « Ajouter & Modifier ».
- À FAIRE : coller v10 + Code_v10.gs dans Apps Script, nouvelle version du déploiement, vérifier contrastes sur téléphone ; pousser `docs/favicon-64.png` sur GitHub ; logotype en tracés SVG ; test du 2ᵉ compte (Héloïse) ; vérifier les e-mails de partage ; contenu des tutos ; clasp en local ; tests avec amis ; idées v2 (§7).

## 6. Risques et points à surveiller
Rechargement de la page Android après la caméra (brouillon prévu) ; latence Apps Script (~2–4 s/appel) ; quotas ; écran « non vérifiée » ; tester isolation avec 2 comptes ; 1000+ éléments ; contrastes des 3 chartes en clair et en sombre à revérifier sur téléphone réel après intégration.

## 7. Idées pour plus tard
Alertes date_fin (garantie / abonnement) ; rappel de retour de prêt ; QR par emplacement ; pré-remplissage IA depuis une photo ; import CSV ; raccourci écran d'accueil ; recherche vocale ; code-barres ; historique visible ; états vides illustrés ; bannière GitHub et visuel des e-mails de partage aux couleurs de la charte.

## 8. Prochaines étapes
1. ✔ Mini-test · 2. ✔ Architecture · 3. ✔ Backend · 4. ✔ Interface déployée · 5. ✔ GitHub · 6. ✔ Logo + charte graphique validés.
7. ✔ Identité intégrée (v10). Reste : `node test/ui.js`, déploiement de la nouvelle version, favicon sur GitHub, contrôle sur téléphone.
8. Test 2ᵉ compte, amis testeurs, tutos.
9. Idées v2 : alertes date_fin, rappel de prêt, QR par emplacement, pré-remplissage IA.

## 9. Fichiers de référence
Projet Claude : `POC_Dis_moi_ou_c_est.html` (maquette d'origine), `Prompt_Dis_moi_ou_c_est_v3.md` (cahier des charges), `Brief_Logo_Charte_Dis_moi_ou_c_est.md` (brief logo/charte, traité), `identite-final.html` et SVG/PNG du logo (livrés dans la conversation logo/charte).
GitHub : https://github.com/ordinovice-pixel/DisMoiOuCest (`src/`, `test/`, `docs/`).

## 10. Message de démarrage conseillé pour une nouvelle conversation
« Lis la Memory Bank du projet. On intègre l'identité validée (charte Océan par défaut, 3 chartes clair/sombre, 21 icônes SVG) dans `index.html`, en respectant les contraintes Apps Script. »
