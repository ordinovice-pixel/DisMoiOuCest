// Simulateur minimal des services Google Apps Script, pour tester le backend hors ligne.
const vm = require('vm');
const fs = require('fs');
const crypto = require('crypto');

function creerMonde() {
  const monde = { user: 'alice@gmail.com', files: new Map(), caches: { script: new Map(), user: {} }, props: {}, stats: { openById: 0, getValues: 0 }, now: Date.now() };
  let seq = 0;
  const newId = () => 'ID' + String(++seq).padStart(3, '0') + crypto.randomBytes(12).toString('hex');

  // ---------- Sheets ----------
  class Range {
    constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
    getValues() {
      monde.stats.getValues++;
      const out = [];
      for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) { const v = (this.sh.data[this.r - 1 + i] || [])[this.c - 1 + j]; row.push(v === undefined ? '' : v); } out.push(row); }
      return out;
    }
    setValues(vals) { vals.forEach((row, i) => row.forEach((v, j) => this.sh._set(this.r + i, this.c + j, v))); return this; }
    setValue(v) { this.sh._set(this.r, this.c, v); return this; }
    clearContent() { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) if (this.sh.data[this.r - 1 + i]) this.sh.data[this.r - 1 + i][this.c - 1 + j] = ''; return this; }
    setNumberFormat() { return this; } setFontWeight() { return this; }
  }
  class Sheet {
    constructor(name) { this.name = name; this.data = []; this.hidden = false; }
    _set(r, c, v) { while (this.data.length < r) this.data.push([]); const row = this.data[r - 1]; while (row.length < c) row.push(''); row[c - 1] = v; }
    getRange(r, c, nr, nc) { return new Range(this, r, c, nr || 1, nc || 1); }
    getLastRow() { let l = 0; this.data.forEach((row, i) => { if (row.some(v => v !== '' && v !== undefined)) l = i + 1; }); return l; }
    getMaxRows() { return 1000; }
    appendRow(arr) { const r = this.getLastRow() + 1; arr.forEach((v, j) => this._set(r, j + 1, v)); }
    deleteRow(i) { this.data.splice(i - 1, 1); }
    setFrozenRows() {} hideSheet() { this.hidden = true; } setName(n) { this.name = n; } getName() { return this.name; }
  }
  class Spreadsheet {
    constructor(id, name) { this.id = id; this.name = name; this.sheets = [new Sheet('Feuille 1')]; }
    getId() { return this.id; } getName() { return this.name; }
    getSheets() { return this.sheets; }
    getSheetByName(n) { return this.sheets.find(s => s.name === n) || null; }
    insertSheet(n) { const s = new Sheet(n); this.sheets.push(s); return s; }
  }

  // ---------- Drive ----------
  // Droits directs, puis hérités du dossier parent (comme dans Google Drive)
  const permissions = (f, email) => {
    const d = f.owner === email ? 'OWNER' : f.editors.has(email) ? 'EDIT' : f.viewers.has(email) ? 'VIEW' : 'NONE';
    if (d !== 'NONE' || !f.parent || !monde.files.get(f.parent)) return d;
    const h = permissions(monde.files.get(f.parent), email);
    return h === 'OWNER' ? 'EDIT' : h;
  };
  class DFile {
    constructor(o) { Object.assign(this, { editors: new Set(), viewers: new Set(), trashed: false, parent: null, bytes: [], created: monde.now, ...o }); }
    getId() { return this.id; } getName() { return this.name; } setName(n) { this.name = n; return this; }
    getOwner() { return { getEmail: () => this.owner }; }
    getAccess(email) { return permissions(this, email); }
    getEditors() { return [...this.editors].map(e => ({ getEmail: () => e })); }
    getViewers() { return [...this.viewers].map(e => ({ getEmail: () => e })); }
    addEditor(e) { this.viewers.delete(e); this.editors.add(e); return this; }
    addViewer(e) { this.editors.delete(e); this.viewers.add(e); return this; }
    removeEditor(e) { this.editors.delete(e); return this; }
    removeViewer(e) { this.viewers.delete(e); return this; }
    isTrashed() { return this.trashed; }
    setTrashed(t) { this.trashed = t; return this; }
    getBlob() { return { getBytes: () => this.bytes, getContentType: () => this.mime, getName: () => this.name }; }
    getParents() { const p = this.parent ? [monde.files.get(this.parent)] : []; let i = 0; return { hasNext: () => i < p.length, next: () => p[i++] }; }
    getDateCreated() { return new Date(this.created); }
    moveTo(folder) { this.parent = folder.id; return this; }
    getFiles() { const l = [...monde.files.values()].filter(f => f.parent === this.id && !f.trashed); let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; }
    createFile(blob) { const f = new DFile({ id: newId(), name: blob.getName(), mime: blob.getContentType(), owner: monde.user, parent: this.id, bytes: blob.getBytes() }); monde.files.set(f.id, f); return f; }
  }
  const acces = id => { const f = monde.files.get(id); if (!f || permissions(f, monde.user) === 'NONE') throw new Error('Exception: Request failed for drive.google.com returned code 404'); return f; };
  const DriveApp = {
    Permission: { OWNER: 'OWNER', EDIT: 'EDIT', VIEW: 'VIEW', COMMENT: 'COMMENT', NONE: 'NONE', ORGANIZER: 'ORGANIZER', FILE_ORGANIZER: 'FILE_ORGANIZER' },
    createFolder(name) { const f = new DFile({ id: newId(), name, mime: 'folder', owner: monde.user }); monde.files.set(f.id, f); return f; },
    getFolderById: acces, getFileById: acces,
    searchFiles() { const l = [...monde.files.values()].filter(f => f.owner === monde.user && f.mime === 'sheet' && !f.trashed); let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; }
  };
  const SpreadsheetApp = {
    create(name) { const id = newId(); const ss = new Spreadsheet(id, name); monde.sheets = monde.sheets || new Map(); monde.sheets.set(id, ss); monde.files.set(id, new DFile({ id, name, mime: 'sheet', owner: monde.user })); return ss; },
    openById(id) { acces(id); monde.stats.openById++; return monde.sheets.get(id); }
  };

  // ---------- Utilitaires, caches, propriétés ----------
  const pad = n => String(n).padStart(2, '0');
  const Utilities = {
    getUuid: () => crypto.randomUUID(),
    base64Decode: s => [...Buffer.from(s, 'base64')], base64Encode: b => Buffer.from(b).toString('base64'),
    newBlob: (bytes, mime, name) => ({ getBytes: () => bytes, getContentType: () => mime, getName: () => name, setName(n) { name = n; } }),
    formatDate: (d, tz, fmt) => { const s = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; return fmt === 'yyyy-MM-dd' ? s : `${s}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
  };
  const mkCache = (m) => ({
    get: k => (m.has(k) ? m.get(k) : null),
    put: (k, v) => { if (String(v).length > 100000) throw new Error('Argument too large: value'); m.set(k, String(v)); },
    putAll: (o) => Object.keys(o).forEach(k => { if (String(o[k]).length > 100000) throw new Error('Argument too large: value'); m.set(k, String(o[k])); }),
    getAll: ks => { const o = {}; ks.forEach(k => { if (m.has(k)) o[k] = m.get(k); }); return o; }
  });
  const CacheService = { getScriptCache: () => mkCache(monde.caches.script), getUserCache: () => mkCache(monde.caches.user[monde.user] = monde.caches.user[monde.user] || new Map()) };
  const PropertiesService = { getUserProperties: () => { const p = monde.props[monde.user] = monde.props[monde.user] || {}; return { getProperty: k => (k in p ? p[k] : null), setProperty: (k, v) => { p[k] = String(v); } }; } };
  const LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
  const Session = { getActiveUser: () => ({ getEmail: () => monde.user }), getScriptTimeZone: () => 'Europe/Paris' };
  const ScriptApp = { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/TEST/exec' }) };
  const out = c => ({ getContent: () => c, setTitle() { return this; }, addMetaTag() { return this; }, setXFrameOptionsMode() { return this; } });
  const HtmlService = { XFrameOptionsMode: { ALLOWALL: 1 }, createHtmlOutputFromFile: n => out(fs.readFileSync(__dirname + '/../src/' + n + '.html', 'utf8')), createHtmlOutput: c => out(c), createTemplateFromFile: () => ({ evaluate() { return { setTitle() { return this; }, addMetaTag() { return this; }, setXFrameOptionsMode() { return this; } }; } }) };

  const ctx = vm.createContext({ DriveApp, SpreadsheetApp, Utilities, CacheService, PropertiesService, LockService, Session, ScriptApp, HtmlService, console, Date, Math, JSON, Object, Array, String, Number, Set, RegExp, Error });
  const code = ['Code.gs', 'Base.gs', 'Partage.gs', 'Drive.gs'].map(f => fs.readFileSync(__dirname + '/../src/' + f, 'utf8')).join('\n');
  vm.runInContext(code, ctx, { filename: 'backend.gs' });
  monde.ctx = ctx;
  // appelle une fonction du backend en tant que l'utilisateur donné
  monde.appel = (user, fn, ...args) => { monde.user = user; ctx.__a = args; return vm.runInContext(`${fn}(...__a)`, ctx); };
  monde.stringify = (v) => JSON.stringify(v);
  return monde;
}
module.exports = { creerMonde };
