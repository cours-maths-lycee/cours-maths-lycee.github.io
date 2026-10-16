# Faire des maths

Cours, fiches d'exercices et corrigés de mathématiques pour le lycée, en
pédagogie explicite, par Luc Destombe, sous licence CC BY-NC-SA 4.0.

Site : https://faire-des-maths.fr/
Dépôt : https://forge.apps.education.fr/faire-des-maths/faire-des-maths.forge.apps.education.fr
(ressource de la Forge des communs numériques éducatifs)

## À quoi ça sert

Des documents prêts à l'emploi pour enseigner et pour apprendre :
- un cours par chapitre, découpé en parties courtes : chaque méthode est
  illustrée par des exemples corrigés, ligne à ligne, puis un « À vous de
  jouer » calqué sur l'exemple ;
- une fiche d'exercices alignée sur les parties du cours, et son corrigé
  détaillé ;
- une version élève du cours, à compléter en classe.

Les documents sont conçus par l'auteur avec l'aide d'une IA générative, puis relus et testés en classe.

## Comment s'en servir

- Élèves : le site se lit sur téléphone ; chaque partie du cours a sa page,
  avec les exemples corrigés, puis les exercices et leurs corrections repliés.
- Enseignants : chaque document existe en PDF et en LaTeX (.tex), un format
  ouvert et non propriétaire. Chaque .tex est autonome : il se compile seul
  avec pdflatex (deux passes), sans autre fichier, et se modifie librement
  dans les conditions de la licence.

## Contenu du dépôt

- `<niveau>/<chapitre>/` : PDF, sources .tex, pages HTML et figures ;
- `index.html`, `methodes.html` : entrées par chapitre et par méthode ;
- `marteau.js` : bouton « exercice fait » des exercices (totaux de tous les
  élèves, sans donnée personnelle) ;
- `bonus.js` : animation d'un bonus obtenu en mode élève ;
- `eleve.js` : mode élève (lien personnel envoyé par le professeur ; le
  serveur des compteurs ne connaît qu'un code, jamais le nom de l'élève) ;
- `katex/`, `count.js` : composants tiers (voir LICENSE).

Ce dépôt est produit automatiquement à partir des sources de l'auteur : ne
pas le modifier à la main.

## Contribuer

Les suggestions d'amélioration des cours et des exercices sont les
bienvenues : page « Contribuer » du site (https://faire-des-maths.fr/contribuer.html),
ou un ticket sur ce dépôt.

## Licence

Documents : CC BY-NC-SA 4.0 ; composants tiers : voir le fichier LICENSE.
