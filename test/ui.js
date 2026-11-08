// Test d'interface : Playwright + faux google.script.run relié au simulateur Google (test/mock.js)
const { chromium } = require('playwright');
const fs = require('fs');
const { creerMonde } = require('./mock');
const OUT = process.argv[2] || require('path').join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const m = creerMonde();
let user = 'alice@gmail.com';
const latence = 80;
let html = fs.readFileSync(__dirname + '/../src/index.html', 'utf8').replace('"__INVITE__"', '""');
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
(async () => {
  const b = await chromium.launch();
  const errs = [];
  async function ouvre(email, w = 390, h = 800, invite = '') {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(email + ' pageerror: ' + e.message));
    p.on('console', c => { if (c.type() === 'error') errs.push(email + ' console: ' + c.text()); });
    await p.exposeFunction('__srv', async (fn, args) => {
      await new Promise(r => setTimeout(r, latence));
      try { return { ok: JSON.stringify(m.appel(email, fn, ...args)) }; } catch (e) { return { err: String(e.message) }; }
    });
    await p.addInitScript(() => {
      window.google = { script: { run: new Proxy({}, { get: (_, fn) => {
        if (fn === 'withSuccessHandler' || fn === 'withFailureHandler') return undefined;
        return undefined; } }) } };
      const mk = (ok, ko) => new Proxy({}, { get: (_, p) => {
        if (p === 'withSuccessHandler') return f => mk(f, ko);
        if (p === 'withFailureHandler') return f => mk(ok, f);
        return (...a) => window.__srv(p, a).then(r => r.err ? ko && ko(new Error(r.err)) : ok && ok(r.ok === undefined ? undefined : JSON.parse(r.ok)));
      } });
      window.google.script.run = mk(null, null);
    });
    await p.route('**/*', r => r.request().url().startsWith('http://app/') ? r.fulfill({ contentType: 'text/html', body: html.replace('const INVITE = ""', 'const INVITE = ' + JSON.stringify(invite)) }) : r.continue());
    await p.goto('http://app/');
    return p;
  }
  const ok = (c, msg) => { console.log(c ? '  ✔' : '  ✘', msg); if (!c) errs.push('ECHEC: ' + msg); };
  const txt = p => p.innerText('body');

  console.log('Alice – première ouverture');
  const a = await ouvre('alice@gmail.com');
  await a.waitForSelector('#res .card h2', { timeout: 8000 });
  ok((await txt(a)).includes('Ma base perso'), 'base perso affichée');
  ok((await txt(a)).includes('Aucun élément'), 'accueil vide');
  await a.screenshot({ path: OUT + '/01-accueil-vide.png' });

  console.log('Ajout d’un élément');
  await a.click('nav button:nth-child(5)');
  await a.fill('#f_titre', 'Perceuse Bosch');
  await a.fill('#f_desc', 'Perceuse sans fil 18V');
  await a.click('.pickbtn >> nth=0');            // catégorie
  await a.waitForSelector('.pr span');
  await a.click('.pr span >> nth=0');
  await a.click('.pickbtn >> nth=2');            // emplacement
  await a.waitForSelector('.pr span');
  await a.click('.pr span >> nth=0');
  await a.fill('#f_tags', 'outil bricolage');
  // photo
  const img = require('path').join(OUT, 'p.png'); fs.writeFileSync(img, Buffer.from(png.split(',')[1], 'base64'));
  await a.setInputFiles('input[type=file][multiple]', img);
  await a.waitForSelector('#phBox .slot img', { timeout: 5000 });
  await a.screenshot({ path: OUT + '/02-formulaire.png' });
  await a.click('#saveBtn');
  await a.waitForFunction(() => !document.querySelector('#saveBtn') && document.body.innerText.includes('Perceuse Bosch'), null, { timeout: 8000 }).catch(() => { });
  ok((await txt(a)).includes('Perceuse Bosch'), 'élément enregistré et visible');
  await a.waitForSelector('.item .thumb img', { timeout: 5000 }).then(() => ok(true, 'miniature affichée'), () => ok(false, 'miniature affichée'));

  console.log('Création à la volée d’une catégorie');
  await a.click('nav button:nth-child(5)');
  await a.fill('#f_titre', 'Facture EDF');
  await a.click('.pickbtn >> nth=0');
  await a.click('text=＋ Ajouter ici >> nth=0');
  await a.fill('#pn', 'Factures test');
  await a.click('text=Créer et choisir');
  await a.waitForSelector('#f_titre');
  ok((await txt(a)).includes('Factures test'), 'catégorie créée et choisie');
  await a.click('.pickbtn >> nth=2'); await a.click('.pr span >> nth=1');
  await a.check('#f_sens'); await a.fill('#f_sv', 'code-1234');
  await a.click('#saveBtn'); await a.waitForSelector('#saveBtn', { state: 'detached', timeout: 8000 });

  console.log('Recherche, fiche, valeur sensible');
  await a.fill('#qs', 'facture'); await a.press('#qs', 'Enter');
  console.log((await txt(a)).slice(0,300).replace(/\n/g,' | '));
  ok((await txt(a)).includes('1 résultat'), 'recherche "facture" = 1 résultat');
  await a.fill('#qs', 'PERCEUSE'); await a.press('#qs', 'Enter');
  ok((await txt(a)).includes('Perceuse Bosch'), 'recherche insensible à la casse');
  await a.fill('#qs', 'facture'); await a.press('#qs', 'Enter');
  await a.click('.item >> nth=0');
  ok(!(await txt(a)).includes('code-1234'), 'valeur sensible masquée');
  await a.click('text=Afficher');
  await a.waitForFunction(() => document.body.innerText.includes('code-1234'));
  ok(true, 'valeur sensible affichée à la demande');
  await a.screenshot({ path: OUT + '/03-fiche.png' });
  await a.click('text=✕ >> nth=0');

  console.log('Autres vues');
  for (const [k, n] of [['dash', 2], ['infos', 3], ['manage', 4], ['bases', 6]]) {
    await a.click(`nav button:nth-child(${n})`); await a.waitForTimeout(200);
    await a.screenshot({ path: OUT + `/04-${k}.png` });
  }
  ok((await txt(a)).includes('alice@gmail.com'), 'vue Bases : e-mail affiché');

  console.log('Icônes et rubrique Aide');
  await a.click('nav button:nth-child(1)'); await a.click('text=Effacer');
  ok((await a.innerHTML('#res')).includes('📷'), 'icône photo sur la ligne');
  await a.click('nav button:nth-child(7)'); await a.waitForTimeout(150);
  ok((await txt(a)).includes('Le problème que résout'), 'Aide : à quoi ça sert');
  await a.screenshot({ path: OUT + '/10-aide.png' });
  await a.click('text=Fonctionnalités'); ok((await txt(a)).includes('Retrouver'), 'Aide : fonctionnalités');
  await a.click('text=Tutos >> nth=-1'); ok((await txt(a)).includes('Bientôt disponible'), 'Aide : tutos');
  await a.click('nav button:nth-child(6)');

  console.log('Icônes / photos des emplacements, sous-emplacements');
  await a.click('nav button:nth-child(4)'); await a.waitForSelector('text=Emplacements');
  await a.click('.pr:has-text("Garage") button[title="Ajouter dedans"]');
  ok(await a.isVisible('.fc:has-text("Armoire")'), 'suggestions Armoire / Placard / Tiroir / Étagère');
  await a.click('.fc:has-text("Armoire")'); ok((await a.inputValue('#nm')) === 'Armoire', 'la suggestion remplit le nom');
  await a.click('text=OK'); await a.waitForSelector('.pr:has-text("Armoire")');
  await a.click('.pr:has-text("Armoire") button[title="Ajouter dedans"]');
  ok(!(await a.isVisible('.fc:has-text("Tiroir")')), 'pas de suggestion sous une armoire (nom libre)');
  await a.fill('#nm', 'Près du frigo'); await a.click('text=OK'); await a.waitForSelector('.pr:has-text("Près du frigo")');
  await a.click('.pr:has-text("Près du frigo") button[title="Nom, icône, photo"]');
  await a.click('.fc:has-text("🗄️")');
  await a.setInputFiles('.sheet input[type=file]', require('path').join(OUT, 'p.png'));
  await a.waitForFunction(() => !document.querySelector('.sheet .up'), null, { timeout: 8000 });
  await a.click('#enSave'); await a.waitForSelector('#enSave', { state: 'detached', timeout: 8000 });
  ok((await a.innerText('.pr:has-text("Près du frigo")')).includes('🗄️'), 'icône visible dans la gestion');
  await a.waitForSelector('.pr:has-text("Près du frigo") .thumb img', { timeout: 6000 }).then(() => ok(true, 'miniature de la photo visible'), () => ok(false, 'miniature de la photo visible'));
  await a.click('text=✨ Suggérer des icônes >> nth=0'); await a.waitForTimeout(400);
  await a.screenshot({ path: OUT + '/11-gestion.png' });
  await a.click('nav button:nth-child(5)'); await a.fill('#f_titre', 'Cartons de peinture'); await a.fill('#f_desc', 'Pots de peinture blanche et bleue');
  await a.click('.pickbtn >> nth=0'); await a.click('.sheet .pr span >> nth=0');
  await a.click('.pickbtn >> nth=2'); await a.click('.sheet .pr span:has-text("Près du frigo")');
  ok((await a.innerText('.pickbtn >> nth=2')).includes('Garage'), 'chemin complet affiché');
  await a.click('#saveBtn'); await a.waitForSelector('#saveBtn', { state: 'detached', timeout: 8000 });
  await a.click('nav button:nth-child(1)'); await a.fill('#qs', 'peinture'); await a.press('#qs', 'Enter');
  ok((await txt(a)).includes('Pots de peinture blanche'), 'description visible dans la liste');
  await a.click('.item >> nth=0');
  ok((await txt(a)).includes('Pour t’aider à trouver l’endroit'), 'fiche : photos de l’emplacement');
  await a.click('.slot[data-ph] >> nth=-1'); await a.waitForSelector('.viewer img', { timeout: 6000 }).then(() => ok(true, 'photo de l’emplacement agrandie'), () => ok(false, 'photo de l’emplacement agrandie'));
  await a.screenshot({ path: OUT + '/12-viewer.png' }); await a.click('text=Fermer'); await a.evaluate(() => closeM());
  await a.click('nav button:nth-child(6)');

  console.log('Partage avec Bob');
  await a.click('text=Partager');
  await a.fill('#sm', 'bob@gmail.com'); await a.selectOption('#sr', 'lecture');
  await a.click('.sheet >> text=Partager >> nth=-1');
  await a.waitForSelector('.linkbox', { timeout: 5000 });
  const lien = await a.innerText('.linkbox');
  ok(/base=/.test(lien), 'lien d’invitation affiché');
  const baseId = lien.split('base=')[1].trim();
  await a.screenshot({ path: OUT + '/05-partage.png' });

  console.log('Bob – invitation, lecture seule');
  const bb = await ouvre('bob@gmail.com', 390, 800, baseId);
  await bb.waitForSelector('.item', { timeout: 8000 }).catch(() => { });
  await bb.waitForTimeout(400);
  const tb = await txt(bb);
  ok(tb.includes('lecture seule'), 'Bob voit « lecture seule »');
  ok(tb.includes('Perceuse Bosch') || tb.includes('Facture EDF'), 'Bob voit les éléments d’Alice');
  await bb.click('nav button:nth-child(5)');
  ok((await txt(bb)).includes('lecture seule'), 'ajout refusé en lecture seule');
  await bb.screenshot({ path: OUT + '/06-bob.png' });

  console.log('Rechargement pendant la saisie (retour caméra)');
  await a.evaluate(() => closeM()); await a.click('nav button:nth-child(5)'); await a.fill('#f_titre', 'Brouillon test'); await a.waitForTimeout(900);
  await a.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await a.reload(); await a.waitForSelector('#f_titre', { timeout: 8000 }).catch(() => { });
  ok((await a.inputValue('#f_titre').catch(() => '')) === 'Brouillon test', 'formulaire rouvert avec le brouillon après rechargement');

  console.log('Thèmes et chartes (PC)');
  const pc = await ouvre('alice@gmail.com', 1200, 800);
  await pc.waitForSelector('#res .card h2');
  for (const c of ['azur', 'ocean', 'indigo']) {
    await pc.click(`.sw[data-c=${c}]`);
    await pc.screenshot({ path: OUT + `/07-pc-${c}-clair.png` });
  }
  await pc.click('#themeBtn'); await pc.screenshot({ path: OUT + '/08-pc-indigo-sombre.png' });
  await pc.click('nav button:nth-child(3)'); await pc.click('#mT'); await pc.screenshot({ path: OUT + '/09-pc-tableau.png' });

  console.log(errs.length ? '\nERREURS :\n' + errs.join('\n') : '\nAucune erreur console / page.');
  await b.close();
  process.exit(errs.length ? 1 : 0);
})();
