// Génère les captures d'écran du README (données fictives) : node test/captures.js [dossier_illustrations] [dossier_sortie]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { creerMonde } = require('./mock');
const ILL = process.argv[2] || path.join(__dirname, 'illustrations');
const OUT = process.argv[3] || path.join(__dirname, '..', 'captures');
fs.mkdirSync(OUT, { recursive: true });
const m = creerMonde();
const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8').replace('"__INVITE__"', '""');
const durl = f => 'data:image/png;base64,' + fs.readFileSync(path.join(ILL, f)).toString('base64');
const A = 'alice@gmail.com';
const call = (fn, ...a) => m.appel(A, fn, ...a);

function semer() {
  call('demarrer', '');
  const bid = call('demarrer', '').bases[0].id;
  const d = call('chargerBase', bid);
  const T = n => d.types.find(x => x.nom === n).id, E = n => d.emps.find(x => x.nom === n).id;
  const photo = k => call('envoyerPhoto', bid, durl(k + '.png'), durl(k + '-m.png')).id;
  const arm = call('creerNoeud', bid, 'E', 'Armoire métallique', E('Garage'));
  const haut = call('creerNoeud', bid, 'E', 'Étagère du haut', arm.id);
  call('definirNoeud', bid, 'E', arm.id, { icone: '🗄️', photo: photo('armoire') });
  call('definirNoeud', bid, 'E', E('Garage'), { photo: photo('garage') });
  const add = el => call('ajouterElement', bid, Object.assign({ t2: '', e2: '', ph: [], pret: false, sens: false, tags: '', desc: '' }, el));
  add({ titre: 'Perceuse-visseuse 18 V', desc: 'Dans la caisse bleue, avec 2 batteries et le chargeur.', t: T('Outils bricolage'), e: haut.id, tags: 'perceuse bosch visseuse', ph: [photo('perceuse')], pret: true, pa: 'Marc', dp: '2026-10-28' });
  add({ titre: 'Facture lave-linge (garantie 2 ans)', desc: 'Classeur « Maison », intercalaire Électroménager.', t: T('Factures'), e: E('Cellier'), da: '2025-03-12', df: '2027-03-12', tags: 'garantie électroménager', ph: [photo('facture')] });
  add({ titre: 'Code de l’alarme', t: T('Infos'), e: E('Smartphone 1'), sens: true, sv: '4821', desc: 'Aussi dans le coffre de l’appli de sécurité.' });
  add({ titre: 'Photos de vacances – Corse 2025', desc: 'Dossier « Corse 2025 ». Copie sur le disque réseau.', t: T('Événements & photos'), e: E('Images'), tags: 'vacances été famille' });
  add({ titre: 'Scie sauteuse', desc: 'Lames de rechange dans la boîte jaune.', t: T('Outils bricolage'), e: arm.id, pret: true, pa: 'Sophie', dp: '2026-09-14' });
  add({ titre: 'Contrat assurance habitation', desc: 'Classeur rouge, étagère du dressing. Échéance le 31 décembre.', t: T('Papiers'), e: E('Dressing'), df: '2026-12-31', tags: 'assurance contrat' });
  add({ titre: 'Idée : cabane à outils dans le jardin', desc: 'Voir croquis dans les notes du téléphone.', t: T('Idées'), e: E('Smartphone 1') });
  add({ titre: 'Abonnement fibre – identifiants', t: T('Infos'), e: E('Documents'), tags: 'internet box', desc: 'Contrat et numéro client dans le dossier « Maison ».' });
  return bid;
}

(async () => {
  semer();
  const b = await chromium.launch({ args: ['--lang=fr-FR'] });
  const ouvre = async (w, h, dpr) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
    const p = await ctx.newPage();
    await p.exposeFunction('__srv', async (fn, args) => { try { return { ok: JSON.stringify(m.appel(A, fn, ...args)) }; } catch (e) { return { err: String(e.message) }; } });
    await p.addInitScript(() => {
      const mk = (ok, ko) => new Proxy({}, { get: (_, p) => {
        if (p === 'withSuccessHandler') return f => mk(f, ko);
        if (p === 'withFailureHandler') return f => mk(ok, f);
        return (...a) => window.__srv(p, a).then(r => r.err ? ko && ko(new Error(r.err)) : ok && ok(r.ok === undefined ? undefined : JSON.parse(r.ok)));
      } });
      window.google = { script: { run: mk(null, null) } };
    });
    await p.route('**/*', r => r.request().url().startsWith('http://app/') ? r.fulfill({ contentType: 'text/html', body: html.replace('const INVITE = ""', 'const INVITE = ""') }) : r.continue());
    await p.goto('http://app/'); await p.waitForSelector('#qs', { timeout: 8000 }); await p.waitForTimeout(500);
    return p;
  };
  const snap = async (p, n) => { await p.waitForTimeout(350); await p.screenshot({ path: path.join(OUT, n + '.png') }); console.log('  ' + n); };
  const nav = (p, k) => p.click(`nav button:nth-child(${k})`);
  const theme = (p, c, t) => p.evaluate(([c, t]) => { S.charte = c; S.theme = t; applyTheme(); }, [c, t]);

  const p = await ouvre(390, 844, 2);
  await snap(p, '01-accueil');
  await p.fill('#qs', 'perceuse'); await p.press('#qs', 'Enter'); await snap(p, '02-recherche');
  await p.click('.item >> nth=0'); await p.waitForTimeout(500); await snap(p, '03-fiche');
  await p.click('#modalRoot button:has-text("Modifier")'); await p.waitForSelector('#f_titre'); await snap(p, '04-formulaire');
  await p.evaluate(() => closeM());
  await nav(p, 4); await snap(p, '05-ajouter-modifier');
  await nav(p, 3); await snap(p, '06-mes-infos');
  await nav(p, 2); await snap(p, '07-tableaux-de-bord');
  await nav(p, 5); await snap(p, '08-bases');
  await nav(p, 6); await p.click('text=Tutos >> nth=-1'); await p.waitForTimeout(200); await snap(p, '09-aide-tutos');
  await nav(p, 1);
  await theme(p, 'ocean', 'dark'); await p.fill('#qs', 'facture'); await p.press('#qs', 'Enter'); await snap(p, '10-ocean-sombre');
  await theme(p, 'azur', 'light'); await snap(p, '11-azur-clair');
  await theme(p, 'indigo', 'dark'); await snap(p, '12-indigo-sombre');
  const pc = await ouvre(1200, 760, 1);
  await nav(pc, 3); await pc.click('#mT'); await snap(pc, '13-ordinateur-tableau');
  await b.close();
})();
