// Révision espacée : les cartes du jour ; une carte réussie revient dans 1, 3 puis 7 jours, une carte ratée revient tout de suite. Ticket #2.
Outil.enregistrer({
  id: 'revision-espacee',
  titre: 'Révision espacée',
  icone: '📅',
  description: 'Vos cartes du jour : réussie, une carte revient dans 1, 3 puis 7 jours',
  principe: 'Espacer les révisions',
  ticket: 2,
  ordre: 10,
  afficher(zone, O) {
    const { el } = O;
    const DELAIS = [1, 3, 7]; // jours avant le retour d'une carte réussie, selon sa boîte (1, 2 ou 3)
    const memoire = O.memoire('revision-espacee'); // { filtre : id de la matière choisie, ou '' pour toutes }

    if (!document.getElementById('style-revision-espacee')) {
      document.head.append(el('style', { id: 'style-revision-espacee' }, `
.f-revision-espacee-reste { margin: 12px 0 0; font-weight: 600; }
.f-revision-espacee-reste:focus { outline: none; }
.f-revision-espacee-matiere { margin: 0; font-size: .85rem; font-weight: 600; color: var(--accent); }
.f-revision-espacee-question { margin: 4px 0 12px; overflow-wrap: anywhere; }
.f-revision-espacee-etiquette { margin: 12px 0 0; font-size: .85rem; font-weight: 600; color: var(--doux); }
.f-revision-espacee-reponse { margin: 0 0 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
`));
    }

    let filtre = (memoire.lire({}) || {}).filtre || '';
    let file = [];       // cartes du jour qui restent à revoir, dans l'ordre de passage
    let montree = false; // la réponse de la carte en cours est-elle affichée ?
    let revues = 0;      // cartes réussies depuis l'ouverture de l'écran

    const pluriel = (n, mot) => n + ' ' + mot + (n > 1 ? 's' : '');
    const boiteDe = (c) => Math.min(Math.max(c.boite || 1, 1), DELAIS.length);
    const cartesDuFiltre = () => O.cartes.liste(filtre || undefined);

    // Minuit, dans n jours : une carte revue le soir revient dès le matin du jour prévu.
    function minuitDans(jours) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + jours);
      return d.getTime();
    }

    // Les cartes du jour : celles dont la date de retour est passée. Les autres ne sont pas montrées.
    function charger() {
      if (filtre && !O.matieres.trouver(filtre)) filtre = '';
      const maintenant = Date.now();
      file = O.melanger(cartesDuFiltre().filter((c) => (c.prochaine || 0) <= maintenant));
      montree = false;
    }

    function repondre(reussie) {
      const c = file.shift();
      c.essais = (c.essais || 0) + 1;
      if (reussie) {
        const boite = boiteDe(c);
        c.reussites = (c.reussites || 0) + 1;
        c.prochaine = minuitDans(DELAIS[boite - 1]);
        c.boite = Math.min(boite + 1, DELAIS.length);
        revues++;
      } else {
        // Ratée : retour à la première boîte, et la carte repasse dès la fin des cartes du jour.
        c.boite = 1;
        c.prochaine = Date.now();
        file.push(c);
      }
      O.sauver();
      montree = false;
      dessiner(true);
    }

    // Le prochain jour où des cartes reviennent, et leur nombre.
    function prochainRetour() {
      const maintenant = Date.now();
      const futures = cartesDuFiltre().filter((c) => (c.prochaine || 0) > maintenant);
      if (!futures.length) return null;
      const jour = new Date(Math.min(...futures.map((c) => c.prochaine)));
      jour.setHours(0, 0, 0, 0);
      const lendemain = new Date(jour);
      lendemain.setDate(lendemain.getDate() + 1);
      return {
        nombre: futures.filter((c) => c.prochaine < lendemain.getTime()).length,
        quand: jour.getTime() <= minuitDans(1)
          ? 'demain'
          : 'le ' + jour.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
      };
    }

    function dessiner(apresAction) {
      zone.replaceChildren();
      if (!O.matieres.liste().length) {
        zone.append(O.choixMatiere()); // aide vers « Mes cours »
        return;
      }

      zone.append(el('label', { class: 'champ' }, el('span', {}, 'Matière'),
        el('select', {
          'aria-label': 'Matière',
          onchange: (e) => { filtre = e.target.value; memoire.ecrire({ filtre }); revues = 0; charger(); dessiner(); },
        },
        el('option', { value: '', selected: !filtre }, 'Toutes les matières, mélangées'),
        O.matieres.liste().map((m) => el('option', { value: m.id, selected: m.id === filtre }, m.nom)))));

      if (!cartesDuFiltre().length) {
        zone.append(el('p', { class: 'aide' }, 'Aucune carte à réviser pour l\'instant. ',
          el('a', { href: '#mes-cours' }, 'Écrivez-en dans « Mes cours »'), '.'));
        return;
      }

      const reste = el('p', { class: 'f-revision-espacee-reste', tabindex: '-1' });
      zone.append(reste);

      if (!file.length) {
        const retour = prochainRetour();
        reste.textContent = revues
          ? 'Vos cartes du jour sont terminées : ' + pluriel(revues, 'carte') + ' ' + (revues > 1 ? 'réussies' : 'réussie') + '.'
          : 'Aucune carte à revoir aujourd\'hui.';
        zone.append(
          el('p', {}, retour
            ? 'Prochaine révision : ' + retour.quand + ', ' + pluriel(retour.nombre, 'carte') + '.'
            : 'Aucune révision prévue.'),
          el('p', { class: 'aide' }, 'Revenez ce jour-là : laisser passer du temps entre deux révisions aide à retenir longtemps.'));
      } else {
        const c = file[0];
        const matiere = O.matieres.trouver(c.matiere);
        reste.textContent = file.length > 1
          ? 'Il vous reste ' + file.length + ' cartes à revoir aujourd\'hui.'
          : 'Il vous reste 1 carte à revoir aujourd\'hui.';
        zone.append(el('section', { class: 'carte' },
          el('p', { class: 'f-revision-espacee-matiere' }, matiere ? matiere.nom : ''),
          el('h2', { class: 'f-revision-espacee-question' }, c.q),
          montree
            ? [
              el('p', { class: 'f-revision-espacee-etiquette' }, 'Réponse'),
              el('p', { class: 'f-revision-espacee-reponse' },
                el('strong', {}, c.r || 'Cette carte n\'a pas de réponse écrite : vérifiez dans votre cours.')),
              el('div', { class: 'rangee' },
                el('button', { type: 'button', class: 'bouton', onclick: () => repondre(true) }, 'Je la savais'),
                el('button', { type: 'button', class: 'bouton secondaire', onclick: () => repondre(false) }, 'Je ne la savais pas')),
              el('p', { class: 'aide' }, 'Réussie, elle reviendra dans ' + pluriel(DELAIS[boiteDe(c) - 1], 'jour')
                + '. Ratée, elle revient tout de suite.'),
            ]
            : [
              el('p', { class: 'aide' }, 'Cherchez la réponse de tête ou à voix haute, puis vérifiez.'),
              el('button', { type: 'button', class: 'bouton', onclick: () => { montree = true; dessiner(true); } }, 'Voir la réponse'),
            ]));
      }
      if (apresAction) reste.focus({ preventScroll: true });
    }

    charger();
    dessiner();
  },
});
