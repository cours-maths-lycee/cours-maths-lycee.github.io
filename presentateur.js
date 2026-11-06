/* Mode présentateur des pages de partie d'un cours : projeter en classe.
   Plein écran, sans menu ni navigation, tout replié comme le document élève ;
   un clic sur « Correction » la déplie au tableau. Styles : tex2html.css
   (html.presentateur). Le bouton n'est créé qu'ici : sans script, rien ne change. */
(function () {
  'use strict';
  var LARGEUR = 1100;   // largeur de page de référence : le contenu s'agrandit pour remplir l'écran
  var racine = document.documentElement;
  var page = document.querySelector('main.lecture');
  var surTitre = document.querySelector('h1.titre-partie .sur-titre');
  if (!page || !surTitre) return;
  var avant = null;   // état à retrouver en quittant

  function agrandir() {
    // calculé à l'entrée et au passage en plein écran seulement : Ctrl + et Ctrl - restent actifs
    page.style.zoom = racine.classList.contains('presentateur')
      ? Math.max(1, window.innerWidth / LARGEUR) : '';
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
    racine.setAttribute('data-theme', 'light');   // noir sur blanc, comme la feuille
    agrandir();
    window.scrollTo(0, 0);
    if (racine.requestFullscreen) {
      racine.requestFullscreen().catch(function () {});   // refusé : le mode reste utilisable
    }
  }

  function quitter() {
    if (!avant) return;
    racine.classList.remove('presentateur');
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

  var fermer = document.createElement('button');
  fermer.type = 'button';
  fermer.className = 'presentateur-quitter';
  fermer.textContent = 'Quitter';
  fermer.title = 'Quitter le mode présentateur';
  fermer.onclick = quitter;
  document.body.appendChild(fermer);

  document.addEventListener('fullscreenchange', agrandir);
  // Échap sort d'abord du plein écran (navigateur) ; une seconde fois, du mode présentateur
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && avant && !document.fullscreenElement) quitter();
  });
})();
