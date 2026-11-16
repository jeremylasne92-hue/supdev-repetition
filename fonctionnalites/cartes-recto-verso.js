// Cartes recto verso : faire défiler ses cartes face question et les retourner pour vérifier sa réponse. Ticket #7.
Outil.enregistrer({
  id: 'cartes-recto-verso',
  titre: 'Cartes recto verso',
  icone: '🃏',
  description: 'Vos cartes face question : touchez la carte pour la retourner',
  principe: 'Se tester',
  ticket: 7,
  ordre: 30,
  afficher(zone, O) {
    const { el } = O;

    if (!document.getElementById('style-cartes-recto-verso')) {
      document.head.append(el('style', { id: 'style-cartes-recto-verso' }, `
.f-cartes-recto-verso-carte {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
  width: 100%; min-height: 240px; padding: 20px; margin: 12px 0;
  border: 2px solid var(--trait); border-radius: var(--rayon);
  background: var(--carte); color: var(--texte);
  font: inherit; text-align: center; cursor: pointer;
}
.f-cartes-recto-verso-carte.f-cartes-recto-verso-verso { background: var(--accent-pale); border-color: var(--accent); }
.f-cartes-recto-verso-face { font-size: .8rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--accent); }
.f-cartes-recto-verso-texte { font-size: 1.25rem; font-weight: 600; overflow-wrap: anywhere; }
.f-cartes-recto-verso-geste { font-size: .85rem; color: var(--doux); }
.f-cartes-recto-verso-tourne { animation: f-cartes-recto-verso-tourne .3s ease; }
.f-cartes-recto-verso-nav .bouton { flex: 1; }
.f-cartes-recto-verso-compteur { text-align: center; margin: 12px 0 0; }
@keyframes f-cartes-recto-verso-tourne { from { transform: rotateY(90deg); } to { transform: rotateY(0); } }
`));
    }

    let paquet = [];       // cartes de la matière choisie, dans l'ordre de passage
    let position = 0;      // carte affichée
    let retournee = false; // false : face question ; true : face réponse

    function charger() {
      const matiere = O.matieres.active();
      paquet = matiere ? O.cartes.liste(matiere.id).slice() : [];
      position = 0;
      retournee = false;
    }

    function dessiner() {
      zone.replaceChildren();
      zone.append(O.choixMatiere(() => { charger(); dessiner(); }));
      if (!O.matieres.active()) return; // le sélecteur affiche déjà l'aide vers « Mes cours »
      if (!paquet.length) {
        zone.append(el('p', { class: 'aide' }, 'Cette matière n\'a pas encore de carte. ',
          el('a', { href: '#mes-cours' }, 'Écrivez-en dans « Mes cours »'), '.'));
        return;
      }

      const compteur = el('p', { class: 'aide f-cartes-recto-verso-compteur' });
      const face = el('span', { class: 'f-cartes-recto-verso-face' });
      const texte = el('span', { class: 'f-cartes-recto-verso-texte', 'aria-live': 'polite' });
      const geste = el('span', { class: 'f-cartes-recto-verso-geste' });
      const carte = el('button', {
        type: 'button',
        class: 'f-cartes-recto-verso-carte',
        onclick: () => {
          retournee = !retournee;
          maj();
          // Rejoue la courte animation de retournement.
          carte.classList.remove('f-cartes-recto-verso-tourne');
          void carte.offsetWidth;
          carte.classList.add('f-cartes-recto-verso-tourne');
        },
      }, face, texte, geste);

      // Chaque nouvelle carte arrive face question : la réponse ne se montre jamais d'elle-même.
      function aller(pas) {
        position = (position + pas + paquet.length) % paquet.length;
        retournee = false;
        carte.classList.remove('f-cartes-recto-verso-tourne');
        maj();
      }

      function maj() {
        const c = paquet[position];
        compteur.textContent = 'Carte ' + (position + 1) + ' sur ' + paquet.length;
        face.textContent = retournee ? 'Réponse' : 'Question';
        texte.textContent = retournee ? (c.r || '(pas de réponse écrite)') : c.q;
        geste.textContent = retournee ? 'Touchez pour revoir la question' : 'Cherchez la réponse, puis touchez la carte';
        carte.classList.toggle('f-cartes-recto-verso-verso', retournee);
      }

      zone.append(
        compteur,
        carte,
        el('div', { class: 'rangee f-cartes-recto-verso-nav' },
          el('button', { type: 'button', class: 'bouton secondaire', onclick: () => aller(-1) }, '← Précédente'),
          el('button', { type: 'button', class: 'bouton', onclick: () => aller(1) }, 'Suivante →')),
        el('button', {
          type: 'button',
          class: 'lien',
          onclick: () => {
            paquet = O.melanger(paquet);
            position = 0;
            retournee = false;
            carte.classList.remove('f-cartes-recto-verso-tourne');
            maj();
            O.notifier('Cartes mélangées.');
          },
        }, 'Mélanger les cartes'));
      maj();
    }

    charger();
    dessiner();
  },
});
