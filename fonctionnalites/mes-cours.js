// Mes cours : les matières, les notes et les cartes de révision sur lesquelles s'appuient les autres fonctionnalités.
Outil.enregistrer({
  id: 'mes-cours',
  titre: 'Mes cours',
  icone: '📚',
  description: 'Vos matières, vos notes et vos cartes de révision',
  ordre: 1,
  barre: true,
  afficher(zone, O) {
    const { el } = O;

    function dessiner() {
      zone.replaceChildren();

      // Ajouter une matière
      const champNom = el('input', { type: 'text', placeholder: 'Ex. : Droit du travail', 'aria-label': 'Nom de la matière' });
      zone.append(el('form', {
        class: 'carte',
        onsubmit: (e) => {
          e.preventDefault();
          if (!champNom.value.trim()) return;
          O.matieres.ajouter(champNom.value);
          O.notifier('Matière ajoutée.');
          dessiner();
        },
      }, el('label', { class: 'champ' }, el('span', {}, 'Nouvelle matière'), champNom),
      el('button', { class: 'bouton', type: 'submit' }, 'Ajouter')));

      const matiere = O.matieres.active();
      if (!matiere) {
        zone.append(el('p', { class: 'aide' }, 'Commencez par ajouter une matière, puis collez ou écrivez vos notes de cours.'));
        return;
      }

      zone.append(O.choixMatiere(dessiner));

      // Notes de cours
      let minuteur;
      const notes = el('textarea', {
        rows: 8,
        placeholder: 'Collez ou écrivez ici vos notes de cours.',
        oninput: (e) => {
          clearTimeout(minuteur);
          minuteur = setTimeout(() => O.matieres.majNotes(matiere.id, e.target.value), 400);
        },
      }, matiere.notes);
      zone.append(el('section', { class: 'carte' },
        el('h2', {}, 'Mes notes'),
        el('p', { class: 'aide' }, 'Elles restent dans votre navigateur : rien n\'est envoyé sur internet.'),
        notes));

      // Écrire une carte soi-même (le meilleur moyen de retenir)
      const q = el('textarea', { rows: 2, placeholder: 'Question' });
      const r = el('textarea', { rows: 2, placeholder: 'Réponse' });
      zone.append(el('form', {
        class: 'carte',
        onsubmit: (e) => {
          e.preventDefault();
          if (O.cartes.ajouter(matiere.id, q.value, r.value)) {
            O.notifier('Carte ajoutée.');
            dessiner();
          }
        },
      }, el('h2', {}, 'Écrire une carte'),
      el('p', { class: 'aide' }, 'Écrire ses propres questions aide à retenir : c\'est déjà réviser.'),
      q, r, el('button', { class: 'bouton', type: 'submit' }, 'Ajouter la carte')));

      // Faire proposer des cartes par son IA, puis les coller ici
      const colle = el('textarea', { rows: 5, placeholder: 'Collez ici la réponse de votre IA (lignes Q: et R:)' });
      zone.append(el('section', { class: 'carte' },
        el('h2', {}, 'Cartes proposées par votre IA'),
        el('p', { class: 'aide' }, '1. Ouvrez votre IA avec la consigne. 2. Vérifiez ses réponses avec votre cours. 3. Collez-les ici.'),
        el('div', { class: 'rangee' },
          el('button', {
            class: 'bouton secondaire',
            onclick: () => O.ouvrirIA(
              'Voici mes notes de cours sur « ' + matiere.nom + ' ». Crée 10 questions de révision, chacune avec une réponse courte, '
              + 'uniquement à partir de ces notes. Respecte exactement ce format, sans rien ajouter :\nQ: la question\nR: la réponse\n\n'
              + 'Mes notes :\n' + (matiere.notes || '(je n\'ai pas encore de notes : pose-moi d\'abord des questions sur ce que j\'ai retenu)'),
              'Créer des cartes avec votre IA'),
          }, 'Ouvrir mon IA')),
        colle,
        el('button', {
          class: 'bouton',
          onclick: () => {
            const n = O.cartes.importer(matiere.id, colle.value);
            O.notifier(n ? n + ' carte(s) ajoutée(s).' : 'Aucune carte trouvée : vérifiez le format Q: / R:.');
            if (n) dessiner();
          },
        }, 'Ajouter ces cartes')));

      // Liste des cartes
      const liste = O.cartes.liste(matiere.id);
      zone.append(el('section', { class: 'carte' },
        el('h2', {}, 'Mes cartes (' + liste.length + ')'),
        liste.length ? el('ul', { class: 'liste' }, liste.map((c) => el('li', {},
          el('strong', {}, c.q), el('br'), el('span', { class: 'aide' }, c.r || '(pas de réponse)'), ' ',
          el('button', {
            class: 'lien',
            onclick: () => { O.cartes.supprimer(c.id); dessiner(); },
          }, 'Supprimer'))))
          : el('p', { class: 'aide' }, 'Aucune carte pour l\'instant.'),
        el('button', {
          class: 'bouton danger',
          onclick: () => {
            if (window.confirm('Supprimer la matière « ' + matiere.nom + ' » et ses cartes ?')) {
              O.matieres.supprimer(matiere.id);
              dessiner();
            }
          },
        }, 'Supprimer cette matière')));
    }

    dessiner();
  },
});
