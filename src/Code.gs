/**
 * « Dis moi où c'est ! » — Backend Google Apps Script (étape 3)
 *
 * Fichiers du projet :
 *   Code.gs         point d'entrée, utilitaires, démarrage, préférences
 *   Base.gs         feuilles Google Sheets, éléments, catégories/emplacements, cache
 *   Partage.gs      liste des bases, rôles (Drive), partage, invitation
 *   Drive.gs        photos, miniatures, sons
 *   Diagnostic.html page de test du backend (sera remplacée par index.html à l'étape 4)
 *   appsscript.json manifeste
 *
 * Conventions : une fonction SANS « _ » final est publique (appelable depuis la page
 * avec google.script.run) ; une fonction qui finit par « _ » est privée.
 * Toute erreur lancée (throw new Error) arrive à la page avec son message en français.
 */

const APP = { NOM: "Dis moi où c'est !", SCHEMA: '1', PREFIXE: 'DMOC – ' };

/** Page servie par l'application (…/exec). La page de test reste disponible avec …/exec?page=diag */
const PAGE_PRINCIPALE = 'index';
const PAGE_DIAGNOSTIC = 'Diagnostic';

const ROLE = { PROPRIO: 'propriétaire', MODIF: 'modification', LECTURE: 'lecture' };
const RE_ID = /^[\w-]{20,80}$/;
const RE_EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;
const LIMITES = { TITRE: 200, DESC: 5000, TAGS: 500, NOM: 80, TEXTE: 200, PHOTOS: 12, BASES: 20 };

/* ====================================================================
 * Point d'entrée web
 * ==================================================================== */
function doGet(e) {
  // Lien d'invitation : …/exec?base=ID_DU_SHEET (l'ID est filtré avant d'être écrit dans la page)
  const invite = String((e && e.parameter && e.parameter.base) || '');
  const idOk = RE_ID.test(invite) ? invite : '';
  let sortie;
  if (e && e.parameter && e.parameter.page === 'diag') {
    const t = HtmlService.createTemplateFromFile(PAGE_DIAGNOSTIC);
    t.invite = idOk;
    sortie = t.evaluate();
  } else {
    // Page principale envoyée telle quelle (sans moteur de modèles, qui pouvait abîmer le code)
    const contenu = HtmlService.createHtmlOutputFromFile(PAGE_PRINCIPALE).getContent()
      .replace('"__INVITE__"', function () { return JSON.stringify(idOk); });
    sortie = HtmlService.createHtmlOutput(contenu);
  }
  return sortie
    .setTitle(APP.NOM)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ====================================================================
 * Utilitaires
 * ==================================================================== */
function uid_() { return 'x' + Utilities.getUuid().replace(/-/g, '').slice(0, 9); }

function maintenant_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
}
function aujourdhui_() { return maintenant_().slice(0, 10); }

/** Convertit n'importe quelle valeur de cellule en texte (les dates deviennent AAAA-MM-JJ). */
function txt_(v, max) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  v = String(v);
  return max ? v.slice(0, max) : v;
}
function bool_(v) { return v === true || v === 1 || v === '1' || v === 'TRUE' || v === 'oui'; }
function dateOk_(s) { s = txt_(s, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; }
function liste_(v) { return txt_(v).split(';').map(function (s) { return s.trim(); }).filter(Boolean); }

/** E-mail (en minuscules) du compte Google qui utilise l'application. */
function moi_() {
  const m = Session.getActiveUser().getEmail();
  if (!m) throw new Error('Compte Google non identifié. Ouvre l’application avec ton compte Google.');
  return m.toLowerCase();
}

/* ====================================================================
 * Préférences de l'utilisateur (thème, charte, base active)
 * ==================================================================== */
function lirePrefs_() {
  try { return JSON.parse(PropertiesService.getUserProperties().getProperty('prefs') || '{}'); }
  catch (e) { return {}; }
}

/** Enregistre les préférences d'affichage. Valeurs inconnues ignorées. */
function sauverPrefs(p) {
  p = p || {};
  const cur = lirePrefs_();
  if (['light', 'dark'].indexOf(p.theme) >= 0) cur.theme = p.theme;
  if (['azur', 'ocean', 'indigo'].indexOf(p.charte) >= 0) cur.charte = p.charte;
  if (typeof p.baseActive === 'string' && lireBases_().some(function (b) { return b.id === p.baseActive; })) cur.baseActive = p.baseActive;
  PropertiesService.getUserProperties().setProperty('prefs', JSON.stringify(cur));
  return cur;
}

/* ====================================================================
 * Démarrage : appelé une fois à l'ouverture de la page
 * - traite un éventuel lien d'invitation
 * - à la 1re connexion : retrouve ou crée la base perso (Sheet + dossier Drive)
 * - renvoie la liste des bases avec le rôle réel de l'utilisateur
 * ==================================================================== */
function demarrer(invite) {
  const moi = moi_();
  const props = PropertiesService.getUserProperties();
  let message = '';

  if (invite && RE_ID.test(invite)) {
    try { message = 'Base « ' + rejoindreBase_(invite).nom + ' » ajoutée à tes bases.'; }
    catch (e) { message = e.message; }
  }

  let bases = lireBases_();
  if (!props.getProperty('perso_ok') || !bases.length) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      if (!props.getProperty('perso_ok') || !lireBases_().length) {
        const trouvees = retrouverBases_();          // bases déjà possédées (liste perdue ?)
        trouvees.forEach(ajouterAuxBases_);
        if (!trouvees.length) {
          creerBase_('Ma base perso');
          message = (message ? message + ' ' : '') + 'Ta base « Ma base perso » vient d’être créée dans ton Drive.';
        }
        props.setProperty('perso_ok', '1');
      }
    } finally { lock.releaseLock(); }
    bases = lireBases_();
  }

  const liste = bases.map(infoBase_);
  const prefs = lirePrefs_();
  let active = prefs.baseActive;
  if (!liste.some(function (b) { return b.id === active && b.role; })) {
    const prem = liste.filter(function (b) { return b.role === ROLE.PROPRIO; })[0] || liste.filter(function (b) { return b.role; })[0];
    active = prem ? prem.id : '';
  }
  if (invite && liste.some(function (b) { return b.id === invite && b.role; })) active = invite;

  return { email: moi, bases: liste, baseActive: active, prefs: prefs, message: message, urlApp: ScriptApp.getService().getUrl() };
}
