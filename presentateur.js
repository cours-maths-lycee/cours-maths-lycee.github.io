/* Mode présentateur des pages de partie d'un cours : projeter en classe.
   Plein écran, sans menu ni navigation, tout replié comme le document élève ;
   un clic sur « Correction » la déplie au tableau. Deux largeurs : pleine, ou
   demi (cours à gauche, moitié droite blanche pour écrire sur le tableau blanc
   où l'on projette). A− et A+ ajustent la taille du cours à la salle, séparément
   pour chaque largeur ; le navigateur retient ces réglages et la dernière largeur.
   Styles : tex2html.css (html.presentateur). Les boutons ne sont créés qu'ici :
   sans script, rien ne change. */
(function () {
  'use strict';
  // largeurs de page de référence : le contenu s'agrandit pour remplir sa place
  var LARGEUR = 1100;
  var LARGEUR_DEMI = 800;   // plus étroite : le texte reste lisible du fond de la classe
  // réglage de A− et A+, par rapport à la taille automatique
  var PAS = 0.1, ZOOM_MIN = 0.7, ZOOM_MAX = 2;
  var CLE = 'presentateur';
  var racine = document.documentElement;
  var page = document.querySelector('main.lecture');
  var surTitre = document.querySelector('h1.titre-partie .sur-titre');
  if (!page || !surTitre) return;
  var avant = null;   // état à retrouver en quittant

  function borne(z) {
    return typeof z === 'number' && isFinite(z) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) : 1;
  }

  // réglages retenus par le navigateur (facultatifs : stockage parfois bloqué)
  var reglage = {demi: false, zoom: {plein: 1, demi: 1}};
  try {
    var lu = JSON.parse(window.localStorage.getItem(CLE));
    if (lu) {
      reglage.demi = lu.demi === true;
      if (lu.zoom) reglage.zoom = {plein: borne(lu.zoom.plein), demi: borne(lu.zoom.demi)};
    }
  } catch (e) {}

  function retenir() {
    try { window.localStorage.setItem(CLE, JSON.stringify(reglage)); } catch (e) {}
  }

  function mode() { return reglage.demi ? 'demi' : 'plein'; }

  function agrandir() {
    // calculé à l'entrée, aux boutons et au passage en plein écran seulement : Ctrl + et Ctrl - restent actifs
    if (!racine.classList.contains('presentateur')) { page.style.zoom = ''; return; }
    var base = reglage.demi ? window.innerWidth / 2 / LARGEUR_DEMI : window.innerWidth / LARGEUR;
    page.style.zoom = Math.max(1, base) * reglage.zoom[mode()];
  }

  function libeller() {
    largeur.textContent = reglage.demi ? 'Pleine largeur' : 'Demi-largeur';
    largeur.title = reglage.demi ? 'Le cours sur toute la largeur de l’écran'
      : 'Le cours à gauche, la moitié droite blanche pour écrire au tableau';
    moins.disabled = reglage.zoom[mode()] <= ZOOM_MIN;
    plus.disabled = reglage.zoom[mode()] >= ZOOM_MAX;
  }

  // garde à l'écran le passage en cours de lecture : le texte se recompose à la nouvelle taille
  function garderPassage(changer) {
    var haut = 40;
    var repere = document.elementFromPoint(window.innerWidth / 4, haut) || page;
    var r = repere.getBoundingClientRect();
    var part = (haut - r.top) / (r.height || 1);
    changer();
    r = repere.getBoundingClientRect();
    window.scrollBy(0, r.top + part * r.height - haut);
  }

  function basculer() {
    garderPassage(function () {
      reglage.demi = !reglage.demi;
      racine.classList.toggle('presentateur-demi', reglage.demi);
      agrandir();
      libeller();
    });
    retenir();
  }

  function zoomer(sens) {
    garderPassage(function () {
      reglage.zoom[mode()] = borne(Math.round((reglage.zoom[mode()] + sens * PAS) * 10) / 10);
      agrandir();
      libeller();
    });
    retenir();
  }

  function entrer() {
    var details = page.querySelectorAll('details');
    avant = {
      ouverts: [].filter.call(details, function (d) { return d.open; }),
      y: window.scrollY,
      theme: racine.getAttribute('data-theme')
    };
    details.forEach(function (d) { d.open = false; });
    racine.classList.add('presentateur');
    racine.classList.toggle('presentateur-demi', reglage.demi);
    racine.setAttribute('data-theme', 'light');   // noir sur blanc, comme la feuille
    agrandir();
    window.scrollTo(0, 0);
    if (racine.requestFullscreen) {
      racine.requestFullscreen().catch(function () {});   // refusé : le mode reste utilisable
    }
  }

  function quitter() {
    if (!avant) return;
    racine.classList.remove('presentateur', 'presentateur-demi');
    if (avant.theme === null) racine.removeAttribute('data-theme');
    else racine.setAttribute('data-theme', avant.theme);
    agrandir();
    page.querySelectorAll('details').forEach(function (d) {
      d.open = avant.ouverts.indexOf(d) >= 0;
    });
    if (document.fullscreenElement) document.exitFullscreen();
    window.scrollTo(0, avant.y);
    avant = null;
  }

  var ouvrir = document.createElement('button');
  ouvrir.type = 'button';
  ouvrir.className = 'presentateur-entrer';
  ouvrir.textContent = 'Mode présentateur';
  ouvrir.title = 'Projeter cette partie en classe : plein écran, corrections repliées';
  ouvrir.onclick = entrer;
  surTitre.appendChild(ouvrir);

  var boutons = document.createElement('div');
  boutons.className = 'presentateur-boutons';

  function bouton(texte, titre, action) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = texte;
    b.title = titre;
    b.onclick = action;
    boutons.appendChild(b);
    return b;
  }

  var moins = bouton('A−', 'Réduire la taille du cours', function () { zoomer(-1); });
  var plus = bouton('A+', 'Agrandir la taille du cours', function () { zoomer(1); });
  var largeur = bouton('', '', basculer);
  bouton('Quitter', 'Quitter le mode présentateur', quitter);
  libeller();

  document.body.appendChild(boutons);

  document.addEventListener('fullscreenchange', agrandir);
  // Échap sort d'abord du plein écran (navigateur) ; une seconde fois, du mode présentateur
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && avant && !document.fullscreenElement) quitter();
  });
})();
