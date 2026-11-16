// Quiz du soir : cinq questions tirées de vos cartes ; vous écrivez votre réponse avant de voir la bonne, puis vous obtenez un score. Ticket #1.
Outil.enregistrer({
  id: 'quiz-du-soir',
  titre: 'Quiz du soir',
  icone: '❓',
  description: 'Cinq questions tirées de vos cartes : la réponse vient après votre essai',
  principe: 'Se tester',
  ticket: 1,
  ordre: 20,
  afficher(zone, O) {
    const { el } = O;
    const NOMBRE = 5;

    if (!document.getElementById('style-quiz-du-soir')) {
      document.head.append(el('style', { id: 'style-quiz-du-soir' }, `
.f-quiz-du-soir-titre { margin-top: 0; overflow-wrap: anywhere; }
.f-quiz-du-soir-titre:focus { outline: none; }
.f-quiz-du-soir-etiquette { margin: 12px 0 0; font-size: .85rem; font-weight: 600; color: var(--doux); }
.f-quiz-du-soir-reponse { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.f-quiz-du-soir-score { margin: 0; font-size: 2.4rem; font-weight: 700; text-align: center; color: var(--accent); }
`));
    }

    let etape = 'depart'; // 'depart', 'question', 'correction' ou 'bilan'
    let questions = [];   // cartes tirées pour ce quiz
    let numero = 0;       // rang de la question en cours
    let essai = '';       // réponse écrite par l'étudiant ; vide s'il a dit « Je ne sais pas »
    let resultats = [];   // un élément par question : { carte, juste }

    const pluriel = (n, mot) => n + ' ' + mot + (n > 1 ? 's' : '');

    function commencer() {
      const matiere = O.matieres.active();
      questions = O.melanger(matiere ? O.cartes.liste(matiere.id) : []).slice(0, NOMBRE);
      numero = 0;
      resultats = [];
      etape = questions.length ? 'question' : 'depart';
      dessiner();
    }

    function noter(juste) {
      const carte = questions[numero];
      carte.essais = (carte.essais || 0) + 1;
      if (juste) carte.reussites = (carte.reussites || 0) + 1;
      O.sauver();
      resultats.push({ carte, juste });
      numero++;
      etape = numero < questions.length ? 'question' : 'bilan';
      dessiner();
    }

    // Titre d'une étape : il reçoit le curseur, pour que la lecture reprenne au bon endroit.
    function titre(texte) {
      return el('h2', { class: 'f-quiz-du-soir-titre', tabindex: '-1' }, texte);
    }

    function avancement() {
      return el('p', { class: 'aide' }, 'Question ' + (numero + 1) + ' sur ' + questions.length);
    }

    function dessiner() {
      zone.replaceChildren();
      if (etape === 'question') dessinerQuestion();
      else if (etape === 'correction') dessinerCorrection();
      else if (etape === 'bilan') dessinerBilan();
      else dessinerDepart();
      if (etape !== 'depart') window.scrollTo(0, 0);
    }

    function dessinerDepart() {
      zone.append(O.choixMatiere(dessiner));
      const matiere = O.matieres.active();
      if (!matiere) return; // le sélecteur affiche déjà l'aide vers « Mes cours »
      const n = O.cartes.liste(matiere.id).length;
      if (!n) {
        zone.append(el('p', { class: 'aide' }, 'Cette matière n\'a pas encore de carte. ',
          el('a', { href: '#mes-cours' }, 'Écrivez-en dans « Mes cours »'), '.'));
        return;
      }
      const nombre = Math.min(NOMBRE, n);
      zone.append(el('section', { class: 'carte' },
        el('p', {}, 'Le quiz tire ' + pluriel(nombre, 'question') + ' au hasard dans vos cartes de « ' + matiere.nom + ' ».'),
        el('p', { class: 'aide' }, 'Vous écrivez votre réponse. Ensuite seulement, vous voyez la bonne et vous dites si vous aviez juste.'),
        n < NOMBRE
          ? el('p', { class: 'aide' }, (n === 1 ? 'Cette matière n\'a qu\'une carte' : 'Cette matière n\'a que ' + n + ' cartes')
            + ' : le score sera sur ' + n + '. ', el('a', { href: '#mes-cours' }, 'Ajoutez-en dans « Mes cours »'),
            ' pour un quiz de ' + NOMBRE + ' questions.')
          : null,
        el('button', { type: 'button', class: 'bouton', onclick: commencer }, 'Commencer le quiz')));
    }

    function dessinerQuestion() {
      const carte = questions[numero];
      essai = '';
      // La bonne réponse n'est pas dans la page à cette étape : elle n'arrive qu'après l'essai.
      const voir = el('button', {
        type: 'button', class: 'bouton', disabled: true,
        onclick: () => { essai = champ.value.trim(); etape = 'correction'; dessiner(); },
      }, 'Voir la bonne réponse');
      const champ = el('textarea', {
        rows: 4, 'aria-label': 'Votre réponse', placeholder: 'Écrivez votre réponse, même incomplète.',
        oninput: () => { voir.disabled = !champ.value.trim(); },
      });
      zone.append(
        avancement(),
        el('section', { class: 'carte' },
          titre(carte.q),
          champ,
          el('p', { class: 'aide' }, 'La bonne réponse s\'affiche après votre essai.'),
          el('div', { class: 'rangee' }, voir),
          el('button', {
            type: 'button', class: 'lien',
            onclick: () => { essai = ''; etape = 'correction'; dessiner(); },
          }, 'Je ne sais pas')));
      champ.focus();
    }

    function dessinerCorrection() {
      const carte = questions[numero];
      const aRepondu = essai !== '';
      const tete = titre(carte.q);
      zone.append(
        avancement(),
        el('section', { class: 'carte' },
          tete,
          el('p', { class: 'f-quiz-du-soir-etiquette' }, 'Votre réponse'),
          el('p', { class: 'f-quiz-du-soir-reponse' }, aRepondu ? essai : 'Vous n\'avez pas su répondre.'),
          el('p', { class: 'f-quiz-du-soir-etiquette' }, 'La bonne réponse'),
          el('p', { class: 'f-quiz-du-soir-reponse' },
            el('strong', {}, carte.r || 'Cette carte n\'a pas de réponse écrite : vérifiez dans votre cours.')),
          aRepondu
            ? [
              el('p', {}, 'Aviez-vous juste ?'),
              el('div', { class: 'rangee' },
                el('button', { type: 'button', class: 'bouton', onclick: () => noter(true) }, 'J\'avais juste'),
                el('button', { type: 'button', class: 'bouton secondaire', onclick: () => noter(false) }, 'Je me suis trompé')),
            ]
            : el('div', { class: 'rangee' },
              el('button', { type: 'button', class: 'bouton', onclick: () => noter(false) },
                numero + 1 < questions.length ? 'Question suivante' : 'Voir mon score'))));
      tete.focus({ preventScroll: true });
    }

    function dessinerBilan() {
      const total = resultats.length;
      const score = resultats.filter((r) => r.juste).length;
      const rates = resultats.filter((r) => !r.juste);
      const tete = titre('Votre score');
      zone.append(
        el('section', { class: 'carte' },
          tete,
          el('p', { class: 'f-quiz-du-soir-score' }, score + ' sur ' + total),
          el('p', { class: 'aide' }, rates.length
            ? 'Relisez les questions à revoir, puis refaites un quiz demain : espacer les essais aide à retenir.'
            : 'Tout juste. Refaites un quiz demain pour vérifier que cela tient.')),
        el('div', {}, rates.length
          ? el('section', { class: 'carte' },
            el('h2', { class: 'f-quiz-du-soir-titre' }, 'À revoir (' + rates.length + ')'),
            el('ul', { class: 'liste' }, rates.map((r) => el('li', {},
              el('strong', {}, r.carte.q), el('br'),
              el('span', { class: 'aide' }, r.carte.r || '(pas de réponse écrite)')))))
          : null),
        el('div', { class: 'rangee' },
          el('button', { type: 'button', class: 'bouton', onclick: commencer }, 'Refaire un quiz'),
          el('button', {
            type: 'button', class: 'bouton secondaire',
            onclick: () => { etape = 'depart'; dessiner(); },
          }, 'Changer de matière')));
      tete.focus({ preventScroll: true });
    }

    dessiner();
  },
});
