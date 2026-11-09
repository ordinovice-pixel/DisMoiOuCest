# Identité visuelle — Dis moi où c'est !

## Nom et ton
- Nom : **dis moi où c'est !** (avec le point d'exclamation), en minuscules, « où » en couleur d'accent.
- Slogan : *Retrouve tout, en quelques secondes.*
- Ton : tutoiement, phrases courtes, un peu malin.

## Logo
Un **repère de carte** contenant une **loupe** : *où se trouve… ?* Fichiers dans [`../assets/`](../assets) :

| Fichier | Usage |
|---|---|
| `icone-app-clair.svg` / `-192.png` / `-512.png` | Icône d'application (carré arrondi Océan, repère blanc) |
| `icone-app-sombre.svg` / `-512.png` | Icône d'application, version sombre |
| `favicon.svg` (+ `favicon-64.png` dans `docs/`) | Icône d'onglet : traits de la loupe épaissis pour rester lisible en petit |
| `logo-monochrome.svg` | Usages en une couleur |

## Trois chartes, chacune en clair et en sombre
Style **épuré** : 7 rôles de couleur (fond, surface, encre, texte secondaire, filet, accent, accent doux), **un seul accent par écran**, quatre pastels de groupe atténués en rotation, l'orange réservé au badge « prêté ».

| | Accent clair | Accent sombre | Fond sombre |
|---|---|---|---|
| **Océan** (par défaut) | `#0E7C86` | `#4FD1D9` | `#0A1A1D` |
| **Azur** | `#1F6FD1` | `#5AA3FF` | `#0C1624` |
| **Indigo** | `#4338CA` | `#9A93FF` | `#0F0F24` |

Les chartes sont des variables CSS (`--bg`, `--card`, `--ink`, `--mute`, `--line`, `--acc`, `--acc2`, `--acc-ink`, `--warn`, `--g0`…`--g3`, `--soft`, `--field`, `--pret-bg`, `--pret-ink`) portées par les attributs `data-theme` (clair / sombre) et `data-charte` (ocean / azur / indigo) de l'élément `<html>`. Océan est la valeur de base de `:root`.

## Icônes
Jeu d'icônes SVG au trait fin : 24 px, trait 1,8, extrémités et jonctions arrondies, couleur `currentColor`. Elles sont définies une fois dans un **sprite** (`<symbol id="i-…">`) au début de `index.html` et utilisées par `<use href="#i-…">`.

Accueil, tableau de bord, infos, couches, plus, personnes, aide, outil, document, photo, micro, cadenas, prêt, repère, étiquette, loupe, calendrier, crayon, corbeille, partage, lune, soleil, fermer, valider, actualiser, alerte, télécharger, logo.

Les émojis ne servent plus que de **contenu choisi par l'utilisateur** (icône d'une catégorie ou d'un emplacement).

## Typographie
Polices système pour l'interface (rapide, aucun téléchargement). Manrope 800 pour le logotype hors application.
