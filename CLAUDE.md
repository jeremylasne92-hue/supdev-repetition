# Outil d'apprentissage de la classe : règles pour l'agent

Ce fichier est le document de vérité du dépôt. L'agent le lit avant toute modification.

## Ce qu'est ce dépôt

Un outil d'apprentissage construit par une classe de Bachelor de SUP de V, le 17 novembre 2026, avec Jérémy Lasne (Mouvement ECHO). Chaque étudiant a décrit une fonctionnalité dans un mini PRD, devenu un ticket GitHub avec l'étiquette `mini-prd`. La classe a voté : les tickets retenus portent l'étiquette `retenue`.

Le site est publié par GitHub Pages depuis la branche `main` : https://jeremylasne92-hue.github.io/supdev-repetition/

## Architecture, à ne pas changer

- Site statique : HTML, CSS et JavaScript classique. Pas d'étape de construction, pas de bibliothèque, pas de serveur, pas de clé d'API.
- `index.html` charge `config.js`, `noyau.js`, `fonctionnalites/registre.js`, puis chaque fonctionnalité du registre.
- `noyau.js` fournit l'objet global `Outil` (ci-dessous).
- **Une fonctionnalité = un fichier `fonctionnalites/<id>.js` + une ligne `'<id>'` dans `fonctionnalites/registre.js`.** Rien d'autre à toucher. Une fonctionnalité cassée se retire donc d'un seul `git revert`.
- Les données restent dans le navigateur de l'étudiant, par `Outil`. Rien n'est envoyé sur internet.
- Pour faire appel à une IA : `Outil.ouvrirIA(consigne, titre)`. La consigne s'ouvre dans l'IA gratuite de l'étudiant (ChatGPT, Claude, Gemini) ou se copie. L'étudiant peut ensuite coller la réponse de l'IA dans un champ de la fonctionnalité.

## L'objet `Outil`

| Élément | Rôle |
|---|---|
| `Outil.el(tag, attributs, ...enfants)` | Crée un élément. `{ class: 'bouton', onclick: f }`. Les textes sont insérés comme texte, jamais comme HTML |
| `Outil.matieres` | `liste()`, `trouver(id)`, `active()`, `choisir(id)`, `ajouter(nom)`, `renommer(id, nom)`, `supprimer(id)`, `majNotes(id, notes)`. Une matière : `{ id, nom, notes, cartes }` |
| `Outil.cartes` | `liste(idMatiere?)` (toutes les matières si vide), `ajouter(idMatiere, q, r)`, `supprimer(idCarte)`, `importer(idMatiere, texte)` (lignes `Q:` / `R:`). Une carte : `{ id, matiere, q, r, creee, boite, prochaine, essais, reussites }`. Après avoir modifié une carte, appeler `Outil.sauver()` |
| `Outil.memoire(id)` | Mémoire propre à une fonctionnalité : `.lire(valeurParDefaut)`, `.ecrire(valeur)` |
| `Outil.choixMatiere(quandChange)` | Sélecteur de matière prêt à insérer |
| `Outil.ouvrirIA(consigne, titre)` | Ouvre la fenêtre « Ouvrir ChatGPT, Claude ou Gemini », la consigne est copiée |
| `Outil.copier(texte)`, `Outil.notifier(message)` | Copier dans le presse-papiers, afficher un court message |
| `Outil.melanger(tableau)`, `Outil.naviguer(id)`, `Outil.config` | Mélanger, aller à une fonctionnalité, lire `config.js` |

## Modèle d'une fonctionnalité

```js
// <Nom> : <à quoi elle sert, en une phrase>. Ticket #<n>.
Outil.enregistrer({
  id: 'quiz-du-soir',          // identique au nom du fichier
  titre: 'Quiz du soir',
  icone: '❓',
  description: 'Dix questions tirées de vos cartes, réponse après votre essai',
  principe: 'Se tester',       // principe des sciences cognitives
  ticket: 12,                  // numéro du ticket GitHub
  ordre: 20,                   // place sur l'accueil (Mes cours = 1, Proposer = 99)
  afficher(zone, O) {
    const { el } = O;
    zone.append(O.choixMatiere(() => { /* redessiner */ }));
    // ... construire l'écran dans zone
  },
});
```

Ne passez jamais `null` ni `undefined` à `zone.append` : le navigateur l'afficherait en toutes lettres. Enveloppez un élément facultatif dans `el('div', {}, condition ? element : null)`, car `Outil.el` ignore les valeurs vides.

Des styles propres à une fonctionnalité vont dans son fichier, une seule fois, dans un `<style id="style-<id>">` dont les règles commencent par `.f-<id>`. Classes déjà prêtes dans `style.css` : `carte`, `bouton`, `bouton secondaire`, `bouton danger`, `lien`, `champ`, `aide`, `rangee`, `liste`, `erreur`, `grille`, `tuile`.

## Règles de conception

- **L'outil fait travailler l'étudiant, il ne travaille pas à sa place** : il demande d'essayer avant de montrer la réponse.
- Principes à privilégier : se tester, espacer les révisions, mélanger les sujets, expliquer avec ses mots, associer mots et images.
- Pensé d'abord pour le téléphone : une colonne, boutons larges, rien qui dépende du survol.
- Interface en français, au vouvoiement, phrases courtes, sans faute d'orthographe.
- Une fonctionnalité doit marcher même sans matière ni carte : afficher alors une aide qui renvoie vers « Mes cours ».

## Construire les tickets retenus

1. `gh issue list --label retenue --state open --json number,title,body`
2. Les traiter un par un, du plus simple au plus complexe.
3. Pour chaque ticket : lire la fiche ; construire la plus petite version utile qui respecte ses critères « Comment saurez-vous qu'elle marche » ; viser dix minutes au plus. Si le ticket est trop gros, construire une première version et ouvrir un nouveau ticket `mini-prd` pour la suite.
4. Vérifier : `node outils/verifier.mjs` doit finir sans ERREUR. Lire les ATTENTION et corriger ce qui est un vrai défaut.
5. Publier : `node outils/publier.mjs "Ajoute <nom> (closes #<n>)"`. Le mot anglais `closes` ferme le ticket sur GitHub.
6. Commenter le ticket en français pour son auteur : ce qui a été construit, comment le tester sur le site (étapes), ce qui n'a pas été fait. `gh issue comment <n> --body "<texte>"`.
7. Passer au suivant sans poser de question. En cas de doute, choisir l'option la plus simple et la noter dans le commentaire du ticket.

## Changer le nom ou le design

Modifier seulement `config.js` (nom, sous-titre, emoji, couleurs, police Google Fonts), puis publier avec `node outils/publier.mjs "Change le nom et le design"`.

## Interdits

- Réécrire l'historique git, `git push --force`, supprimer des tickets.
- Modifier `.github/`, les réglages du dépôt ou les étiquettes.
- Ajouter une dépendance, un serveur, un traceur, une publicité ou une clé d'API.
- Publier un nom d'étudiant ou une donnée personnelle.
