// Noyau de l'outil : stockage dans le navigateur, ouverture d'une IA gratuite, navigation.
// Chaque fonctionnalité s'appuie sur l'objet global Outil (voir CLAUDE.md).
// Ne modifiez ce fichier que si une fonctionnalité en a vraiment besoin, et dites-le dans le message de publication.
(function () {
  'use strict';

  const CONFIG = window.CONFIG || {};
  const CLE = 'outil-apprentissage:' + location.pathname;
  const modules = [];
  let donnees = chargerDonnees();

  // ---------- Stockage (navigateur de l'étudiant uniquement) ----------

  function chargerDonnees() {
    try {
      const d = JSON.parse(localStorage.getItem(CLE));
      if (d && Array.isArray(d.matieres)) {
        d.modules = d.modules || {};
        return d;
      }
    } catch (e) { /* données absentes ou illisibles : on repart de zéro */ }
    return { matieres: [], modules: {}, matiereActive: null };
  }

  function sauver() {
    try {
      localStorage.setItem(CLE, JSON.stringify(donnees));
    } catch (e) {
      notifier("Impossible d'enregistrer : la mémoire du navigateur est pleine ou bloquée.");
    }
  }

  const nouvelId = () => Math.random().toString(36).slice(2, 10);

  // Mémoire propre à une fonctionnalité : Outil.memoire('quiz').lire({}) puis .ecrire(objet)
  function memoire(idModule) {
    return {
      lire(parDefaut) {
        const v = donnees.modules[idModule];
        return v === undefined ? parDefaut : v;
      },
      ecrire(valeur) {
        donnees.modules[idModule] = valeur;
        sauver();
      },
    };
  }

  // ---------- Matières et cartes de révision ----------
  // Une matière : { id, nom, notes, cartes: [] }
  // Une carte : { id, matiere, q, r, creee, boite, prochaine, essais, reussites }

  const matieres = {
    liste: () => donnees.matieres,
    trouver: (id) => donnees.matieres.find((m) => m.id === id) || null,
    active() {
      return matieres.trouver(donnees.matiereActive) || donnees.matieres[0] || null;
    },
    choisir(id) {
      donnees.matiereActive = id;
      sauver();
    },
    ajouter(nom) {
      const m = { id: nouvelId(), nom: String(nom).trim() || 'Sans titre', notes: '', cartes: [] };
      donnees.matieres.push(m);
      donnees.matiereActive = m.id;
      sauver();
      return m;
    },
    renommer(id, nom) {
      const m = matieres.trouver(id);
      if (m) { m.nom = String(nom).trim() || m.nom; sauver(); }
    },
    supprimer(id) {
      donnees.matieres = donnees.matieres.filter((m) => m.id !== id);
      if (donnees.matiereActive === id) donnees.matiereActive = null;
      sauver();
    },
    majNotes(id, notes) {
      const m = matieres.trouver(id);
      if (m) { m.notes = String(notes); sauver(); }
    },
  };

  const cartes = {
    // Toutes les cartes d'une matière, ou de toutes les matières si id est vide.
    liste(id) {
      if (id) return (matieres.trouver(id) || { cartes: [] }).cartes;
      return donnees.matieres.flatMap((m) => m.cartes);
    },
    ajouter(idMatiere, q, r) {
      const m = matieres.trouver(idMatiere);
      if (!m || !String(q).trim()) return null;
      const c = {
        id: nouvelId(), matiere: m.id, q: String(q).trim(), r: String(r || '').trim(),
        creee: Date.now(), boite: 1, prochaine: Date.now(), essais: 0, reussites: 0,
      };
      m.cartes.push(c);
      sauver();
      return c;
    },
    supprimer(idCarte) {
      for (const m of donnees.matieres) m.cartes = m.cartes.filter((c) => c.id !== idCarte);
      sauver();
    },
    // Après une modification directe d'une carte (boite, prochaine...), appelez Outil.sauver().
    // Lit un texte « Q: ... / R: ... » (copié depuis une IA) et ajoute les cartes trouvées.
    importer(idMatiere, texte) {
      const paires = lireQuestionsReponses(texte);
      paires.forEach((p) => cartes.ajouter(idMatiere, p.q, p.r));
      return paires.length;
    },
  };

  function lireQuestionsReponses(texte) {
    const paires = [];
    let courante = null;
    let champ = null;
    for (const brute of String(texte).split(/\r?\n/)) {
      const ligne = brute.replace(/^\s*[-*•\d.)]+\s*/, '').replace(/\*\*/g, '').trim();
      const q = ligne.match(/^(q|question)\s*\d*\s*[:.\-]\s*(.*)$/i);
      const r = ligne.match(/^(r|réponse|reponse|a|answer)\s*\d*\s*[:.\-]\s*(.*)$/i);
      if (q) {
        if (courante && courante.q) paires.push(courante);
        courante = { q: q[2], r: '' };
        champ = 'q';
      } else if (r && courante) {
        courante.r = r[2];
        champ = 'r';
      } else if (ligne && courante && champ) {
        courante[champ] += (courante[champ] ? ' ' : '') + ligne;
      }
    }
    if (courante && courante.q) paires.push(courante);
    return paires.filter((p) => p.q);
  }

  // ---------- Petits outils d'interface ----------

  // Crée un élément : Outil.el('button', { class: 'bouton', onclick: f }, 'Texte')
  function el(tag, attributs, ...enfants) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attributs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (k === 'value') n.value = v;
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const e of enfants.flat(Infinity)) {
      if (e == null || e === false) continue;
      n.append(e instanceof Node ? e : String(e));
    }
    return n;
  }

  function notifier(message) {
    let zone = document.getElementById('notification');
    if (!zone) {
      zone = el('div', { id: 'notification', role: 'status', 'aria-live': 'polite' });
      document.body.append(zone);
    }
    zone.textContent = message;
    zone.classList.add('visible');
    clearTimeout(notifier.minuteur);
    notifier.minuteur = setTimeout(() => zone.classList.remove('visible'), 2800);
  }

  async function copier(texte) {
    try {
      await navigator.clipboard.writeText(texte);
      notifier('Copié. Collez-le dans votre IA.');
      return true;
    } catch (e) {
      const zone = el('textarea', { readonly: true, style: 'position:fixed;opacity:0' }, texte);
      document.body.append(zone);
      zone.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      zone.remove();
      notifier(ok ? 'Copié. Collez-le dans votre IA.' : 'Copie impossible : sélectionnez le texte à la main.');
      return ok;
    }
  }

  // Sélecteur de matière, partagé par toutes les fonctionnalités.
  function choixMatiere(quandChange) {
    const liste = matieres.liste();
    if (!liste.length) {
      return el('p', { class: 'aide' }, "Ajoutez d'abord une matière dans « Mes cours ». ",
        el('a', { href: '#mes-cours' }, 'Aller à Mes cours'));
    }
    const active = matieres.active();
    const select = el('select', {
      'aria-label': 'Matière',
      onchange: (e) => { matieres.choisir(e.target.value); if (quandChange) quandChange(matieres.active()); },
    }, liste.map((m) => el('option', { value: m.id, selected: active && m.id === active.id }, m.nom)));
    return el('label', { class: 'champ' }, el('span', {}, 'Matière'), select);
  }

  const melanger = (t) => {
    const a = t.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // ---------- Ouvrir une IA gratuite avec une consigne déjà prête ----------
  // Aucune clé d'API : la consigne s'ouvre dans l'IA de l'étudiant, ou se copie.

  const IA = {
    chatgpt: { nom: 'ChatGPT', url: (q) => 'https://chatgpt.com/?q=' + q },
    claude: { nom: 'Claude', url: (q) => 'https://claude.ai/new?q=' + q },
    gemini: { nom: 'Gemini', url: () => 'https://gemini.google.com/app' },
  };

  function ouvrirIA(consigne, titre) {
    const texte = String(consigne);
    const encode = encodeURIComponent(texte);
    const tropLong = encode.length > 6000;
    const fenetre = el('dialog', { class: 'fenetre', 'aria-label': titre || 'Consigne pour votre IA' });
    const fermer = () => { fenetre.close(); fenetre.remove(); };
    const boutons = (CONFIG.ia || Object.keys(IA)).filter((k) => IA[k]).map((k) =>
      el('button', {
        class: 'bouton',
        onclick: async () => {
          await copier(texte);
          const avecTexte = k !== 'gemini' && !tropLong;
          window.open(avecTexte ? IA[k].url(encode) : IA[k].url(''), '_blank', 'noopener');
        },
      }, 'Ouvrir ' + IA[k].nom));
    fenetre.append(
      el('h2', {}, titre || 'Consigne pour votre IA'),
      el('p', { class: 'aide' },
        "La consigne est copiée quand vous ouvrez une IA. Si elle n'apparaît pas, collez-la dans la zone de message."),
      el('textarea', { class: 'consigne', readonly: true, rows: 8 }, texte),
      el('div', { class: 'rangee' },
        el('button', { class: 'bouton secondaire', onclick: () => copier(texte) }, 'Copier'),
        boutons),
      el('button', { class: 'lien', onclick: fermer }, 'Fermer'));
    fenetre.addEventListener('cancel', fermer);
    document.body.append(fenetre);
    fenetre.showModal();
  }

  // ---------- Fonctionnalités et navigation ----------

  // Une fonctionnalité s'enregistre ainsi (voir CLAUDE.md) :
  // Outil.enregistrer({ id, titre, icone, description, principe, ticket, ordre, afficher(zone, Outil) })
  function enregistrer(module) {
    if (!module || !module.id || typeof module.afficher !== 'function') {
      console.error('Fonctionnalité mal déclarée', module);
      return;
    }
    if (modules.some((m) => m.id === module.id)) {
      console.error('Identifiant déjà utilisé : ' + module.id);
      return;
    }
    modules.push(Object.assign({ ordre: 50, icone: '•', description: '' }, module));
  }

  const erreurs = [];
  function signalerErreur(nomFichier) {
    erreurs.push(nomFichier);
  }

  function naviguer(id) {
    location.hash = '#' + id;
  }

  function afficher() {
    const id = decodeURIComponent(location.hash.slice(1)) || 'accueil';
    const zone = document.getElementById('contenu');
    zone.replaceChildren();
    document.querySelectorAll('.barre a').forEach((a) =>
      a.setAttribute('aria-current', a.getAttribute('href') === '#' + id ? 'page' : 'false'));
    const module = modules.find((m) => m.id === id);
    if (id !== 'accueil' && module) {
      zone.append(el('a', { href: '#accueil', class: 'retour' }, '← Accueil'));
      zone.append(el('h1', {}, module.icone + ' ' + module.titre));
      const corps = el('div', { class: 'module' });
      zone.append(corps);
      try {
        module.afficher(corps, window.Outil);
      } catch (e) {
        console.error(e);
        corps.append(el('p', { class: 'erreur' }, "Cette fonctionnalité a un problème. Signalez-le dans un ticket."));
      }
    } else {
      afficherAccueil(zone);
    }
    zone.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function afficherAccueil(zone) {
    const visibles = modules.filter((m) => !m.cache).sort((a, b) => a.ordre - b.ordre);
    zone.append(
      el('section', { class: 'bandeau' },
        el('h1', {}, (CONFIG.emoji ? CONFIG.emoji + ' ' : '') + (CONFIG.nom || "Outil d'apprentissage")),
        CONFIG.sousTitre ? el('p', {}, CONFIG.sousTitre) : null),
      el('ol', { class: 'etapes' },
        el('li', {}, 'Ajoutez une matière et vos notes dans « Mes cours ».'),
        el('li', {}, 'Révisez avec les fonctionnalités ci-dessous.'),
        el('li', {}, 'Proposez la suivante : la classe vote, un agent IA la construit.')),
      el('div', { class: 'grille' }, visibles.map((m) =>
        el('a', { class: 'tuile', href: '#' + m.id },
          el('span', { class: 'icone', 'aria-hidden': 'true' }, m.icone),
          el('strong', {}, m.titre),
          el('span', {}, m.description),
          m.ticket && CONFIG.depot ? el('small', {}, 'Ticket n° ' + m.ticket) : null))),
      el('div', {}, erreurs.length
        ? el('p', { class: 'erreur' }, 'Fonctionnalités indisponibles pour le moment : ' + erreurs.join(', '))
        : null));
  }

  function appliquerApparence() {
    const c = CONFIG.couleurs || {};
    const racine = document.documentElement.style;
    if (c.accent) racine.setProperty('--accent', c.accent);
    if (c.fond) racine.setProperty('--fond', c.fond);
    if (c.texte) racine.setProperty('--texte', c.texte);
    if (c.carte) racine.setProperty('--carte', c.carte);
    if (CONFIG.police && CONFIG.police !== 'system-ui') {
      document.head.append(el('link', {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(CONFIG.police) + ':wght@400;600;700&display=swap',
      }));
      racine.setProperty('--police', "'" + CONFIG.police + "', system-ui, sans-serif");
    }
    document.title = CONFIG.nom || document.title;
    const nom = document.getElementById('nom-outil');
    if (nom) nom.textContent = (CONFIG.emoji ? CONFIG.emoji + ' ' : '') + (CONFIG.nom || '');
    const pied = document.getElementById('pied');
    if (pied && CONFIG.depot) {
      pied.replaceChildren('Construit en classe avec un agent IA. ',
        el('a', { href: CONFIG.depot, target: '_blank', rel: 'noopener' }, 'Code et tickets sur GitHub'), '.');
    }
  }

  function demarrer() {
    appliquerApparence();
    const barre = document.getElementById('barre');
    if (barre) {
      const raccourcis = [{ id: 'accueil', titre: 'Accueil', icone: '🏠' }]
        .concat(modules.filter((m) => m.barre).sort((a, b) => a.ordre - b.ordre));
      barre.replaceChildren(...raccourcis.map((m) =>
        el('a', { href: '#' + m.id }, el('span', { 'aria-hidden': 'true' }, m.icone), m.titre)));
    }
    window.addEventListener('hashchange', afficher);
    afficher();
  }

  window.Outil = {
    config: CONFIG,
    el, notifier, copier, melanger, ouvrirIA, choixMatiere, naviguer,
    matieres, cartes, memoire, sauver,
    enregistrer, signalerErreur, demarrer,
    lireQuestionsReponses,
  };
})();
