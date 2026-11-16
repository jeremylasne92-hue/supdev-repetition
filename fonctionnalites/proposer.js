// Proposer une fonctionnalité : le modèle de mini PRD, la consigne « interroge-moi » et le lien vers le formulaire.
Outil.enregistrer({
  id: 'proposer',
  titre: 'Proposer une fonctionnalité',
  icone: '💡',
  description: 'Votre mini PRD : décrivez une idée, la classe vote, un agent IA la construit',
  ordre: 99,
  barre: true,
  afficher(zone, O) {
    const { el } = O;
    const idee = el('input', { type: 'text', placeholder: 'Mon idée en une phrase' });

    const consigne = () => 'Je suis étudiant en Bachelor. Je veux proposer une fonctionnalité pour l\'outil d\'apprentissage de ma classe : '
      + (idee.value.trim() || '[mon idée en une phrase]') + '.\n'
      + 'Pose-moi des questions, une seule à la fois, pour m\'aider à la préciser : le problème que je rencontre quand je révise, '
      + 'pour qui elle est, ce qu\'elle fait étape par étape, un exemple concret, comment savoir qu\'elle marche, et ce qu\'elle ne doit pas faire. '
      + 'Elle doit me faire travailler, pas travailler à ma place.\n'
      + 'N\'écris pas la fiche à ma place : à la fin, résume seulement mes réponses, avec mes mots.';

    zone.append(
      el('section', { class: 'carte' },
        el('h2', {}, '1. Précisez votre idée avec votre IA'),
        el('p', { class: 'aide' }, 'Votre IA vous pose des questions une par une. C\'est vous qui répondez.'),
        el('label', { class: 'champ' }, el('span', {}, 'Votre idée'), idee),
        el('button', { class: 'bouton', onclick: () => O.ouvrirIA(consigne(), 'Faites-vous interroger') }, 'Ouvrir mon IA')),
      el('section', { class: 'carte' },
        el('h2', {}, '2. Remplissez votre mini PRD'),
        el('p', { class: 'aide' }, 'Une page, huit rubriques :'),
        el('ol', {},
          el('li', {}, 'Nom de la fonctionnalité'),
          el('li', {}, 'Le problème : ce qui vous gêne quand vous révisez'),
          el('li', {}, 'Pour qui'),
          el('li', {}, 'Ce qu\'elle fait, étape par étape'),
          el('li', {}, 'Un exemple concret'),
          el('li', {}, 'Comment saurez-vous qu\'elle marche (2 ou 3 critères)'),
          el('li', {}, 'Ce qu\'elle ne doit pas faire'),
          el('li', {}, 'Le principe des sciences cognitives qu\'elle utilise')),
        O.config.formulaire
          ? el('a', { class: 'bouton', href: O.config.formulaire, target: '_blank', rel: 'noopener' }, 'Déposer mon mini PRD')
          : null,
        el('p', { class: 'aide' }, 'N\'écrivez ni votre nom ni aucune donnée personnelle : chaque fiche devient un ticket public.')),
      el('section', { class: 'carte' },
        el('h2', {}, '3. Suivez votre ticket'),
        el('p', {}, 'Chaque mini PRD devient un ticket sur GitHub. La classe vote, puis l\'agent construit les fonctionnalités retenues.'),
        O.config.depot
          ? el('a', { class: 'bouton secondaire', href: O.config.depot + '/issues', target: '_blank', rel: 'noopener' }, 'Voir les tickets')
          : null));
  },
});
