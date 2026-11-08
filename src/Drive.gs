/**
 * Drive.gs — Photos, miniatures et sons.
 *
 * - Photo complète (~900 px, JPEG) : fichier dans le dossier Drive de la base.
 * - Miniature (~160 px) : texte stocké dans l'onglet masqué « Miniatures » → toutes les
 *   miniatures d'un écran se lisent en UN appel (lire un fichier Drive prend ~1 s chacun).
 * - Son : fichier dans le dossier de la base, lu à la demande.
 * - Aucun lien Drive public : tout passe par le serveur, avec les droits de l'utilisateur.
 */

const MAX_PHOTO_CHARS = 3500000;    // ≈ 2,6 Mo une fois décodée
const MAX_MINI_CHARS = 45000;       // une cellule Sheets accepte 50 000 caractères
const MAX_SON_CHARS = 7000000;      // ≈ 5 Mo

/** Décode une data-URL en contrôlant le type et la taille. */
function decoderDataUrl_(s, reMime, maxChars, nom) {
  s = String(s || '');
  if (s.length > maxChars) throw new Error('Fichier trop volumineux.');
  const i = s.indexOf(';base64,');
  const tete = i > 0 ? s.slice(0, i) : '';
  const m = /^data:([\w.+\/-]+)(?:;[\w=.+-]+)*$/.exec(tete);
  const corps = s.slice(i + 8);
  if (!m || !reMime.test(m[1]) || !/^[A-Za-z0-9+\/=]+$/.test(corps)) throw new Error('Format de fichier non accepté.');
  return { mime: m[1], blob: Utilities.newBlob(Utilities.base64Decode(corps), m[1], nom) };
}
function extension_(mime) {
  const t = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/ogg': 'ogg', 'audio/webm': 'webm', 'audio/wav': 'wav',
    'audio/x-wav': 'wav', 'audio/amr': 'amr', 'audio/3gpp': '3gp' };
  return t[mime] || 'bin';
}
function aleatoire_() { return Utilities.getUuid().slice(0, 6); }

/**
 * Le fichier est-il une photo ou un son créé par l'application, rangé dans le dossier de la base ?
 * Le Sheet de la base (qui est dans le même dossier) et tout autre fichier sont refusés :
 * sinon un membre pourrait faire mettre la base elle-même à la corbeille.
 */
function dansDossier_(fileId, dossierId, baseId) {
  if (fileId === baseId) return false;
  try {
    const f = DriveApp.getFileById(fileId);
    if (!/^[ps]_\d{10,}_[0-9a-f]{6}\.\w+$/.test(f.getName())) return false;
    const it = f.getParents();
    while (it.hasNext()) if (it.next().getId() === dossierId) return true;
  } catch (e) { /* introuvable ou inaccessible */ }
  return false;
}

/* ---------- Envoi (droit « modification » requis) ---------- */
/** Envoie une photo + sa miniature. Retourne l'identifiant à placer dans l'élément (champ ph). */
function envoyerPhoto(baseId, photoDataUrl, miniDataUrl) {
  const b = ouvrir_(baseId, true);
  const nom = 'p_' + Date.now() + '_' + aleatoire_();
  const ph = decoderDataUrl_(photoDataUrl, /^image\/(jpeg|png|webp)$/, MAX_PHOTO_CHARS, nom);
  const mini = String(miniDataUrl || '');
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(mini) || mini.length > MAX_MINI_CHARS) {
    throw new Error('Miniature invalide.');
  }
  ph.blob.setName(nom + '.' + extension_(ph.mime));
  const f = DriveApp.getFolderById(dossierDe_(b)).createFile(ph.blob);
  b.ss.getSheetByName('Miniatures').appendRow([f.getId(), mini]);
  return { id: f.getId() };
}

/** Envoie un fichier son. Retourne l'identifiant à placer dans l'élément (champ au). */
function envoyerSon(baseId, dataUrl) {
  const b = ouvrir_(baseId, true);
  const nom = 's_' + Date.now() + '_' + aleatoire_();
  const s = decoderDataUrl_(dataUrl, /^audio\/[\w.+-]+$/, MAX_SON_CHARS, nom);
  s.blob.setName(nom + '.' + extension_(s.mime));
  const f = DriveApp.getFolderById(dossierDe_(b)).createFile(s.blob);
  return { id: f.getId() };
}

/* ---------- Lecture ---------- */
/** Miniatures demandées (jusqu'à 60 identifiants de photos) → { id: dataUrl }. */
function lireMiniatures(baseId, ids) {
  const b = ouvrir_(baseId, false);
  const voulus = {};
  (Array.isArray(ids) ? ids : []).slice(0, 60).forEach(function (x) { if (RE_ID.test(txt_(x))) voulus[txt_(x)] = 1; });
  const res = {};
  lireTable_(b.ss.getSheetByName('Miniatures'), 2).forEach(function (r) {
    const id = txt_(r[0]);
    if (voulus[id]) res[id] = txt_(r[1]);
  });
  return res;
}

function fichierDeElement_(baseId, id, col, aussiArbres) {
  const b = ouvrir_(baseId, false);
  id = txt_(id);
  const refs = colonne_(b.ss.getSheetByName('Elements'), col + 1);
  let ok = RE_ID.test(id) && refs.some(function (v) { return liste_(v).indexOf(id) >= 0; });
  if (!ok && aussiArbres && RE_ID.test(id)) {     // photo d'une catégorie ou d'un emplacement
    ok = ['T', 'E'].some(function (k) { return lireArbre_(b.ss, k).some(function (n) { return n.ph === id; }); });
  }
  if (!ok) throw new Error('Fichier introuvable.');
  const blob = DriveApp.getFileById(id).getBlob();
  return { dataUrl: 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes()) };
}
/** Photo complète d'un élément. */
function lirePhoto(baseId, id) { return fichierDeElement_(baseId, id, COL.photos, true); }
/** Son d'un élément. */
function lireSon(baseId, id) { return fichierDeElement_(baseId, id, COL.audio); }

/* ---------- Suppression ---------- */
/** Met à la corbeille les fichiers (seulement ceux du dossier de la base) et efface leurs miniatures. */
function supprimerMedias_(b, ids) {
  if (!ids || !ids.length) return;
  const dossier = dossierDe_(b);
  const set = {};
  ids.forEach(function (id) {
    if (dansDossier_(id, dossier, b.id)) {
      set[id] = 1;
      try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { /* déjà supprimé */ }
    }
  });
  const sh = b.ss.getSheetByName('Miniatures');
  const col = colonne_(sh, 1);
  for (let i = col.length - 1; i >= 0; i--) if (set[txt_(col[i])]) sh.deleteRow(i + 2);
}

/**
 * Maintenance (propriétaire) : met à la corbeille les photos et sons du dossier qui ne sont
 * rattachés à aucun élément (ex. formulaire abandonné après l'envoi d'une photo).
 */
function nettoyerMedias(baseId) {
  const b = proprio_(baseId);
  const utilises = {};
  const sh = b.ss.getSheetByName('Elements');
  colonne_(sh, COL.photos + 1).forEach(function (v) { liste_(v).forEach(function (x) { utilises[x] = 1; }); });
  colonne_(sh, COL.audio + 1).forEach(function (v) { if (txt_(v)) utilises[txt_(v)] = 1; });
  ['T', 'E'].forEach(function (k) { lireArbre_(b.ss, k).forEach(function (n) { if (n.ph) utilises[n.ph] = 1; }); });
  const orphelins = [];
  const it = DriveApp.getFolderById(dossierDe_(b)).getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (f.getId() === baseId || utilises[f.getId()]) continue;
    if (Date.now() - f.getDateCreated().getTime() < 3600000) continue;     // < 1 h : peut-être en cours de saisie
    orphelins.push(f.getId());
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { supprimerMedias_(b, orphelins); } finally { lock.releaseLock(); }
  return { corbeille: orphelins.length };
}
