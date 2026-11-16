// Publie l'outil : vérifie, met à jour version.txt, enregistre (commit) et envoie sur GitHub.
// Le site se met à jour une à deux minutes plus tard.
// Usage : node outils/publier.mjs "Ajoute le quiz du soir (closes #12)"
import { writeFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const message = process.argv.slice(2).join(' ').trim();
if (!message) {
  console.error('Indiquez un message, par exemple : node outils/publier.mjs "Ajoute le quiz du soir (closes #12)"');
  process.exit(1);
}

const lancer = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: racine, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('Échec : ' + cmd + ' ' + args.join(' '));
    process.exit(r.status || 1);
  }
};

lancer(process.execPath, [join(racine, 'outils', 'verifier.mjs')]);
writeFileSync(join(racine, 'version.txt'), new Date().toISOString() + '\n');
lancer('git', ['add', '-A']);
lancer('git', ['commit', '-m', message]);
lancer('git', ['push']);

const ctx = { window: {} };
vm.runInNewContext(readFileSync(join(racine, 'config.js'), 'utf8'), ctx);
const depot = (ctx.window.CONFIG || {}).depot || '';
const m = depot.match(/github\.com\/([^/]+)\/([^/]+)/);
console.log('');
console.log('Publié. Le site se met à jour dans une à deux minutes'
  + (m ? ' : https://' + m[1] + '.github.io/' + m[2] + '/' : '.'));
