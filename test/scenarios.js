const { creerMonde } = require('./mock');
const assert = require('assert');
let ok = 0, ko = 0;
const test = (nom, fn) => { try { fn(); ok++; console.log('  ✔', nom); } catch (e) { ko++; console.log('  ✘', nom, '\n     ', e.message); } };
const echoue = (nom, fn, motif) => test(nom, () => { let err; try { fn(); } catch (e) { err = e; } assert(err, 'aurait dû échouer'); if (motif) assert(String(err.message).includes(motif), 'message reçu : ' + err.message); });

const A = 'alice@gmail.com', B = 'bob@gmail.com', C = 'carol@gmail.com';
const m = creerMonde();
const call = (u, fn, ...a) => m.appel(u, fn, ...a);
const jpg = n => 'data:image/jpeg;base64,' + Buffer.from('JPEG' + n + 'x'.repeat(50)).toString('base64');
const mini = n => 'data:image/jpeg;base64,' + Buffer.from('MINI' + n).toString('base64');

console.log('\n1. Première connexion');
let d1;
test('alice démarre : base perso créée automatiquement', () => {
  d1 = call(A, 'demarrer', '');
  assert.strictEqual(d1.bases.length, 1); assert.strictEqual(d1.bases[0].role, 'propriétaire'); assert.strictEqual(d1.baseActive, d1.bases[0].id);
  assert(d1.message.includes('créée'));
});
const BASE = d1.baseActive;
test('un 2e démarrage ne recrée rien', () => { const d = call(A, 'demarrer', ''); assert.strictEqual(d.bases.length, 1); assert.strictEqual(m.files.size, 2); });
test('le Sheet est rangé dans le dossier de la base', () => { const f = m.files.get(BASE); const dossier = m.files.get(f.parent); assert(dossier && dossier.name.startsWith('DMOC – Ma base perso')); });
let data;
test('chargerBase : arbres de départ (12 catégories, 27 emplacements), 0 élément', () => {
  data = call(A, 'chargerBase', BASE);
  assert.strictEqual(data.types.length, 12); assert.strictEqual(data.emps.length, 27); assert.strictEqual(data.items.length, 0);
  assert.strictEqual(data.types.filter(n => !n.p)[0].nom, 'Physique'); assert.strictEqual(data.emps.filter(n => !n.p).map(n => n.nom).join(), 'Maison,Ordinateur,Smartphones');
});
const T1 = data.types.find(n => n.p), T2 = data.types.filter(n => n.p)[7], E1 = data.emps.find(n => n.p), E2 = data.emps.filter(n => n.p)[3];

console.log('\n2. Éléments');
let el;
test('ajouterElement', () => {
  el = call(A, 'ajouterElement', BASE, { titre: '  Perceuse <b>Bosch</b> ', desc: '=1+1', t: T1.id, t2: T2.id, e: E1.id, e2: E2.id, tags: 'perceuse', sens: true, sv: 'B2547A', da: '2025-03-04' });
  assert.strictEqual(el.titre, 'Perceuse <b>Bosch</b>'); assert.strictEqual(el.desc, '=1+1'); assert.strictEqual(el.t2, T2.id); assert.strictEqual(el.da, '2025-03-04');
  assert(el.sens); assert(!('sv' in el)); assert(el.dh && el.date.length === 10);
});
echoue('titre obligatoire', () => call(A, 'ajouterElement', BASE, { titre: ' ', t: T1.id, e: E1.id }), 'titre');
echoue('catégorie inconnue refusée', () => call(A, 'ajouterElement', BASE, { titre: 'x', t: 'bidon', e: E1.id }), 'catégorie');
echoue('emplacement obligatoire', () => call(A, 'ajouterElement', BASE, { titre: 'x', t: T1.id }), 'emplacement');
test('la même catégorie en 2ᵉ position est ignorée', () => { const x = call(A, 'ajouterElement', BASE, { titre: 'dbl', t: T1.id, t2: T1.id, e: E1.id }); assert.strictEqual(x.t2, ''); call(A, 'supprimerElement', BASE, x.id); });
test('valeur sensible : absente des données chargées', () => { const s = JSON.stringify(call(A, 'chargerBase', BASE)); assert(!s.includes('B2547A')); });
test('valeur sensible : lue à la demande', () => assert.strictEqual(call(A, 'lireValeurSensible', BASE, el.id), 'B2547A'));
test('modifier avec sv=null conserve la valeur', () => { call(A, 'modifierElement', BASE, { ...el, titre: 'Perceuse', sv: null }); assert.strictEqual(call(A, 'lireValeurSensible', BASE, el.id), 'B2547A'); });
test('modifier avec une nouvelle valeur la remplace', () => { call(A, 'modifierElement', BASE, { ...el, sv: 'NEW' }); assert.strictEqual(call(A, 'lireValeurSensible', BASE, el.id), 'NEW'); });
test('décocher « sensible » efface la valeur', () => { call(A, 'modifierElement', BASE, { ...el, sens: false, sv: null }); assert.strictEqual(call(A, 'lireValeurSensible', BASE, el.id), ''); call(A, 'modifierElement', BASE, { ...el, sens: true, sv: 'B2547A' }); });
test('prêt puis marquer rendu', () => {
  const p = call(A, 'modifierElement', BASE, { ...el, pret: true, pa: 'Marc', dp: '', sv: null }); assert(p.pret); assert.strictEqual(p.pa, 'Marc'); assert.strictEqual(p.dp.length, 10);
  const r = call(A, 'marquerRendu', BASE, el.id); assert(!r.pret); assert.strictEqual(r.pa, ''); assert.strictEqual(r.dp, '');
});
test('date invalide ignorée', () => { const x = call(A, 'modifierElement', BASE, { ...el, da: '04/03/2025', sv: null }); assert.strictEqual(x.da, ''); });
echoue('modifier un élément inexistant', () => call(A, 'modifierElement', BASE, { ...el, id: 'xinexistant' }), 'introuvable');

console.log('\n3. Photos et sons');
let p1, p2;
test('envoyerPhoto : fichier dans le dossier + miniature dans l\'onglet masqué', () => {
  p1 = call(A, 'envoyerPhoto', BASE, jpg(1), mini(1)); p2 = call(A, 'envoyerPhoto', BASE, jpg(2), mini(2));
  const f = m.files.get(p1.id); assert.strictEqual(f.parent, m.files.get(BASE).parent); assert.strictEqual(f.mime, 'image/jpeg');
});
test('rattacher 2 photos à l\'élément', () => { const x = call(A, 'modifierElement', BASE, { ...el, ph: [p1.id, p2.id], sv: null }); assert.strictEqual(x.ph.length, 2); });
test('lireMiniatures : en un seul appel', () => { const r = call(A, 'lireMiniatures', BASE, [p1.id, p2.id]); assert.strictEqual(r[p1.id], mini(1)); assert.strictEqual(Object.keys(r).length, 2); });
test('lirePhoto : contenu identique', () => { const r = call(A, 'lirePhoto', BASE, p1.id); assert.strictEqual(r.dataUrl, jpg(1)); });
echoue('lirePhoto : fichier non rattaché à un élément', () => call(A, 'lirePhoto', BASE, BASE), 'introuvable');
echoue('photo : type non image refusé', () => call(A, 'envoyerPhoto', BASE, 'data:text/html;base64,PGI+', mini(1)), 'Format');
echoue('photo : miniature trop grosse refusée', () => call(A, 'envoyerPhoto', BASE, jpg(3), 'data:image/jpeg;base64,' + 'A'.repeat(50000)), 'Miniature');
echoue('photo : data-URL malformée', () => call(A, 'envoyerPhoto', BASE, 'data:image/jpeg;base64,@@@', mini(1)), 'Format');
echoue('élément : photo hors dossier de la base refusée', () => call(A, 'modifierElement', BASE, { ...el, ph: [p1.id, m.files.get(BASE).parent === m.files.get(BASE).id ? 'x' : BASE], sv: null }), 'invalide');
let s1;
test('son : envoi, rattachement et lecture', () => {
  s1 = call(A, 'envoyerSon', BASE, 'data:audio/mp4;base64,' + Buffer.from('AUDIO').toString('base64'));
  call(A, 'modifierElement', BASE, { ...el, ph: [p1.id, p2.id], au: s1.id, sv: null });
  assert.strictEqual(call(A, 'lireSon', BASE, s1.id).dataUrl, 'data:audio/mp4;base64,' + Buffer.from('AUDIO').toString('base64'));
  assert.strictEqual(m.files.get(s1.id).name.endsWith('.m4a'), true);
});
test('retirer une photo : fichier à la corbeille + miniature effacée', () => {
  call(A, 'modifierElement', BASE, { ...el, ph: [p1.id], au: s1.id, sv: null });
  assert(m.files.get(p2.id).trashed); assert(!m.files.get(p1.id).trashed);
  assert.strictEqual(Object.keys(call(A, 'lireMiniatures', BASE, [p1.id, p2.id])).length, 1);
});
test('nettoyerMedias : orphelin récent conservé, ancien mis à la corbeille', () => {
  const o = call(A, 'envoyerPhoto', BASE, jpg(9), mini(9));
  assert.strictEqual(call(A, 'nettoyerMedias', BASE).corbeille, 0);
  m.files.get(o.id).created = Date.now() - 7200000;
  assert.strictEqual(call(A, 'nettoyerMedias', BASE).corbeille, 1); assert(m.files.get(o.id).trashed); assert(!m.files.get(p1.id).trashed);
});

console.log('\n4. Cache');
test('2ᵉ chargement servi par le cache (aucune lecture de Sheet)', () => {
  call(A, 'chargerBase', BASE);
  const avant = m.stats.openById; const r = call(A, 'chargerBase', BASE); assert.strictEqual(m.stats.openById, avant); assert(r.items.length === 1);
});
test('une écriture invalide le cache', () => { call(A, 'modifierElement', BASE, { ...el, titre: 'Perceuse v2', ph: [p1.id], au: s1.id, sv: null }); assert.strictEqual(call(A, 'chargerBase', BASE).items[0].titre, 'Perceuse v2'); });
test('un gros jeu de données (600 éléments) tient dans le cache par morceaux', () => {
  for (let i = 0; i < 600; i++) call(A, 'ajouterElement', BASE, { titre: 'Élément numéro ' + i + ' avec accents éàè', desc: 'd'.repeat(200), t: T1.id, e: E1.id, tags: 'a b c' });
  call(A, 'chargerBase', BASE); const avant = m.stats.openById; const r = call(A, 'chargerBase', BASE);
  assert.strictEqual(m.stats.openById, avant, 'pas servi par le cache'); assert.strictEqual(r.items.length, 601);
});

console.log('\n5. Catégories et emplacements');
let n1;
test('creerNoeud', () => { n1 = call(A, 'creerNoeud', BASE, 'T', 'Voiture', null); assert.strictEqual(n1.p, null); const f = call(A, 'creerNoeud', BASE, 'T', 'Pneus', n1.id); assert.strictEqual(f.p, n1.id); });
echoue('doublon refusé (insensible à la casse)', () => call(A, 'creerNoeud', BASE, 'T', 'voiture', null), 'existe déjà');
echoue('parent inconnu', () => call(A, 'creerNoeud', BASE, 'T', 'X', 'bidon'), 'parent');
echoue('nom vide', () => call(A, 'creerNoeud', BASE, 'E', '  ', null), 'vide');
echoue('type d\'arbre inconnu', () => call(A, 'creerNoeud', BASE, 'Z', 'X', null), 'inconnu');
test('renommerNoeud', () => { const r = call(A, 'renommerNoeud', BASE, 'T', n1.id, 'Auto'); assert.strictEqual(r.nom, 'Auto'); assert(call(A, 'chargerBase', BASE).types.some(n => n.nom === 'Auto')); });
test('supprimerNoeud : descendants supprimés, éléments déclassés (pas supprimés), 2ᵉ promue', () => {
  const g = call(A, 'ajouterElement', BASE, { titre: 'Cric', t: T1.id, t2: n1.id, e: E1.id });
  const h = call(A, 'ajouterElement', BASE, { titre: 'Cric 2', t: n1.id, t2: T1.id, e: E1.id });
  const total = call(A, 'chargerBase', BASE).items.length;
  const r = call(A, 'supprimerNoeud', BASE, 'T', n1.id);
  assert.strictEqual(r.supprimes, 2); assert.strictEqual(r.declasses, 2);
  const d = call(A, 'chargerBase', BASE); assert.strictEqual(d.items.length, total);
  const g2 = d.items.find(i => i.id === g.id), h2 = d.items.find(i => i.id === h.id);
  assert.strictEqual(g2.t, T1.id); assert.strictEqual(g2.t2, ''); assert.strictEqual(h2.t, T1.id); assert.strictEqual(h2.t2, '');
  assert.strictEqual(d.types.length, 12);
});
test('supprimerElement définitif : ligne, photos et son supprimés', () => {
  const r = call(A, 'supprimerElement', BASE, el.id); assert.strictEqual(r.medias, 2);
  assert(m.files.get(p1.id).trashed); assert(m.files.get(s1.id).trashed);
  assert(!call(A, 'chargerBase', BASE).items.some(i => i.id === el.id));
});

console.log('\n6. Partage et rôles (alice propriétaire, bob invité, carol étrangère)');
const lienBase = BASE;
test('carol ne voit pas la base d\'alice', () => { call(C, 'demarrer', ''); });
echoue('carol : chargerBase refusé (base inconnue)', () => call(C, 'chargerBase', BASE), 'inconnue');
echoue('carol : rejoindre par le lien sans partage → accès non autorisé', () => call(C, 'rejoindreBase', 'https://x/exec?base=' + BASE), 'non autorisé');
test('carol : démarrer avec le lien non partagé → message, mais sa base perso est créée', () => { const d = call(C, 'demarrer', BASE); assert(d.message.includes('non autorisé')); assert.strictEqual(d.bases.length, 1); assert.notStrictEqual(d.bases[0].id, BASE); });
test('bob démarre avec le lien avant partage : message + base perso', () => { const d = call(B, 'demarrer', lienBase); assert(d.message.includes('non autorisé')); assert.strictEqual(d.bases.length, 1); });
echoue('bob ne peut pas partager', () => call(B, 'partagerBase', BASE, C, 'lecture'), 'inconnue');
echoue('adresse invalide', () => call(A, 'partagerBase', BASE, 'pas-un-mail', 'lecture'), 'invalide');
echoue('droit inconnu', () => call(A, 'partagerBase', BASE, B, 'admin'), 'Droit');
test('alice partage en lecture', () => { call(A, 'partagerBase', BASE, B, 'lecture'); });
test('bob rejoint avec le lien d\'invitation : rôle lecture, partage visible côté alice', () => {
  const l = call(A, 'lienInvitation', BASE); assert(l.endsWith('?base=' + BASE));
  const d = call(B, 'demarrer', BASE); assert(d.message.includes('ajoutée')); assert.strictEqual(d.baseActive, BASE);
  assert.strictEqual(d.bases.find(b => b.id === BASE).role, 'lecture'); assert(call(A, 'demarrer', '').bases.find(b => b.id === BASE).partage);
});
test('bob lit la base (lecture) et les miniatures', () => { const r = call(B, 'chargerBase', BASE); assert.strictEqual(r.base.role, 'lecture'); assert(r.items.length > 0); });
test('bob ne reçoit aucune valeur sensible dans les données', () => assert(!JSON.stringify(call(B, 'chargerBase', BASE)).includes('NEW')));
echoue('bob (lecture) : ajout refusé', () => call(B, 'ajouterElement', BASE, { titre: 'x', t: T1.id, e: E1.id }), 'lecture seule');
echoue('bob (lecture) : suppression refusée', () => call(B, 'supprimerElement', BASE, call(B, 'chargerBase', BASE).items[0].id), 'lecture seule');
echoue('bob (lecture) : création de catégorie refusée', () => call(B, 'creerNoeud', BASE, 'T', 'X', null), 'lecture seule');
echoue('bob (lecture) : envoi de photo refusé', () => call(B, 'envoyerPhoto', BASE, jpg(5), mini(5)), 'lecture seule');
echoue('bob ne peut pas lister les membres', () => call(B, 'listerMembres', BASE), 'propriétaire');
test('alice passe bob en modification : effet immédiat (cache invalidé, rôle relu en direct)', () => {
  call(A, 'partagerBase', BASE, B, 'modification');
  assert.strictEqual(call(B, 'chargerBase', BASE).base.role, 'modification');
  const x = call(B, 'ajouterElement', BASE, { titre: 'Ajout de Bob', t: T1.id, e: E1.id }); assert.strictEqual(x.par, B);
  assert.strictEqual(call(A, 'chargerBase', BASE).items.find(i => i.titre === 'Ajout de Bob').par, B);
});
test('bob (modification) envoie une photo dans le dossier d\'alice', () => { const r = call(B, 'envoyerPhoto', BASE, jpg(7), mini(7)); assert.strictEqual(m.files.get(r.id).parent, m.files.get(BASE).parent); });
echoue('bob (modification) ne peut toujours pas partager', () => call(B, 'partagerBase', BASE, C, 'lecture'), 'propriétaire');
test('listerMembres', () => { const l = call(A, 'listerMembres', BASE); assert.strictEqual(JSON.stringify(l), JSON.stringify([{ email: B, role: 'modification' }])); });
test('alice retire bob : il perd l\'accès tout de suite', () => { call(A, 'retirerMembre', BASE, B); assert.strictEqual(call(B, 'demarrer', '').bases.find(b => b.id === BASE).role, null); });
echoue('bob retiré : lecture refusée', () => call(B, 'chargerBase', BASE), 'non autorisé');
test('bob oublie la base retirée', () => { call(B, 'oublierBase', BASE); assert.strictEqual(call(B, 'demarrer', '').bases.length, 1); });
echoue('un document quelconque n\'est pas une base', () => { const ss = (call(C, 'creerBase', 'Autre'), null); const autre = m.sheets.get([...m.files.values()].find(f => f.owner === C && f.name.includes('Autre') && f.mime === 'sheet').id); autre.getSheetByName('Config').data = []; m.files.get(autre.id).viewers.add(A); call(A, 'rejoindreBase', autre.id); }, 'n’est pas une base');

console.log('\n7. Robustesse');
test('liste de bases perdue : retrouvée dans le Drive, sans doublon', () => {
  m.props[A] = {}; const avant = m.files.size; const d = call(A, 'demarrer', '');
  assert.strictEqual(d.bases.length, 1); assert.strictEqual(d.bases[0].id, BASE); assert.strictEqual(m.files.size, avant);
});
test('préférences : valeurs inconnues ignorées', () => { const p = call(A, 'sauverPrefs', { theme: 'dark', charte: 'hack', baseActive: 'bidon' }); assert.strictEqual(JSON.stringify(p), JSON.stringify({ theme: 'dark' })); });
test('créer une 2ᵉ base et basculer', () => { const b = call(A, 'creerBase', 'Famille'); assert.strictEqual(b.role, 'propriétaire'); const d = call(A, 'chargerBase', b.id); assert.strictEqual(d.items.length, 0); assert.strictEqual(call(A, 'sauverPrefs', { baseActive: b.id }).baseActive, b.id); });
test('journal : actions enregistrées', () => { const j = m.sheets.get(BASE).getSheetByName('Journal'); assert(j.getLastRow() > 20); assert.strictEqual(j.data[1][1], A); });


console.log('\n10. E-mail de partage personnalisé (service Drive avancé)');
const envoyes = [];
test('avec le service Drive avancé : lien + explications dans les deux e-mails', () => {
  m.ctx.Drive = { Permissions: { create(res, id, opts) { envoyes.push({ res, id, opts }); const f = m.files.get(id); if (res.role === 'writer') f.editors.add(res.emailAddress); else f.viewers.add(res.emailAddress); } } };
  const r = call(A, 'partagerBase', BASE, C, 'lecture');
  assert.strictEqual(r.mailPerso, true); assert.strictEqual(envoyes.length, 2);
  envoyes.forEach(e => { assert(e.opts.emailMessage.includes('?base=' + BASE)); assert(e.opts.emailMessage.includes('privée')); assert(e.opts.emailMessage.includes('lecture seule')); assert.strictEqual(e.res.role, 'reader'); });
  assert.strictEqual(m.files.get(BASE).getAccess(C), 'VIEW');
});
test('si le service avancé échoue : repli sur le partage standard', () => {
  m.ctx.Drive = { Permissions: { create() { throw new Error('API désactivée'); } } };
  const r = call(A, 'partagerBase', BASE, C, 'modification');
  assert.strictEqual(r.mailPerso, false); assert.strictEqual(m.files.get(BASE).getAccess(C), 'EDIT');
  delete m.ctx.Drive;
});

console.log('\n11. Icônes et photos des catégories / emplacements');
let ND, PH1, PH2;
test('créer des emplacements imbriqués (Garage › Armoire › Près du frigo)', () => {
  const d = call(A, 'chargerBase', BASE);
  const garage = d.emps.find(n => n.nom === 'Garage');
  const arm = call(A, 'creerNoeud', BASE, 'E', 'Armoire', garage.id);
  ND = call(A, 'creerNoeud', BASE, 'E', 'Près du frigo', arm.id);
  assert.strictEqual(ND.p, arm.id); assert.strictEqual(ND.ic, ''); assert.strictEqual(ND.ph, '');
});
test('graines : catégories avec icônes', () => {
  const d = call(A, 'chargerBase', BASE);
  assert.strictEqual(d.types.find(n => n.nom === 'Factures').ic, '🧾');
});
test('définir icône et photo', () => {
  PH1 = call(A, 'envoyerPhoto', BASE, 'data:image/jpeg;base64,' + Buffer.from('un').toString('base64'), 'data:image/jpeg;base64,AAAA').id;
  const r = call(A, 'definirNoeud', BASE, 'E', ND.id, { icone: '🧊', photo: PH1 });
  assert.strictEqual(r.ic, '🧊'); assert.strictEqual(r.ph, PH1);
  const d = call(A, 'chargerBase', BASE);
  const n = d.emps.find(x => x.id === ND.id); assert.strictEqual(n.ph, PH1); assert.strictEqual(n.ic, '🧊');
});
test('la photo d\'un emplacement est lisible par un membre en lecture', () => {
  call(A, 'partagerBase', BASE, B, 'lecture'); call(B, 'rejoindreBase', BASE);
  const r = call(B, 'lirePhoto', BASE, PH1); assert(r.dataUrl.startsWith('data:image'));
});
echoue('photo quelconque refusée (le Sheet lui-même)', () => call(A, 'definirNoeud', BASE, 'E', ND.id, { photo: BASE }), 'invalide');
echoue('icône dangereuse refusée', () => call(A, 'definirNoeud', BASE, 'E', ND.id, { icone: '<b>' }), 'Icône');
echoue('lecture seule : modification refusée', () => call(B, 'definirNoeud', BASE, 'E', ND.id, { icone: '🔥' }), 'lecture');
test('remplacer la photo : l\'ancienne part à la corbeille', () => {
  PH2 = call(A, 'envoyerPhoto', BASE, 'data:image/jpeg;base64,' + Buffer.from('deux').toString('base64'), 'data:image/jpeg;base64,BBBB').id;
  call(A, 'definirNoeud', BASE, 'E', ND.id, { photo: PH2 });
  assert.strictEqual(m.files.get(PH1).trashed, true);
});
test('nettoyerMedias ne touche pas la photo d\'un emplacement', () => {
  call(A, 'nettoyerMedias', BASE); assert.notStrictEqual(m.files.get(PH2).trashed, true);
});
test('icônes en lot', () => {
  const d = call(A, 'chargerBase', BASE); const ids = d.types.slice(0, 2).map(n => n.id);
  const r = call(A, 'definirIcones', BASE, 'T', { [ids[0]]: '🎯', [ids[1]]: '🎲', inconnu: '🔥' });
  assert.strictEqual(r.modifies, 2);
});
test('supprimer l\'emplacement parent supprime aussi la photo des descendants', () => {
  const d = call(A, 'chargerBase', BASE); const arm = d.emps.find(n => n.id === ND.p);
  call(A, 'supprimerNoeud', BASE, 'E', arm.id);
  assert.strictEqual(m.files.get(PH2).trashed, true);
});
console.log(`\n${ok} réussis, ${ko} échoués`);
process.exit(ko ? 1 : 0);
