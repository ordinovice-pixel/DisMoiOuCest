/**
 * Partage.gs — Liste des bases de l'utilisateur, rôles, partage, invitation.
 *
 * Principe : le rôle = le droit Drive réel sur le Sheet de la base.
 *   propriétaire  → crée la base, partage, retire des membres
 *   modification  → lit et écrit
 *   lecture       → lit seulement
 * Le rôle est relu dans Drive à chaque écriture : la page ne peut pas le falsifier.
 */

/* ---------- Liste des bases (UserProperties, propre à chaque utilisateur) ---------- */
function lireBases_() {
  try {
    const l = JSON.parse(PropertiesService.getUserProperties().getProperty('bases') || '[]');
    return Array.isArray(l) ? l.filter(function (b) { return b && RE_ID.test(b.id); }) : [];
  } catch (e) { return []; }
}
function ecrireBases_(l) { PropertiesService.getUserProperties().setProperty('bases', JSON.stringify(l)); }
function ajouterAuxBases_(b) {
  const l = lireBases_();
  const i = l.findIndex(function (x) { return x.id === b.id; });
  if (i >= 0) l[i].nom = b.nom;
  else { if (l.length >= LIMITES.BASES) throw new Error('Nombre maximum de bases atteint.'); l.push({ id: b.id, nom: b.nom }); }
  ecrireBases_(l);
}

/** Rôle réel de l'utilisateur sur une base, lu dans Drive. */
function roleLive_(id) {
  let f;
  try { f = DriveApp.getFileById(id); }
  catch (e) { throw new Error('Accès non autorisé à cette base.'); }
  if (f.isTrashed()) throw new Error('Cette base a été supprimée.');
  const moi = moi_();
  const prop = f.getOwner();
  if (prop && prop.getEmail().toLowerCase() === moi) return { role: ROLE.PROPRIO, file: f };
  let acc;
  try { acc = f.getAccess(moi); } catch (e) { acc = DriveApp.Permission.NONE; }
  const P = DriveApp.Permission;
  if (acc === P.OWNER) return { role: ROLE.PROPRIO, file: f };
  if (acc === P.EDIT || acc === P.ORGANIZER || acc === P.FILE_ORGANIZER) return { role: ROLE.MODIF, file: f };
  if (acc === P.VIEW || acc === P.COMMENT) return { role: ROLE.LECTURE, file: f };
  throw new Error('Accès non autorisé. Demande au propriétaire de partager la base avec ton adresse Gmail.');
}

/** Fiche d'une base pour la page (sans jamais échouer : une base inaccessible est signalée). */
function infoBase_(b) {
  try {
    const r = roleLive_(b.id);
    const info = { id: b.id, nom: b.nom, role: r.role, partage: false };
    if (r.role === ROLE.PROPRIO) info.partage = r.file.getEditors().length + r.file.getViewers().length > 0;
    return info;
  } catch (e) {
    return { id: b.id, nom: b.nom, role: null, partage: false, erreur: 'Base inaccessible (accès retiré ou base supprimée).' };
  }
}

/** Retrouve dans le Drive les bases déjà possédées (si la liste de l'utilisateur a été perdue). */
function retrouverBases_() {
  const res = [];
  const it = DriveApp.searchFiles("mimeType = 'application/vnd.google-apps.spreadsheet' and 'me' in owners and trashed = false and title contains 'DMOC'");
  while (it.hasNext() && res.length < LIMITES.BASES) {
    const f = it.next();
    if (f.getName().indexOf(APP.PREFIXE) !== 0) continue;
    try {
      const conf = lireConfig_(SpreadsheetApp.openById(f.getId()));
      if (conf.version_schema) res.push({ id: f.getId(), nom: conf.nom_base || f.getName() });
    } catch (e) { /* pas une base : on ignore */ }
  }
  return res;
}

/** Accepte un lien d'invitation, une URL de Sheet ou un simple identifiant. */
function extraireId_(s) {
  s = String(s || '').trim();
  const m = /[?&]base=([\w-]{20,80})/.exec(s) || /\/d\/([\w-]{20,80})/.exec(s);
  if (m) return m[1];
  return RE_ID.test(s) ? s : '';
}

function rejoindreBase_(id) {
  if (!RE_ID.test(id)) throw new Error('Lien d’invitation invalide.');
  const deja = lireBases_().filter(function (b) { return b.id === id; })[0];
  if (deja) return deja;
  roleLive_(id);                                              // lève « Accès non autorisé » si pas partagé
  const ss = SpreadsheetApp.openById(id);
  const conf = lireConfig_(ss);
  if (!conf.version_schema) throw new Error('Ce document n’est pas une base « ' + APP.NOM + ' ».');
  const base = { id: id, nom: conf.nom_base || ss.getName() };
  ajouterAuxBases_(base);
  return base;
}

/* ---------- API publique : bases ---------- */
function creerBase(nom) {
  const b = creerBase_(nom);
  return infoBase_(b);
}

/** Rejoindre une base à partir du lien reçu (ou de son identifiant). */
function rejoindreBase(lien) {
  const id = extraireId_(lien);
  if (!id) throw new Error('Lien d’invitation invalide.');
  return infoBase_(rejoindreBase_(id));
}

/** Retire la base de MA liste (n'efface rien dans Drive). */
function oublierBase(baseId) {
  const l = lireBases_().filter(function (b) { return b.id !== baseId; });
  ecrireBases_(l);
  const p = lirePrefs_();
  if (p.baseActive === baseId) { delete p.baseActive; PropertiesService.getUserProperties().setProperty('prefs', JSON.stringify(p)); }
  return { ok: true };
}

/* ---------- API publique : partage (propriétaire uniquement) ---------- */
function proprio_(baseId) {
  const b = ouvrir_(baseId, false);
  if (b.role !== ROLE.PROPRIO) throw new Error('Seul le propriétaire de la base peut gérer le partage.');
  return b;
}
function retirerAcces_(objet, email) {
  try { objet.removeEditor(email); } catch (e) { /* pas éditeur */ }
  try { objet.removeViewer(email); } catch (e) { /* pas lecteur */ }
}

/**
 * Partage la base (Sheet + dossier de photos) avec une adresse Gmail.
 * Google envoie un e-mail de notification à la personne.
 */
/** Texte joint à l'e-mail de partage envoyé par Google Drive (lien d'invitation + explications). */
function messagePartage_(nomBase, proprio, role, lien, objet) {
  const droits = role === ROLE.MODIF ? 'modification (tu peux ajouter, modifier et supprimer des éléments)' : 'lecture seule (tu peux chercher et consulter, sans rien modifier)';
  const cible = objet === 'dossier' ? 'le dossier Drive (les photos et les sons)' : 'le classeur Google Sheet (les données)';
  return 'Bonjour,\n\n' + proprio + ' te partage la base « ' + nomBase + ' » de l’application « ' + APP.NOM + ' », qui sert à retrouver en quelques secondes où se trouvent tes affaires, papiers, fichiers et infos.\n\n'
    + 'POUR L’OUVRIR : clique sur ce lien d’invitation, avec CE compte Google :\n' + lien + '\n\n'
    + 'COMMENT ÇA MARCHE\n'
    + '- Chacun a sa base personnelle, créée automatiquement à la première connexion. Elle est privée : personne d’autre n’y a accès.\n'
    + '- Une base partagée, comme celle-ci, est un classeur Google Sheet et un dossier Drive qui restent dans le Drive de ' + proprio + '. Elle apparaît dans la rubrique « Bases » de l’application, à côté de ta base personnelle : tu passes de l’une à l’autre d’un geste.\n'
    + '- Tes droits sur cette base : ' + droits + '.\n'
    + '- Tu peux la quitter quand tu veux (Bases, puis Quitter) : rien n’est supprimé.\n\n'
    + 'À SAVOIR\n'
    + '- Ce message est envoyé automatiquement par Google Drive et concerne ' + cible + '. Tu peux recevoir un second message pour l’autre élément : un seul lien suffit.\n'
    + '- Ne modifie pas le classeur ni le dossier à la main : passe par l’application.\n'
    + '- À la première ouverture, Google affiche « application non vérifiée » : clique sur « Paramètres avancés », puis sur « Accéder à ' + APP.NOM + ' ».';
}

/** Donne l'accès à un fichier ou dossier. Utilise le service Drive avancé (e-mail personnalisé) s'il est activé, sinon DriveApp (e-mail Google standard). */
function accorder_(objet, email, role, message) {
  retirerAcces_(objet, email);
  if (typeof Drive !== 'undefined' && Drive && Drive.Permissions && Drive.Permissions.create) {
    try {
      Drive.Permissions.create({ type: 'user', role: role === ROLE.MODIF ? 'writer' : 'reader', emailAddress: email },
        objet.getId(), { sendNotificationEmail: true, emailMessage: message });
      return true;
    } catch (e) { /* repli ci-dessous */ }
  }
  if (role === ROLE.MODIF) objet.addEditor(email); else objet.addViewer(email);
  return false;
}

function partagerBase(baseId, email, role) {
  const b = proprio_(baseId);
  email = txt_(email).trim().toLowerCase();
  if (!RE_EMAIL.test(email)) throw new Error('Adresse e-mail invalide.');
  if (email === moi_()) throw new Error('Tu es déjà propriétaire de cette base.');
  if (role !== ROLE.MODIF && role !== ROLE.LECTURE) throw new Error('Droit inconnu : choisis « lecture » ou « modification ».');
  const dossier = DriveApp.getFolderById(dossierDe_(b));
  const nom = lireConfig_(b.ss).nom_base || b.ss.getName();
  const lien = ScriptApp.getService().getUrl() + '?base=' + baseId;
  const perso = [[b.file, 'classeur'], [dossier, 'dossier']].map(function (x) {
    return accorder_(x[0], email, role, messagePartage_(nom, moi_(), role, lien, x[1]));
  });
  invalider_(baseId);
  journal_(b.ss, 'partage:' + role, email);
  return { ok: true, email: email, role: role, mailPerso: perso.every(Boolean) };
}
function listerMembres(baseId) {
  const b = proprio_(baseId);
  const m = [];
  b.file.getEditors().forEach(function (u) { m.push({ email: u.getEmail().toLowerCase(), role: ROLE.MODIF }); });
  b.file.getViewers().forEach(function (u) { m.push({ email: u.getEmail().toLowerCase(), role: ROLE.LECTURE }); });
  return m;
}

function retirerMembre(baseId, email) {
  const b = proprio_(baseId);
  email = txt_(email).trim().toLowerCase();
  if (!RE_EMAIL.test(email)) throw new Error('Adresse e-mail invalide.');
  retirerAcces_(b.file, email);
  retirerAcces_(DriveApp.getFolderById(dossierDe_(b)), email);
  invalider_(baseId);
  journal_(b.ss, 'retrait', email);
  return { ok: true };
}

/** Lien à envoyer à la personne (après partage) : ouvre l'application et ajoute la base. */
function lienInvitation(baseId) {
  proprio_(baseId);
  return ScriptApp.getService().getUrl() + '?base=' + baseId;
}
