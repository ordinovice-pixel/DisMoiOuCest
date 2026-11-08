/**
 * Base.gs — Feuilles Google Sheets, éléments, catégories / emplacements, cache.
 *
 * Une base = 1 Google Sheet « DMOC – nom » rangé dans un dossier Drive « DMOC – nom »
 * (le dossier contient aussi les photos et sons).
 * Onglets : Elements, Categories, Emplacements, Config, Journal, Miniatures (masqué).
 * Toutes les cellules sont en format TEXTE : aucune donnée n'est jamais interprétée
 * comme une formule ou une date par Google Sheets.
 */

const EL = ['id', 'titre', 'description', 'type_id', 'type2_id', 'emplacement_id', 'emplacement2_id',
  'photos', 'audio', 'date_achat', 'date_fin', 'prete', 'prete_a', 'date_pret', 'sensible',
  'valeur_sensible', 'tags', 'date_creation', 'date_modif', 'modifie_par'];
const COL = {};
EL.forEach(function (n, i) { COL[n] = i; });

const SCHEMA_FEUILLES = {
  Elements: EL,
  Categories: ['id', 'nom', 'parent_id', 'ordre', 'icone', 'photo'],
  Emplacements: ['id', 'nom', 'parent_id', 'ordre', 'icone', 'photo'],
  Config: ['cle', 'valeur'],
  Journal: ['date', 'utilisateur', 'action', 'id_element'],
  Miniatures: ['photo_id', 'data']
};
const ARBRES = { T: 'Categories', E: 'Emplacements' };
const NC_ARBRE = 6;   // id, nom, parent_id, ordre, icone, photo (les anciennes bases n'ont que 4 colonnes : lecture tolérante)

/* ====================================================================
 * Création d'une base
 * ==================================================================== */
function creerBase_(nom) {
  nom = txt_(nom, LIMITES.NOM).trim() || 'Ma base';
  if (lireBases_().length >= LIMITES.BASES) throw new Error('Nombre maximum de bases atteint.');
  const dossier = DriveApp.createFolder(APP.PREFIXE + nom);
  const ss = SpreadsheetApp.create(APP.PREFIXE + nom);
  DriveApp.getFileById(ss.getId()).moveTo(dossier);
  initialiserFeuilles_(ss, dossier.getId(), nom);
  const base = { id: ss.getId(), nom: nom };
  ajouterAuxBases_(base);
  return base;
}

function initialiserFeuilles_(ss, dossierId, nom) {
  const noms = Object.keys(SCHEMA_FEUILLES);
  const premiere = ss.getSheets()[0];
  premiere.setName(noms[0]);
  noms.slice(1).forEach(function (n) { ss.insertSheet(n); });
  noms.forEach(function (n) {
    const sh = ss.getSheetByName(n);
    const cols = SCHEMA_FEUILLES[n];
    sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@');   // texte partout
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  ss.getSheetByName('Miniatures').hideSheet();

  const g = graines_();
  ss.getSheetByName('Categories').getRange(2, 1, g.T.length, NC_ARBRE).setValues(g.T);
  ss.getSheetByName('Emplacements').getRange(2, 1, g.E.length, NC_ARBRE).setValues(g.E);

  const conf = [
    ['version_schema', APP.SCHEMA], ['nom_base', nom], ['proprietaire', moi_()],
    ['dossier_medias_id', dossierId], ['cree_le', maintenant_()]
  ];
  ss.getSheetByName('Config').getRange(2, 1, conf.length, 2).setValues(conf);
}

/** Catégories et emplacements de départ (groupe > entrées). */
const ICONES_GRAINES = {
  'Physique': '🧰', 'Immatériel': '💾', 'Outils bricolage': '🔧', 'Outils auto': '🚗', 'Factures': '🧾', 'Papiers': '📄',
  'Autres (physique)': '📦', 'Fichiers informatiques': '🗂️', 'Événements & photos': '📸', 'Idées': '💡', 'Infos': 'ℹ️',
  'Autres (immatériel)': '🗃️', 'Maison': '🏠', 'Ordinateur': '💻', 'Smartphones': '📱'
};
function graines_() {
  const T = [
    ['Physique', ['Outils bricolage', 'Outils auto', 'Factures', 'Papiers', 'Autres (physique)']],
    ['Immatériel', ['Fichiers informatiques', 'Événements & photos', 'Idées', 'Infos', 'Autres (immatériel)']]
  ];
  const E = [
    ['Maison', ['Garage', 'Cabanon', 'Dépendance', 'Salon', 'Cuisine', 'SDB 1', 'SDB 2', 'Chambre 1', 'Chambre 2',
      'Chambre 3', 'Dressing', 'Cellier', 'Arrière-cuisine', 'Sous-sol']],
    ['Ordinateur', ['Documents', 'Images', 'Vidéos', 'Musiques', 'Téléchargements', 'WD MyCloud', 'Google Drive', 'OneDrive']],
    ['Smartphones', ['Smartphone 1', 'Smartphone 2']]
  ];
  function lignes(groupes) {
    const rows = []; let o = 0;
    groupes.forEach(function (gr) {
      const gid = uid_();
      rows.push([gid, gr[0], '', ++o, ICONES_GRAINES[gr[0]] || '', '']);
      gr[1].forEach(function (n) { rows.push([uid_(), n, gid, ++o, ICONES_GRAINES[n] || '', '']); });
    });
    return rows;
  }
  return { T: lignes(T), E: lignes(E) };
}

/* ====================================================================
 * Accès à une base
 * ==================================================================== */

/** Vérifie que l'ID a la bonne forme ET figure dans la liste des bases de l'utilisateur. */
function verifierBase_(id) {
  if (!RE_ID.test(String(id || ''))) throw new Error('Base inconnue.');
  if (!lireBases_().some(function (b) { return b.id === id; })) {
    throw new Error('Base inconnue : ouvre-la depuis « Bases » ou avec un lien d’invitation.');
  }
}

/** Ouvre la base ; le rôle est relu en direct dans Drive (jamais fourni par la page). */
function ouvrir_(baseId, ecriture) {
  verifierBase_(baseId);
  const r = roleLive_(baseId);
  if (ecriture && r.role === ROLE.LECTURE) throw new Error('Cette base est en lecture seule pour toi.');
  return { ss: SpreadsheetApp.openById(baseId), role: r.role, file: r.file, id: baseId };
}

/** Exécute une écriture sous verrou, puis invalide le cache de la base. */
function ecrire_(baseId, fn) {
  const b = ouvrir_(baseId, true);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(b); }
  finally { invalider_(baseId); lock.releaseLock(); }
}

function lireConfig_(ss) {
  const c = {};
  const sh = ss.getSheetByName('Config');
  if (!sh) return c;
  const n = sh.getLastRow() - 1;
  if (n < 1) return c;
  sh.getRange(2, 1, n, 2).getValues().forEach(function (r) { c[txt_(r[0])] = txt_(r[1]); });
  return c;
}

function dossierDe_(b) {
  if (!b.dossierId) b.dossierId = lireConfig_(b.ss).dossier_medias_id;
  if (!b.dossierId) throw new Error('Dossier de médias introuvable pour cette base.');
  return b.dossierId;
}

function lireTable_(sh, nc) {
  const n = sh.getLastRow() - 1;
  return n < 1 ? [] : sh.getRange(2, 1, n, nc).getValues();
}
function colonne_(sh, col1) {
  const n = sh.getLastRow() - 1;
  return n < 1 ? [] : sh.getRange(2, col1, n, 1).getValues().map(function (r) { return r[0]; });
}
function trouverLigne_(sh, id) {
  const ids = colonne_(sh, 1);
  for (let i = 0; i < ids.length; i++) if (txt_(ids[i]) === id) return i + 2;
  return 0;
}
/** Écrit une ligne en forçant le format TEXTE sur les cellules visées (jamais de formule ni de date automatique). */
function ajouterLigne_(sh, row) {
  const rng = sh.getRange(sh.getLastRow() + 1, 1, 1, row.length);
  rng.setNumberFormat('@');
  rng.setValues([row]);
}
function ecrireLigne_(sh, ligne, row) {
  const rng = sh.getRange(ligne, 1, 1, row.length);
  rng.setNumberFormat('@');
  rng.setValues([row]);
}
function journal_(ss, action, id) {
  ss.getSheetByName('Journal').appendRow([maintenant_(), moi_(), action, id || '']);
}

function lireArbre_(ss, kind) {
  const sh = ss.getSheetByName(ARBRES[kind]);
  let rows;
  try { rows = lireTable_(sh, NC_ARBRE); } catch (e) { rows = lireTable_(sh, 4); }   // ancienne base sans les colonnes icone / photo
  return rows
    .filter(function (r) { return txt_(r[0]); })
    .map(function (r) { return { id: txt_(r[0]), nom: txt_(r[1]), p: txt_(r[2]) || null, o: Number(r[3]) || 0, ic: txt_(r[4]), ph: txt_(r[5]) }; })
    .sort(function (a, b) { return a.o - b.o; });
}

/* ====================================================================
 * Cache (données de la base, par utilisateur) + numéro de version partagé
 * Chaque écriture change le numéro de version → tous les caches deviennent périmés.
 * ==================================================================== */
function versionBase_(id) {
  const c = CacheService.getScriptCache();
  let v = c.get('v:' + id);
  if (!v) { v = Utilities.getUuid().slice(0, 8); c.put('v:' + id, v, 21600); }
  return v;
}
function invalider_(id) {
  try { CacheService.getScriptCache().put('v:' + id, Utilities.getUuid().slice(0, 8), 21600); } catch (e) { /* sans gravité */ }
}
function lireCache_(id, ver) {
  try {
    const cache = CacheService.getUserCache();
    const meta = cache.get('m:' + id);
    if (!meta) return null;
    const m = JSON.parse(meta);
    if (m.ver !== ver || Date.now() - m.t > 300000) return null;   // 5 min max (le rôle est revérifié)
    const cles = [];
    for (let i = 0; i < m.n; i++) cles.push('d:' + id + ':' + i);
    const parts = cache.getAll(cles);
    let s = '';
    for (let i = 0; i < cles.length; i++) { if (parts[cles[i]] === undefined) return null; s += parts[cles[i]]; }
    return JSON.parse(s);
  } catch (e) { return null; }
}
function ecrireCache_(id, ver, data) {
  try {
    const cache = CacheService.getUserCache();
    const s = JSON.stringify(data);
    const TAILLE = 30000;                       // < 100 Ko par clé, même avec des accents
    const lot = {}; let n = 0;
    for (let i = 0; i < s.length; i += TAILLE) lot['d:' + id + ':' + (n++)] = s.slice(i, i + TAILLE);
    cache.putAll(lot, 600);
    cache.put('m:' + id, JSON.stringify({ ver: ver, n: n, t: Date.now() }), 600);
  } catch (e) { /* cache indisponible ou trop gros : on continue sans */ }
}

/* ====================================================================
 * Lecture de la base (un seul appel : la page filtre et recherche ensuite)
 * Les valeurs sensibles ne sont JAMAIS envoyées ici (voir lireValeurSensible).
 * ==================================================================== */
function chargerBase(baseId) {
  verifierBase_(baseId);
  const ver = versionBase_(baseId);
  const cache = lireCache_(baseId, ver);
  if (cache) return cache;

  const b = ouvrir_(baseId, false);
  const conf = lireConfig_(b.ss);
  const nette = function (n) { return { id: n.id, nom: n.nom, p: n.p, ic: n.ic, ph: n.ph }; };
  const data = {
    base: { id: baseId, nom: conf.nom_base || b.ss.getName(), role: b.role, proprietaire: conf.proprietaire || '' },
    types: lireArbre_(b.ss, 'T').map(nette),
    emps: lireArbre_(b.ss, 'E').map(nette),
    items: lireTable_(b.ss.getSheetByName('Elements'), EL.length)
      .filter(function (r) { return txt_(r[0]); }).map(elDepuisLigne_),
    ver: ver,
    genere: maintenant_()
  };
  ecrireCache_(baseId, ver, data);
  return data;
}

/** Ligne du Sheet → élément pour la page (mêmes noms de champs que le POC). */
function elDepuisLigne_(r) {
  const dh = txt_(r[COL.date_modif]);
  return {
    id: txt_(r[COL.id]), titre: txt_(r[COL.titre]), desc: txt_(r[COL.description]),
    t: txt_(r[COL.type_id]), t2: txt_(r[COL.type2_id]),
    e: txt_(r[COL.emplacement_id]), e2: txt_(r[COL.emplacement2_id]),
    ph: liste_(r[COL.photos]), au: txt_(r[COL.audio]) || null,
    da: dateOk_(r[COL.date_achat]), df: dateOk_(r[COL.date_fin]),
    pret: bool_(r[COL.prete]), pa: txt_(r[COL.prete_a]), dp: dateOk_(r[COL.date_pret]),
    sens: bool_(r[COL.sensible]), tags: txt_(r[COL.tags]),
    dc: txt_(r[COL.date_creation]), dh: dh, date: dh.slice(0, 10), par: txt_(r[COL.modifie_par])
  };
}

/** Valeur sensible d'un élément, lue à la demande (clic sur « Afficher »). */
function lireValeurSensible(baseId, id) {
  const b = ouvrir_(baseId, false);
  const sh = b.ss.getSheetByName('Elements');
  const l = trouverLigne_(sh, txt_(id));
  if (!l) throw new Error('Élément introuvable.');
  const r = sh.getRange(l, 1, 1, EL.length).getValues()[0];
  return bool_(r[COL.sensible]) ? txt_(r[COL.valeur_sensible]) : '';
}

/* ====================================================================
 * Éléments : ajout, modification, prêt, suppression
 * ==================================================================== */

/** Contrôle et nettoie un élément reçu de la page, puis construit la ligne du Sheet. */
function construireLigne_(b, el, ancienne, id) {
  el = el || {};
  const titre = txt_(el.titre, LIMITES.TITRE).trim();
  if (!titre) throw new Error('Le titre est obligatoire.');

  const idsT = {}; lireArbre_(b.ss, 'T').forEach(function (n) { idsT[n.id] = 1; });
  const idsE = {}; lireArbre_(b.ss, 'E').forEach(function (n) { idsE[n.id] = 1; });
  const choisir = function (set, v) { v = txt_(v); return set[v] ? v : ''; };
  const t = choisir(idsT, el.t), e = choisir(idsE, el.e);
  let t2 = choisir(idsT, el.t2), e2 = choisir(idsE, el.e2);
  if (!t) throw new Error('Choisis une catégorie.');
  if (!e) throw new Error('Choisis un emplacement.');
  if (t2 === t) t2 = '';
  if (e2 === e) e2 = '';

  const pret = !!el.pret, sens = !!el.sens;
  const pa = pret ? txt_(el.pa, 100).trim() : '';
  const dp = pret ? (dateOk_(el.dp) || aujourdhui_()) : '';

  // valeur sensible : non fournie (null / absente) = on garde l'ancienne
  let sv = '';
  if (sens) {
    sv = (el.sv === null || el.sv === undefined)
      ? (ancienne ? txt_(ancienne[COL.valeur_sensible]) : '')
      : txt_(el.sv, LIMITES.TEXTE);
  }

  // médias : seuls des fichiers déjà présents dans le dossier de la base sont acceptés
  const anciensPh = ancienne ? liste_(ancienne[COL.photos]) : [];
  const ph = [];
  (Array.isArray(el.ph) ? el.ph : []).forEach(function (x) {
    x = txt_(x);
    if (RE_ID.test(x) && ph.indexOf(x) < 0) ph.push(x);
  });
  ph.splice(LIMITES.PHOTOS);
  let au = el.au ? txt_(el.au) : '';
  if (au && !RE_ID.test(au)) au = '';
  const ancienAu = ancienne ? txt_(ancienne[COL.audio]) : '';
  ph.filter(function (x) { return anciensPh.indexOf(x) < 0; }).concat(au && au !== ancienAu ? [au] : [])
    .forEach(function (x) { if (!dansDossier_(x, dossierDe_(b), b.id)) throw new Error('Fichier joint invalide.'); });

  const now = maintenant_();
  const row = [
    id, titre, txt_(el.desc, LIMITES.DESC), t, t2, e, e2, ph.join(';'), au,
    dateOk_(el.da), dateOk_(el.df), pret ? '1' : '', pa, dp, sens ? '1' : '', sv,
    txt_(el.tags, LIMITES.TAGS).trim(), ancienne ? txt_(ancienne[COL.date_creation]) : now, now, moi_()
  ];
  return { row: row, retires: anciensPh.filter(function (x) { return ph.indexOf(x) < 0; })
    .concat(ancienAu && ancienAu !== au ? [ancienAu] : []) };
}

function ajouterElement(baseId, el) {
  return ecrire_(baseId, function (b) {
    const sh = b.ss.getSheetByName('Elements');
    const existants = {}; colonne_(sh, 1).forEach(function (x) { existants[txt_(x)] = 1; });
    let id; do { id = uid_(); } while (existants[id]);
    const res = construireLigne_(b, el, null, id);
    ajouterLigne_(sh, res.row);
    journal_(b.ss, 'ajout', id);
    return elDepuisLigne_(res.row);
  });
}

function modifierElement(baseId, el) {
  return ecrire_(baseId, function (b) {
    const sh = b.ss.getSheetByName('Elements');
    const id = txt_(el && el.id);
    const l = trouverLigne_(sh, id);
    if (!l) throw new Error('Élément introuvable (supprimé par quelqu’un d’autre ?).');
    const ancienne = sh.getRange(l, 1, 1, EL.length).getValues()[0];
    const res = construireLigne_(b, el, ancienne, id);
    ecrireLigne_(sh, l, res.row);
    supprimerMedias_(b, res.retires);
    journal_(b.ss, 'modif', id);
    return elDepuisLigne_(res.row);
  });
}

function marquerRendu(baseId, id) {
  return ecrire_(baseId, function (b) {
    const sh = b.ss.getSheetByName('Elements');
    const l = trouverLigne_(sh, txt_(id));
    if (!l) throw new Error('Élément introuvable.');
    const r = sh.getRange(l, 1, 1, EL.length).getValues()[0];
    r[COL.prete] = ''; r[COL.prete_a] = ''; r[COL.date_pret] = '';
    r[COL.date_modif] = maintenant_(); r[COL.modifie_par] = moi_();
    ecrireLigne_(sh, l, r);
    journal_(b.ss, 'rendu', txt_(id));
    return elDepuisLigne_(r);
  });
}

/** Suppression DÉFINITIVE (la page doit avoir demandé confirmation). */
function supprimerElement(baseId, id) {
  return ecrire_(baseId, function (b) {
    const sh = b.ss.getSheetByName('Elements');
    id = txt_(id);
    const l = trouverLigne_(sh, id);
    if (!l) throw new Error('Élément introuvable.');
    const r = sh.getRange(l, 1, 1, EL.length).getValues()[0];
    const medias = liste_(r[COL.photos]).concat(txt_(r[COL.audio]) ? [txt_(r[COL.audio])] : []);
    sh.deleteRow(l);
    supprimerMedias_(b, medias);
    journal_(b.ss, 'suppression', id);
    return { ok: true, medias: medias.length };
  });
}

/* ====================================================================
 * Catégories (kind = 'T') et emplacements (kind = 'E')
 * ==================================================================== */
function kindOk_(k) { if (!ARBRES[k]) throw new Error('Type d’arbre inconnu.'); return k; }
function nomOk_(n) {
  n = txt_(n, LIMITES.NOM).trim();
  if (!n) throw new Error('Le nom ne peut pas être vide.');
  return n;
}
function enfantsDe_(rows, id) {
  const res = {}; res[id] = 1;
  let ajout = true;
  while (ajout) {
    ajout = false;
    rows.forEach(function (r) {
      if (!res[txt_(r[0])] && res[txt_(r[2])]) { res[txt_(r[0])] = 1; ajout = true; }
    });
  }
  return res;
}
function doublon_(rows, parent, nom, sauf) {
  return rows.some(function (r) {
    return txt_(r[0]) !== sauf && txt_(r[2]) === parent && txt_(r[1]).toLowerCase() === nom.toLowerCase();
  });
}

function creerNoeud(baseId, kind, nom, parentId) {
  return ecrire_(baseId, function (b) {
    const sh = b.ss.getSheetByName(ARBRES[kindOk_(kind)]);
    nom = nomOk_(nom);
    const parent = txt_(parentId);
    const rows = lireTable_(sh, 4).filter(function (r) { return txt_(r[0]); });
    if (parent && !rows.some(function (r) { return txt_(r[0]) === parent; })) throw new Error('Dossier parent introuvable.');
    if (doublon_(rows, parent, nom, '')) throw new Error('« ' + nom + ' » existe déjà à cet endroit.');
    const ids = {}; rows.forEach(function (r) { ids[txt_(r[0])] = 1; });
    let id; do { id = uid_(); } while (ids[id]);
    const ordre = rows.filter(function (r) { return txt_(r[2]) === parent; })
      .reduce(function (m, r) { return Math.max(m, Number(r[3]) || 0); }, 0) + 1;
    ajouterLigne_(sh, [id, nom, parent, ordre]);
    journal_(b.ss, 'noeud+' + kind, id);
    return { id: id, nom: nom, p: parent || null, ic: '', ph: '' };
  });
}

function renommerNoeud(baseId, kind, id, nom) {
  return ecrire_(baseId, function (b) {
    const sh = b.ss.getSheetByName(ARBRES[kindOk_(kind)]);
    nom = nomOk_(nom); id = txt_(id);
    const brut = lireTable_(sh, 4);
    const i = brut.findIndex(function (r) { return txt_(r[0]) === id; });
    if (i < 0) throw new Error('Entrée introuvable.');
    if (doublon_(brut, txt_(brut[i][2]), nom, id)) throw new Error('« ' + nom + ' » existe déjà à cet endroit.');
    sh.getRange(i + 2, 2).setNumberFormat('@').setValue(nom);
    journal_(b.ss, 'noeud~' + kind, id);
    return { id: id, nom: nom, p: txt_(brut[i][2]) || null, ic: txt_(brut[i][4]), ph: txt_(brut[i][5]) };
  });
}

/**
 * Supprime l'entrée et tous ses descendants. Les éléments concernés ne sont PAS supprimés :
 * ils perdent ce classement (si la 2ᵉ catégorie / 2ᵉ emplacement existe, il devient le principal).
 */
function supprimerNoeud(baseId, kind, id) {
  return ecrire_(baseId, function (b) {
    const k = kindOk_(kind);
    const sh = b.ss.getSheetByName(ARBRES[k]);
    id = txt_(id);
    const rows = lireTable_(sh, NC_ARBRE).filter(function (r) { return txt_(r[0]); });
    if (!rows.some(function (r) { return txt_(r[0]) === id; })) throw new Error('Entrée introuvable.');
    const sup = enfantsDe_(rows, id);
    const gardes = rows.filter(function (r) { return !sup[txt_(r[0])]; });
    const photos = rows.filter(function (r) { return sup[txt_(r[0])] && txt_(r[5]); }).map(function (r) { return txt_(r[5]); });
    sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), NC_ARBRE).clearContent();
    if (gardes.length) sh.getRange(2, 1, gardes.length, NC_ARBRE).setValues(gardes);
    supprimerMedias_(b, photos);

    let declasses = 0;
    const she = b.ss.getSheetByName('Elements');
    const n = she.getLastRow() - 1;
    if (n >= 1) {
      const rng = she.getRange(2, 1, n, EL.length);
      const vals = rng.getValues();
      const c1 = k === 'T' ? COL.type_id : COL.emplacement_id;
      const c2 = k === 'T' ? COL.type2_id : COL.emplacement2_id;
      vals.forEach(function (r) {
        let ch = false;
        if (sup[txt_(r[c1])]) { r[c1] = ''; ch = true; }
        if (sup[txt_(r[c2])]) { r[c2] = ''; ch = true; }
        if (!txt_(r[c1]) && txt_(r[c2])) { r[c1] = r[c2]; r[c2] = ''; ch = true; }
        if (ch) declasses++;
      });
      if (declasses) rng.setValues(vals);
    }
    journal_(b.ss, 'noeud-' + k, id);
    return { supprimes: Object.keys(sup).length, declasses: declasses };
  });
}

/* ---------- Icône et photo d'une catégorie / d'un emplacement ---------- */
function iconeOk_(v) {
  v = txt_(v).trim();
  if (v.length > 12 || /[<>&"'`\\$]/.test(v)) throw new Error('Icône invalide.');
  return v;
}

/**
 * Définit l'icône (texte, ex. un emoji) et/ou la photo d'une entrée. Champ absent = inchangé ;
 * icone '' ou photo '' = retirer (l'ancienne photo est mise à la corbeille).
 */
function definirNoeud(baseId, kind, id, champs) {
  return ecrire_(baseId, function (b) {
    const sh = b.ss.getSheetByName(ARBRES[kindOk_(kind)]);
    id = txt_(id); champs = champs || {};
    const brut = lireTable_(sh, NC_ARBRE);
    const i = brut.findIndex(function (r) { return txt_(r[0]) === id; });
    if (i < 0) throw new Error('Entrée introuvable.');
    let ic = txt_(brut[i][4]), ph = txt_(brut[i][5]);
    const ancienne = ph;
    if (champs.icone !== undefined && champs.icone !== null) ic = iconeOk_(champs.icone);
    if (champs.photo !== undefined && champs.photo !== null) {
      ph = txt_(champs.photo);
      if (ph && (!RE_ID.test(ph) || !dansDossier_(ph, dossierDe_(b), b.id))) throw new Error('Photo invalide.');
    }
    sh.getRange(1, 5, 1, 2).setValues([['icone', 'photo']]).setFontWeight('bold');
    sh.getRange(i + 2, 5, 1, 2).setNumberFormat('@').setValues([[ic, ph]]);
    if (ancienne && ancienne !== ph) supprimerMedias_(b, [ancienne]);
    journal_(b.ss, 'noeud*' + kind, id);
    return { id: id, nom: txt_(brut[i][1]), p: txt_(brut[i][2]) || null, ic: ic, ph: ph };
  });
}

/** Définit plusieurs icônes d'un coup : icones = { idEntrée: 'emoji' }. */
function definirIcones(baseId, kind, icones) {
  return ecrire_(baseId, function (b) {
    const sh = b.ss.getSheetByName(ARBRES[kindOk_(kind)]);
    icones = icones || {};
    const brut = lireTable_(sh, NC_ARBRE);
    const col = brut.map(function (r) { return [txt_(r[4])]; });
    let n = 0;
    brut.forEach(function (r, i) {
      const id = txt_(r[0]);
      if (id && Object.prototype.hasOwnProperty.call(icones, id)) { col[i][0] = iconeOk_(icones[id]); n++; }
    });
    if (n) {
      sh.getRange(1, 5, 1, 2).setValues([['icone', 'photo']]).setFontWeight('bold');
      sh.getRange(2, 5, col.length, 1).setNumberFormat('@').setValues(col);
      journal_(b.ss, 'icones*' + kind, String(n));
    }
    return { modifies: n };
  });
}
