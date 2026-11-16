// Expliquez-le avec vos mots : écrire son explication d'une notion, la garder, puis la faire corriger par son IA sans qu'elle la réécrive. Ticket #4.
Outil.enregistrer({
  id: 'expliquer-avec-ses-mots',
  titre: 'Expliquez-le avec vos mots',
  icone: '🗣️',
  description: 'Expliquez une notion comme à un ami, puis faites-la corriger par votre IA',
  principe: 'Expliquer avec ses mots',
  ticket: 4,
  ordre: 40,
  afficher(zone, O) {
    const { el } = O;
    const memoire = O.memoire('expliquer-avec-ses-mots');
    const MOTS_MIN = 15; // en dessous, l'IA n'aurait rien à corriger : l'étudiant écrit d'abord

    const texteDe = (v) => String(v || '');
    const compterMots = (t) => (texteDe(t).trim().match(/\S+/g) || []).length;

    // Mémoire : { explications: [{ id, matiere, notion, texte, maj }], encours: { <id de matière> : <id d'explication> } }
    // Les explications vides et celles d'une matière supprimée sont écartées à la lecture.
    function lire() {
      const m = memoire.lire({}) || {};
      return {
        explications: (Array.isArray(m.explications) ? m.explications : [])
          .filter((e) => e && O.matieres.trouver(e.matiere) && (texteDe(e.notion).trim() || texteDe(e.texte).trim())),
        encours: m.encours || {},
      };
    }

    function dessiner(allerALaNotion) {
      zone.replaceChildren();
      zone.append(O.choixMatiere(() => dessiner()));
      const matiere = O.matieres.active();
      if (!matiere) return; // le sélecteur affiche déjà l'aide vers « Mes cours »

      const etat = lire();
      const courante = etat.explications.find((e) => e.id === etat.encours[matiere.id] && e.matiere === matiere.id)
        || { id: null, matiere: matiere.id, notion: '', texte: '', maj: 0 };

      const champNotion = el('input', {
        type: 'text', placeholder: 'Ex. : la motivation selon Maslow', value: texteDe(courante.notion), oninput: garder,
      });
      const champTexte = el('textarea', {
        rows: 9, 'aria-label': 'Votre explication',
        placeholder: 'Comme si vous l\'expliquiez à un ami : des phrases simples, un exemple.',
        oninput: garder,
      }, texteDe(courante.texte));
      const suivi = el('p', { class: 'aide' });
      const liste = el('section', { class: 'carte' });

      // Enregistre à chaque frappe : rien n'est perdu si l'étudiant quitte la page.
      function garder() {
        courante.notion = champNotion.value;
        courante.texte = champTexte.value;
        courante.maj = Date.now();
        if (!courante.id) {
          if (!courante.notion.trim() && !courante.texte.trim()) return;
          courante.id = Math.random().toString(36).slice(2, 10);
          etat.explications.push(courante);
          etat.encours[matiere.id] = courante.id;
        }
        memoire.ecrire(etat);
        dessinerSuivi();
        dessinerListe();
      }

      function dessinerSuivi() {
        const n = compterMots(champTexte.value);
        suivi.textContent = courante.id
          ? '✓ Gardée dans votre navigateur (' + n + (n > 1 ? ' mots' : ' mot') + ').'
          : 'Votre explication sera gardée dans votre navigateur dès vos premiers mots.';
      }

      function dessinerListe() {
        const gardees = etat.explications.filter((e) => e.matiere === matiere.id);
        liste.replaceChildren(
          el('h2', {}, 'Mes explications gardées (' + gardees.length + ')'),
          gardees.length
            ? el('ul', { class: 'liste' }, gardees.map((e) => {
              const n = compterMots(e.texte);
              return el('li', {},
                el('strong', {}, texteDe(e.notion).trim() || 'Notion sans nom'), el('br'),
                el('span', { class: 'aide' }, n + (n > 1 ? ' mots' : ' mot') + ', modifiée le '
                  + new Date(e.maj || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
                  + (e.id === courante.id ? ', ouverte ci-dessus' : '')),
                el('div', { style: 'display:flex;gap:20px' },
                  e.id === courante.id ? null : el('button', {
                    type: 'button', class: 'lien',
                    onclick: () => { etat.encours[matiere.id] = e.id; memoire.ecrire(etat); dessiner(true); },
                  }, 'Reprendre'),
                  el('button', {
                    type: 'button', class: 'lien',
                    onclick: () => {
                      if (!window.confirm('Supprimer votre explication « ' + (texteDe(e.notion).trim() || 'Notion sans nom') + ' » ?')) return;
                      etat.explications = etat.explications.filter((x) => x.id !== e.id);
                      memoire.ecrire(etat);
                      dessiner();
                    },
                  }, 'Supprimer')));
            }))
            : el('p', { class: 'aide' }, 'Aucune explication pour cette matière pour l\'instant.'),
          el('button', {
            type: 'button', class: 'bouton secondaire',
            onclick: () => { etat.encours[matiere.id] = null; memoire.ecrire(etat); dessiner(true); },
          }, 'Nouvelle explication'));
      }

      function faireCorriger() {
        const notion = champNotion.value.trim();
        const texte = champTexte.value.trim();
        if (!notion) {
          O.notifier('Indiquez d\'abord la notion que vous expliquez.');
          champNotion.focus();
          return;
        }
        if (compterMots(texte) < MOTS_MIN) {
          O.notifier('Écrivez d\'abord votre explication : au moins ' + MOTS_MIN + ' mots.');
          champTexte.focus();
          return;
        }
        garder();
        O.ouvrirIA(
          'Je révise « ' + matiere.nom + ' ». J\'ai expliqué la notion « ' + notion + ' » avec mes mots, comme à un ami, sans regarder mon cours.\n'
          + 'Corrige mon explication sans la réécrire :\n'
          + '1. Dis-moi ce qui est juste.\n'
          + '2. Signale chaque erreur ou confusion, en citant ma phrase.\n'
          + '3. Dis-moi ce qui manque d\'important.\n'
          + '4. Pose-moi deux questions pour vérifier que j\'ai compris.\n'
          + 'Ne rédige pas l\'explication à ma place et ne me donne pas de version corrigée : je la réécrirai moi-même.\n\n'
          + 'Mon explication :\n' + texte,
          'Faire corriger votre explication');
      }

      zone.append(
        el('section', { class: 'carte' },
          el('h2', {}, '1. Choisissez une notion'),
          el('label', { class: 'champ' }, el('span', {}, 'La notion à expliquer'), champNotion),
          el('h2', {}, '2. Expliquez-la avec vos mots'),
          el('p', { class: 'aide' }, 'Sans regarder vos notes. Si vous bloquez, c\'est ce point qu\'il faut revoir.'),
          champTexte,
          suivi,
          el('h2', {}, '3. Faites-la corriger, pas réécrire'),
          el('p', { class: 'aide' }, 'Votre IA signale les erreurs et les oublis, puis vous pose deux questions. Elle n\'écrit pas l\'explication à votre place.'),
          el('button', { type: 'button', class: 'bouton', onclick: faireCorriger }, 'Faire corriger par mon IA'),
          el('p', { class: 'aide' }, 'Ensuite, revenez ici et améliorez votre explication vous-même : elle reste gardée.')),
        liste);
      dessinerSuivi();
      dessinerListe();
      if (allerALaNotion) champNotion.focus();
    }

    dessiner();
  },
});
