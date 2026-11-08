# BRIEF — Logo et charte graphique de « Dis moi où c'est ! »
Document de départ pour une conversation dédiée du projet. État au 08/11/2026.
À lire avec la Memory Bank du projet. Objectif : créer l'identité visuelle (nom, logo, couleurs, typographie, icônes, ton) **en restant cohérent avec l'outil réel**, puis l'intégrer dans `index.html`.

---
## 1. L'outil en deux minutes
**« Dis moi où c'est ! »** est un carnet d'adresses de ses affaires, de ses infos et de ses idées. Tout se retrouve à partir d'un seul champ de recherche sur le téléphone.
- On y note *quoi* et *où* : une affaire physique (outil, facture, papier, objet prêté) ou immatérielle (fichier, photo, idée, code, contrat, abonnement), avec photo, son, description.
- Exemples de questions auxquelles il répond : « Où est la facture de la chaudière ? », « À qui ai-je prêté la perceuse ? », « Où sont les photos du voyage à Florence ? », « Où est l'arrivée d'eau de ma location Airbnb ? ».
- Utilisé sur **téléphone d'abord**, aussi sur PC. Application web (Google Apps Script) : chaque personne a sa base dans son propre Google Drive ; bases personnelles privées, bases partagées en famille ou entre amis.
- Public : particuliers, familles, amis testeurs, non techniciens. Ton : tutoiement, simple, rassurant, un peu malin. Langue : français.
- Fonctions principales : recherche, classement par catégories et emplacements (arbre, avec icône et photo à chaque niveau), prêts, infos sensibles masquées, partage par e-mail, mode clair/sombre, 3 chartes de couleurs au choix.

## 2. Ce qui existe déjà (à respecter ou à faire évoluer volontairement)
**Nom** : « Dis moi où c'est ! » (provisoire mais conservé pour l'instant). Alternatives déjà évoquées : Trouvetou, Mémorange, Tout-Retrouvé, Casa Range, Ça se range où ?, Le Retrouvoir.
**Logo** : aucun. L'en-tête affiche seulement l'emoji 🔎 + le nom. Pas d'icône d'application, pas de favicon personnalisé.
**Typographie** : polices système (`system-ui, Segoe UI, Roboto, sans-serif`), corps 16 px, titres 16–17 px en gras.
**Formes** : coins arrondis (cartes 14 px, champs et boutons 10 px, fenêtres 20 px), bordures fines, ombres quasi absentes, pastilles (étiquettes) en forme de gélule.
**Icônes** : uniquement des emojis (barre de navigation, icônes des catégories et emplacements, boutons). À décider : les garder, ou créer un jeu d'icônes SVG cohérent.

### Palette actuelle (variables CSS de `index.html`)
Trois chartes au choix (pastilles dans l'en-tête), chacune en clair et en sombre. Seule la couleur d'accent et les pastels changent.

| Variable | Azur clair | Azur sombre | Océan clair | Océan sombre | Indigo clair | Indigo sombre |
|---|---|---|---|---|---|---|
| `--bg` (fond) | #eef4fb | #0c1624 | #edf6f7 | #0a1a1d | #eff0fb | #0f0f24 |
| `--card` | #ffffff | #142238 | #ffffff | #10272b | #ffffff | #18183a |
| `--ink` (texte) | #0f2740 | #e6eefa | #0f2740 | #e6eefa | #0f2740 | #e6eefa |
| `--mute` (texte secondaire) | #5b7390 | #93a9c4 | #5b7390 | #93a9c4 | #5b7390 | #93a9c4 |
| `--line` (bordures) | #d3e0ef | #243a58 | #d3e0ef | #1f4247 | #d3e0ef | #2e2e60 |
| `--acc` (accent) | #1f6fd1 | #5aa3ff | #0e7c86 | #4fd1d9 | #4338ca | #9a93ff |
| `--acc2` (accent doux) | #e3effc | #1b3252 | #dff3f4 | #12363a | #e6e4fb | #25235a |
| `--g0` pastel groupe 1 | #d6e6fb | #1b3252 | #cfeef0 | #12363a | #e0defb | #25235a |
| `--g1` pastel groupe 2 | #fddede | #4a2326 | #fddccf | #47281f | #fddeea | #4d2140 |
| `--g2` pastel groupe 3 | #d9f3e2 | #1d3d2b | #f3ebcf | #3d3721 | #d8f1e7 | #1f4234 |
| `--g3` pastel groupe 4 | #fdf0c9 | #4a3f1a | #e3dff7 | #2a2650 | #fdebd1 | #4a3320 |
| `--soft` (cartes pastel) | #e0ebf8 | #172a45 | #d9eef0 | #112d31 | #e3e4fa | #1d1d45 |
| `--field` (champs pastel) | #d2e2f6 | #1f375a | #c6e6e9 | #183d43 | #d3d5f6 | #29295c |

Commun aux 3 chartes : avertissement/suppression `--warn` #c2410c (clair) / #fb923c (sombre) ; texte sur accent `--acc-ink` #ffffff (clair) / #06121f (sombre) ; badge « prêté » fond #fde9d9 (clair) / #43230f (sombre).
Les groupes de catégories prennent les pastels g0 à g3 en rotation : « Physique » = bleu pastel, « Immatériel » = rose clair ; pour les emplacements, Maison / Ordinateur / Smartphones ont chacun leur teinte.

## 3. Écrans et composants à habiller
**Écrans (7)** : Accueil (recherche + 20 derniers éléments), Tableaux de bord (chiffres clés, barres par catégorie et lieu), Mes Infos (filtres, liste ou tableau), Catégories & emplacements (arbres avec icône et photo), Ajouter (formulaire en fenêtre du bas), Bases (liste, partage, lien d'invitation), Aide (à quoi ça sert, fonctionnalités, tutos).
**Composants** : en-tête (nom + nom de la base + 3 pastilles de charte + bouton clair/sombre + actualiser), barre de navigation du bas à 7 entrées (icône + libellé court), cartes, étiquettes pastel en gélule (catégorie, emplacement, « prêté »), boutons (principal plein, secondaire doux, danger contouré), champs, fenêtres du bas (« bottom sheet ») sur mobile, messages éphémères (toasts), bandeaux, chiffres clés (KPI), barres horizontales, vignettes photo carrées, visionneuse de photo plein écran, états vides (« Aucun élément pour l'instant »).
**Textes d'aide** déjà rédigés : rubrique Aide de l'application (à quoi ça sert / fonctionnalités / tutos à venir) — bonne source pour le ton et le slogan.

## 4. Contraintes techniques (importantes)
1. **Un seul fichier `index.html`** : tout (CSS, JS, SVG) est en ligne. Pas de fichiers d'images séparés dans l'application. Logo et icônes = **SVG intégré dans le HTML** (balise `<svg>` dans le balisage, ou `data:` URI).
2. **Piège Apps Script** : Google supprime du code toute portion située entre `/*` et `*/`, même à l'intérieur d'une chaîne de caractères JavaScript (cela a cassé l'application). Donc : **dans un script, ne jamais écrire `/*` ni `//` dans une chaîne** ; par exemple écrire `image/\x2a` et construire une URL en deux morceaux. Un SVG placé dans le balisage HTML (hors script) est sans risque ; un SVG construit dans une chaîne JS ne doit pas contenir `//` (l'attribut `xmlns="http://www.w3.org/2000/svg"` est inutile dans du HTML en ligne, on peut l'omettre).
3. **Favicon et icône d'écran d'accueil** : Apps Script permet `setFaviconUrl(url)` avec une URL d'image hébergée (par exemple l'adresse « raw » du dépôt GitHub). L'application tourne dans un cadre (iframe) : pas de manifeste PWA complet ; l'icône sur l'écran d'accueil du téléphone vient de la page parente de Google (limite connue).
4. **Mobile d'abord** : largeur 360–430 px, zones tactiles ≥ 44 px, marges latérales 16 px, pas de défilement horizontal.
5. **Deux modes (clair/sombre)** : tout élément de marque doit exister dans les deux ; contrastes lisibles (cible WCAG AA).
6. **Trois chartes** : décider si on garde le choix (Azur, Océan, Indigo) ou si on définit une charte par défaut + 1 ou 2 variantes. Le sélecteur de charte fait partie de l'expérience appréciée par l'utilisateur (« j'aime avoir le choix »).
7. **Légèreté** : aucune police externe obligatoire (polices système) ; si une police web est choisie, prévoir un repli et vérifier le chargement dans le cadre Apps Script.

## 5. Questions à trancher dans la conversation dédiée
- Garde-t-on « Dis moi où c'est ! » ou choisit-on un autre nom (liste §2) ? Sinon, quel logotype (avec ou sans le point d'exclamation) ?
- Quelle idée visuelle porter : le point de repère / pin 📍, la loupe 🔎, la boîte / le tiroir, un point d'interrogation qui répond, un clin d'œil à la voix (« Dis moi… ») ?
- Mascotte ou non ? Style (plat, géométrique, un peu ludique) ?
- Palette finale : conserver l'accent bleu, ou introduire une couleur de marque plus identifiable (les pastels par groupe sont conservés) ?
- Jeu d'icônes : garder les emojis ou dessiner une vingtaine d'icônes SVG (navigation + types d'objets) ?
- Déclinaisons utiles : logo complet, icône carrée (512 px et 192 px), favicon, version monochrome, fond clair / sombre, bannière GitHub, visuel pour les e-mails de partage, états vides illustrés.

## 6. Livrables attendus
1. Proposition de 2 à 3 pistes de logo (SVG) + recommandation.
2. Charte : couleurs (variables CSS prêtes à coller), typographie, formes, icônes, ton éditorial, exemples d'usage.
3. SVG finaux : logo complet, icône, favicon, version monochrome.
4. Mise à jour proposée de `index.html` (en-tête, variables `:root`, icônes, états vides) en respectant les contraintes du §4, testable avec le test d'interface du dépôt.
5. Page ou document « charte » récapitulatif (idéalement publié en artifact), et mise à jour de la Memory Bank.

## 7. Où trouver les éléments
- **Code et tests** : https://github.com/ordinovice-pixel/DisMoiOuCest (dossier `src/` : `index.html` = toute l'interface ; `docs/screens/` : captures d'écran de l'application, 3 chartes, clair et sombre).
- **Application déployée** : le lien `…/exec` du déploiement Apps Script de Jeff (à ouvrir sur téléphone pour juger le rendu réel).
- **Documents du projet** : Memory Bank, prompt v3 (cahier des charges d'origine), POC d'origine.
- **Test visuel** : `node test/ui.js` produit des captures d'écran de l'interface (mobile et PC, clair/sombre, 3 chartes) avec des données fictives.

## 8. Message de démarrage conseillé pour la nouvelle conversation
« Lis la Memory Bank du projet « Dis moi où c'est ! » et le brief logo/charte. Regarde les captures d'écran du dépôt GitHub. Propose-moi 3 pistes de logo (SVG) et de charte graphique cohérentes avec l'outil, en respectant les contraintes techniques du brief (fichier unique, pas de `/*` ni `//` dans les chaînes JS, clair/sombre, mobile d'abord). Pose-moi au maximum 3 questions avant de commencer. »
