// Vérifie l'outil avant publication.
// Bloquant : syntaxe de chaque fichier, registre cohérent, fonctionnalités bien déclarées.
// Non bloquant (ATTENTION) : un essai d'affichage de chaque fonctionnalité dans un faux navigateur.
// Usage : node outils/verifier.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
let erreurs = 0;
let alertes = 0;
const ok = (m) => console.log('ok         ' + m);
const ko = (m) => { console.log('ERREUR     ' + m); erreurs++; };
const attention = (m) => { console.log('ATTENTION  ' + m); alertes++; };

// 1. Syntaxe
const dossier = join(racine, 'fonctionnalites');
const modulesFichiers = readdirSync(dossier).filter((f) => f.endsWith('.js') && f !== 'registre.js');
for (const f of ['config.js', 'noyau.js', 'fonctionnalites/registre.js', ...modulesFichiers.map((m) => 'fonctionnalites/' + m)]) {
  const r = spawnSync(process.execPath, ['--check', join(racine, f)], { encoding: 'utf8' });
  if (r.status === 0) ok('syntaxe ' + f);
  else ko('syntaxe ' + f + '\n' + r.stderr);
}
if (erreurs) fin();

// 2. Registre
const ctxRegistre = { window: {} };
vm.runInNewContext(readFileSync(join(dossier, 'registre.js'), 'utf8'), ctxRegistre);
const registre = ctxRegistre.window.FONCTIONNALITES || [];
if (new Set(registre).size !== registre.length) ko('registre : un identifiant apparaît deux fois');
for (const id of registre) {
  if (!/^[a-z0-9-]+$/.test(id)) ko('registre : identifiant « ' + id + ' » invalide (minuscules, chiffres, tirets)');
  if (!existsSync(join(dossier, id + '.js'))) ko('registre : fichier fonctionnalites/' + id + '.js introuvable');
}
for (const f of modulesFichiers) {
  if (!registre.includes(f.replace(/\.js$/, ''))) attention('fonctionnalites/' + f + " n'est pas dans le registre : elle ne sera pas chargée");
}

// 3. Faux navigateur minimal, pour charger le noyau et chaque fonctionnalité
class FauxNoeud {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.style = { setProperty() {}, removeProperty() {} };
    this.classList = { add() {}, remove() {}, toggle() {}, contains: () => false };
    this.dataset = {};
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.textContent = '';
    this.innerHTML = '';
  }
  append(...n) { this.children.push(...n); }
  appendChild(n) { this.children.push(n); return n; }
  prepend(...n) { this.children.unshift(...n); }
  replaceChildren(...n) { this.children = n; }
  insertBefore(n) { this.children.push(n); return n; }
  remove() {}
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; }
  removeAttribute(k) { delete this.attributes[k]; }
  hasAttribute(k) { return k in this.attributes; }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
  removeEventListener() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  closest() { return null; }
  getBoundingClientRect() { return { top: 0, left: 0, width: 100, height: 100 }; }
  focus() {} blur() {} click() {} select() {} showModal() {} close() {} scrollIntoView() {}
  get firstChild() { return this.children[0] || null; }
}
const stockage = {};
const fenetre = {
  CONFIG: undefined,
  addEventListener() {}, removeEventListener() {}, scrollTo() {}, open() { return null; },
  confirm: () => true, alert() {}, matchMedia: () => ({ matches: false, addEventListener() {} }),
  requestAnimationFrame: (f) => setTimeout(f, 0), cancelAnimationFrame() {},
};
const documentFaux = {
  createElement: (t) => new FauxNoeud(t),
  createTextNode: (t) => { const n = new FauxNoeud('#text'); n.textContent = t; return n; },
  getElementById: () => new FauxNoeud('div'),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
  body: new FauxNoeud('body'),
  head: new FauxNoeud('head'),
  documentElement: new FauxNoeud('html'),
  title: '',
};
const contexte = vm.createContext({
  window: fenetre, document: documentFaux, Node: FauxNoeud, HTMLElement: FauxNoeud,
  location: { pathname: '/verification/', hash: '' },
  localStorage: {
    getItem: (k) => (k in stockage ? stockage[k] : null),
    setItem: (k, v) => { stockage[k] = String(v); },
    removeItem: (k) => { delete stockage[k]; },
  },
  navigator: { clipboard: { writeText: async () => {} }, vibrate() {} },
  console, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, Intl, Promise,
  encodeURIComponent, decodeURIComponent, URL, URLSearchParams,
});
fenetre.window = fenetre;
fenetre.document = documentFaux;
const executer = (fichier) => vm.runInContext(readFileSync(join(racine, fichier), 'utf8'), contexte, { filename: fichier });
executer('config.js');
contexte.CONFIG = fenetre.CONFIG;
executer('noyau.js');
const Outil = fenetre.Outil;
contexte.Outil = Outil;

// Données d'exemple, pour que chaque fonctionnalité ait quelque chose à afficher
const m = Outil.matieres.ajouter('Matière d\'essai');
Outil.matieres.majNotes(m.id, 'Notes d\'essai.');
Outil.cartes.ajouter(m.id, 'Question d\'essai ?', 'Réponse d\'essai');

const declares = [];
const enregistrerOrigine = Outil.enregistrer;
Outil.enregistrer = (mod) => { declares.push(mod); enregistrerOrigine(mod); };
for (const id of registre) {
  const avant = declares.length;
  try {
    executer('fonctionnalites/' + id + '.js');
  } catch (e) {
    ko('chargement de ' + id + ' : ' + e.message);
    continue;
  }
  const mod = declares[avant];
  if (!mod) { ko(id + ' : aucun appel à Outil.enregistrer'); continue; }
  if (mod.id !== id) ko(id + " : l'identifiant déclaré (« " + mod.id + ' ») doit être celui du fichier');
  if (!mod.titre) ko(id + ' : titre manquant');
  if (typeof mod.afficher !== 'function') { ko(id + ' : afficher(zone, Outil) manquant'); continue; }
  try {
    mod.afficher(new FauxNoeud('div'), Outil);
    ok('affichage ' + id);
  } catch (e) {
    attention('affichage ' + id + ' dans le faux navigateur : ' + e.message + ' (à vérifier sur le site)');
  }
}
fin();

function fin() {
  console.log('');
  console.log(erreurs ? erreurs + ' erreur(s) : corrigez avant de publier.' : 'Aucune erreur.' + (alertes ? ' ' + alertes + ' point(s) à vérifier.' : ''));
  process.exit(erreurs ? 1 : 0);
}
