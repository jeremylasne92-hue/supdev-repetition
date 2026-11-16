// Minuteur Pomodoro : 25 minutes de travail, puis 5 minutes de pause avec une question tirée de vos cartes. Ticket #3.
(function () {
  'use strict';

  const DUREES = { travail: 25 * 60000, pause: 5 * 60000 };
  const PERIME = 60 * 60000; // un minuteur oublié depuis plus d'une heure repart de zéro, sans rien signaler
  const memoire = Outil.memoire('minuteur-pomodoro');
  let ecran = null;     // { zone, dessiner, majTemps } tant que l'écran du minuteur est affiché
  let battement = null; // minuterie active seulement quand le minuteur tourne

  // État gardé dans le navigateur. Le minuteur repose sur l'heure de fin, pas sur un compteur :
  // il reste juste si l'étudiant change d'écran, recharge la page ou verrouille son téléphone.
  // { phase : 'travail' ou 'pause', fin : heure de fin si le minuteur tourne (sinon null),
  //   reste : millisecondes restantes quand il est arrêté, idCarte : carte posée pendant la pause }
  const depart = () => ({ phase: 'travail', fin: null, reste: DUREES.travail, idCarte: null });

  function lire() {
    const e = memoire.lire(null);
    return e && (e.phase === 'travail' || e.phase === 'pause') ? e : depart();
  }

  // Une carte au hasard dans la matière choisie, ou dans toutes les matières si elle n'en a pas.
  function tirerCarte(sauf) {
    const active = Outil.matieres.active();
    let cartes = active ? Outil.cartes.liste(active.id) : [];
    if (!cartes.length) cartes = Outil.cartes.liste();
    if (cartes.length > 1 && sauf) cartes = cartes.filter((c) => c.id !== sauf);
    return cartes.length ? Outil.melanger(cartes)[0].id : null;
  }

  function lancer() {
    const e = lire();
    if (e.fin) return;
    memoire.ecrire({ phase: e.phase, fin: Date.now() + e.reste, reste: 0, idCarte: e.idCarte });
    surveiller();
  }

  function suspendre() {
    const e = lire();
    if (!e.fin) return;
    memoire.ecrire({ phase: e.phase, fin: null, reste: Math.max(0, e.fin - Date.now()), idCarte: e.idCarte });
  }

  function commencerPause() {
    memoire.ecrire({ phase: 'pause', fin: Date.now() + DUREES.pause, reste: 0, idCarte: tirerCarte() });
    surveiller();
  }

  function commencerTravail() {
    memoire.ecrire({ phase: 'travail', fin: Date.now() + DUREES.travail, reste: 0, idCarte: null });
    surveiller();
  }

  function remettreAZero() {
    memoire.ecrire(depart());
  }

  function changerDeCarte() {
    const e = lire();
    memoire.ecrire({ phase: e.phase, fin: e.fin, reste: e.reste, idCarte: tirerCarte(e.idCarte) });
  }

  // Si une période est arrivée à son terme, passe à la suivante.
  // Renvoie 'pause' quand la pause commence, 'travail' quand elle se termine, sinon rien.
  function rattraper() {
    const e = lire();
    if (!e.fin || Date.now() < e.fin) return null;
    if (e.phase === 'travail' && Date.now() - e.fin < PERIME) {
      // La pause commence quand l'étudiant est là pour la prendre : elle n'est jamais écourtée.
      commencerPause();
      return 'pause';
    }
    remettreAZero();
    return e.phase === 'pause' ? 'travail' : null;
  }

  function signaler(message) {
    Outil.notifier(message);
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* vibration indisponible */ }
  }

  function battre() {
    if (ecran && !ecran.zone.isConnected) ecran = null; // l'étudiant est sur un autre écran : le minuteur continue
    const avant = lire();
    const evenement = rattraper();
    const apres = lire();
    if (evenement === 'pause') {
      signaler('25 minutes de travail terminées : c\'est la pause.' + (ecran ? '' : ' Une question vous attend dans le minuteur.'));
    } else if (evenement === 'travail') {
      signaler('La pause est finie. Lancez un nouveau tour quand vous êtes prêt.');
    }
    if (ecran) {
      // L'écran est redessiné quand l'état change ; sinon seul le temps affiché est mis à jour.
      if (apres.phase !== avant.phase || apres.fin !== avant.fin) ecran.dessiner();
      else ecran.majTemps();
    }
    if (!apres.fin) {
      clearInterval(battement);
      battement = null;
    }
  }

  function surveiller() {
    if (!battement) battement = setInterval(battre, 250);
  }

  function format(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  // Un minuteur lancé avant un rechargement de la page continue de tourner.
  if (lire().fin) surveiller();

  Outil.enregistrer({
    id: 'minuteur-pomodoro',
    titre: 'Minuteur Pomodoro',
    icone: '🍅',
    description: '25 minutes de travail, puis 5 minutes de pause avec une question de vos cartes',
    principe: 'Se tester',
    ticket: 3,
    ordre: 50,
    afficher(zone, O) {
      const { el } = O;

      if (!document.getElementById('style-minuteur-pomodoro')) {
        document.head.append(el('style', { id: 'style-minuteur-pomodoro' }, `
.f-minuteur-pomodoro-cadran { text-align: center; }
.f-minuteur-pomodoro-cadran .rangee { justify-content: center; }
.f-minuteur-pomodoro-phase { margin: 0; font-size: .85rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--accent); }
.f-minuteur-pomodoro-temps { margin: 4px 0 12px; font-size: 4rem; line-height: 1.1; font-weight: 700; font-variant-numeric: tabular-nums; }
.f-minuteur-pomodoro-titre { margin-top: 0; }
.f-minuteur-pomodoro-question { margin: 4px 0 12px; overflow-wrap: anywhere; }
.f-minuteur-pomodoro-etiquette { margin: 12px 0 0; font-size: .85rem; font-weight: 600; color: var(--doux); }
.f-minuteur-pomodoro-reponse { margin: 0 0 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
`));
      }

      let montree = false; // la réponse de la question de la pause est-elle affichée ?
      let carteVue = null; // carte actuellement posée, pour cacher la réponse quand elle change
      const temps = el('p', { class: 'f-minuteur-pomodoro-temps', role: 'timer' });

      function majTemps() {
        const e = lire();
        temps.textContent = format(e.fin ? e.fin - Date.now() : e.reste);
      }

      // coin : partie de l'écran ('cadran' ou 'question') où remettre le curseur après une action de l'étudiant.
      function dessiner(coin) {
        const e = lire();
        const enMarche = !!e.fin;
        const neuf = e.phase === 'travail' && !enMarche && e.reste >= DUREES.travail;
        const carte = e.phase === 'pause' && e.idCarte ? O.cartes.liste().find((c) => c.id === e.idCarte) || null : null;
        if ((carte ? carte.id : null) !== carteVue) {
          carteVue = carte ? carte.id : null;
          montree = false;
        }

        const bouton = (texte, action, classe, ou) =>
          el('button', { type: 'button', class: classe || 'bouton', onclick: () => { action(); dessiner(ou || 'cadran'); } }, texte);

        let phase;
        let boutons;
        if (neuf) {
          phase = 'Prêt pour 25 minutes de travail';
          boutons = [bouton('Lancer 25 minutes de travail', lancer)];
        } else if (e.phase === 'travail') {
          phase = enMarche ? 'Travail' : 'Travail, minuteur en pause';
          boutons = [
            enMarche ? bouton('Mettre en pause', suspendre) : bouton('Reprendre', lancer),
            bouton('Faire ma pause maintenant', commencerPause, 'bouton secondaire'),
          ];
        } else {
          phase = enMarche ? 'Pause' : 'Pause suspendue';
          boutons = [
            enMarche ? bouton('Suspendre la pause', suspendre, 'bouton secondaire') : bouton('Reprendre la pause', lancer),
            bouton('Reprendre le travail maintenant', commencerTravail, 'bouton secondaire'),
          ];
        }

        // Matière d'où vient la question de la pause. Le minuteur marche aussi sans matière ni carte.
        const active = O.matieres.active();
        const total = O.cartes.liste().length;
        let aideQuestion;
        if (!active) aideQuestion = 'Le minuteur fonctionne déjà. Avec des cartes, une question apparaîtra pendant la pause.';
        else if (!total) aideQuestion = 'Aucune carte pour l\'instant : le minuteur fonctionne, mais la pause sera sans question.';
        else if (!O.cartes.liste(active.id).length) aideQuestion = 'Cette matière n\'a pas de carte : la question sera tirée de vos autres matières.';
        else aideQuestion = 'Pendant la pause, une question sera tirée des cartes de cette matière.';

        zone.replaceChildren(
          el('section', { class: 'carte f-minuteur-pomodoro-cadran', 'data-coin': 'cadran' },
            el('p', { class: 'f-minuteur-pomodoro-phase' }, phase),
            temps,
            el('div', { class: 'rangee' }, boutons),
            neuf ? null : bouton('Recommencer à zéro', remettreAZero, 'lien')),
          el('div', {}, e.phase === 'pause'
            ? el('section', { class: 'carte', 'data-coin': 'question' },
              el('h2', { class: 'f-minuteur-pomodoro-titre' }, 'Pendant votre pause, une question'),
              carte
                ? [
                  el('p', { class: 'f-minuteur-pomodoro-question' }, el('strong', {}, carte.q)),
                  montree
                    ? [
                      el('p', { class: 'f-minuteur-pomodoro-etiquette' }, 'Réponse'),
                      el('p', { class: 'f-minuteur-pomodoro-reponse' }, carte.r || 'Cette carte n\'a pas de réponse écrite : vérifiez dans votre cours.'),
                      bouton('Une autre question', changerDeCarte, 'bouton secondaire', 'question'),
                    ]
                    : [
                      el('p', { class: 'aide' }, 'Cherchez la réponse de tête, puis vérifiez.'),
                      bouton('Voir la réponse', () => { montree = true; }, 'bouton', 'question'),
                    ],
                ]
                : el('p', { class: 'aide' }, 'Aucune carte pour vous poser une question. ',
                  el('a', { href: '#mes-cours' }, 'Écrivez-en dans « Mes cours »'), '.'),
              el('p', { class: 'aide' }, 'Rien d\'obligatoire : c\'est votre pause.'))
            : null),
          el('section', { class: 'carte' },
            el('h2', { class: 'f-minuteur-pomodoro-titre' }, 'La question de la pause'),
            O.choixMatiere(() => {
              if (lire().phase === 'pause') changerDeCarte();
              dessiner();
            }),
            el('p', { class: 'aide' }, aideQuestion,
              active && !total ? [' ', el('a', { href: '#mes-cours' }, 'Écrivez des cartes dans « Mes cours »'), '.'] : null)),
          el('p', { class: 'aide' }, 'Le minuteur continue quand vous ouvrez un autre écran de l\'outil ou que vous rechargez la page.'));
        majTemps();
        if (coin) {
          const premier = zone.querySelector('[data-coin="' + coin + '"] button') || zone.querySelector('button');
          if (premier) premier.focus({ preventScroll: true });
        }
      }

      rattraper(); // une période terminée pendant que la page était fermée
      if (lire().fin) surveiller();
      ecran = { zone, dessiner, majTemps };
      dessiner();
    },
  });
})();
