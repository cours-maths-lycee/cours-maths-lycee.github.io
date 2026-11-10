/* Mode présentateur des pages de partie d'un cours et des pages d'exercices :
   projeter en classe. Plein écran, sans menu ni navigation, tout replié comme le
   document élève ; un clic sur « Correction » ou « Corrigé » la déplie au tableau.
   Deux largeurs : pleine, ou
   demi (texte à gauche, zone blanche à droite pour écrire sur le tableau blanc
   où l'on projette), avec un trait à déplacer à la souris entre les deux. La zone
   blanche peut porter un quadrillage ou un repère. A− et A+ ajustent la taille du
   texte à la salle, séparément pour chaque largeur ; le navigateur retient ces
   réglages, la dernière largeur, la place du trait (remis au milieu quand on
   change de largeur) et la taille des carreaux.
   Les boutons sont dans un menu en bas à droite (le haut de l'image est souvent
   coupé par le vidéoprojecteur), ouvert au survol de l'icône ou par un clic.
   Page d'exercices : un champ du menu mène à l'exercice n.
   Page de partie d'un cours : « Partie précédente » et « Partie suivante » (séances de
   2 h) remplacent le contenu sur place, sans quitter le plein écran (un changement de
   page le quitterait) ; en quittant le mode, la nouvelle page est rechargée, avec ses
   boutons (IA, suggestions…).
   Corrigé succinct (corrigés de fiche, exemples corrigés, À vous de jouer) : tiré du
   corrigé détaillé, rien n'est écrit à part. Pour chaque question (\cas), les lignes
   qui portent un résultat (\res), sans les explications en gris, sauf celles qui
   portent elles-mêmes un \res (conclusion écrite seulement en gris) ; sans \res, la
   dernière ligne de la question ; les figures restent. \res du cours : classe resc,
   sans couleur. À vous de jouer sans \res : les réponses courtes du \reponse
   (div.succinct-avj, tex2html.py).
   Styles : tex2html.css (html.presentateur). Les boutons ne sont créés qu'ici :
   sans script, rien ne change. */
(function () {
  'use strict';
  // largeurs de page de référence : le contenu s'agrandit pour remplir sa place
  var LARGEUR = 1100;
  var LARGEUR_DEMI = 800;   // plus étroite : le texte reste lisible du fond de la classe
  // réglage de A− et A+, par rapport à la taille automatique
  var PAS = 0.1, ZOOM_MIN = 0.7, ZOOM_MAX = 2;
  // part de la largeur laissée au cours par le trait
  var PARTAGE_MIN = 0.25, PARTAGE_MAX = 0.85;
  // côté des carreaux du quadrillage, en pixels
  var CARREAU = 40, CARREAU_PAS = 4, CARREAU_MIN = 16, CARREAU_MAX = 48;
  var CLE = 'presentateur';
  var racine = document.documentElement;
  var page = document.querySelector('main.lecture');
  var surTitre = document.querySelector('h1.titre-partie .sur-titre');
  if (!page || !surTitre) return;
  var pageExercices = surTitre.textContent === 'Exercices';   // lu avant d'y ajouter le bouton d'entrée
  var avant = null;   // état à retrouver en quittant
  var change = false; // partie changée sur place (Partie précédente / suivante)
  var fond = null;    // zone blanche : null, 'quadrillage' ou 'repere' (vide à chaque entrée)

  function borne(z) {
    return typeof z === 'number' && isFinite(z) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) : 1;
  }

  function bornePartage(p) {
    return typeof p === 'number' && isFinite(p) ? Math.min(PARTAGE_MAX, Math.max(PARTAGE_MIN, p)) : 0.5;
  }

  // ramène aussi sur un cran une taille retenue par le navigateur avec une ancienne échelle
  function borneCarreau(c) {
    if (typeof c !== 'number' || !isFinite(c)) return CARREAU;
    return Math.min(CARREAU_MAX, Math.max(CARREAU_MIN, Math.round(c / CARREAU_PAS) * CARREAU_PAS));
  }

  // réglages retenus par le navigateur (facultatifs : stockage parfois bloqué)
  var reglage = {demi: false, succinct: false, zoom: {plein: 1, demi: 1}, partage: 0.5, carreau: CARREAU};
  try {
    var lu = JSON.parse(window.localStorage.getItem(CLE));
    if (lu) {
      reglage.demi = lu.demi === true;
      reglage.succinct = lu.succinct === true;
      if (lu.zoom) reglage.zoom = {plein: borne(lu.zoom.plein), demi: borne(lu.zoom.demi)};
      reglage.partage = bornePartage(lu.partage);
      reglage.carreau = borneCarreau(lu.carreau);
    }
  } catch (e) {}

  function retenir() {
    try { window.localStorage.setItem(CLE, JSON.stringify(reglage)); } catch (e) {}
  }

  function mode() { return reglage.demi ? 'demi' : 'plein'; }

  function agrandir() {
    // calculé à l'entrée, aux boutons et au passage en plein écran seulement : Ctrl + et Ctrl - restent actifs.
    // En demi-largeur, la taille ne suit pas le trait : le déplacer recompose le texte sans le rapetisser.
    if (!racine.classList.contains('presentateur')) { page.style.zoom = ''; return; }
    var base = reglage.demi ? window.innerWidth / 2 / LARGEUR_DEMI : window.innerWidth / LARGEUR;
    page.style.zoom = Math.max(1, base) * reglage.zoom[mode()];
  }

  function libeller() {
    largeur.textContent = reglage.demi ? 'Pleine largeur' : 'Demi-largeur';
    largeur.title = reglage.demi ? 'Le texte sur toute la largeur de l’écran'
      : 'Le texte à gauche, une zone blanche à droite pour écrire au tableau';
    moins.disabled = reglage.zoom[mode()] <= ZOOM_MIN;
    plus.disabled = reglage.zoom[mode()] >= ZOOM_MAX;
    quadrillage.hidden = repere.hidden = !reglage.demi;
    quadrillage.setAttribute('aria-pressed', fond === 'quadrillage');
    repere.setAttribute('aria-pressed', fond === 'repere');
    ligneCarreaux.hidden = !reglage.demi || fond !== 'quadrillage';
    carreauMoins.disabled = reglage.carreau <= CARREAU_MIN;
    carreauPlus.disabled = reglage.carreau >= CARREAU_MAX;
    succinct.textContent = reglage.succinct ? 'Corrigé détaillé' : 'Corrigé succinct';
    succinct.title = reglage.succinct ? 'Les corrections en entier, avec les explications'
      : 'Les corrections réduites aux résultats';
    succinct.hidden = !page.querySelector(ZONES + ', .succinct-avj');
  }

  /* Corrigé succinct : marque, une fois par correction, ce qui reste affiché
     (.succ-garde) et ce qui disparaît (.succ-cache, sous html.presentateur-succinct). */
  var ZONES = 'details.corrige > .corps-corrige, details.correction > div';
  var RES = '.res, .resc';
  var LIGNE = '.calculs > div, .explique > div, p, li, table, .formule, .centre, h3, h4';
  var LAISSER = 'p.cas, details.ia, button';   // ni gardés ni cachés : leur règle à eux

  function garderLigne(garde, el) {
    // explication en gris qui porte le résultat (conclusion écrite seulement là) :
    // affichée, avec la ligne de calcul ou le texte qu'elle explique
    if (el.classList.contains('x') && el.previousElementSibling) {
      garde.push(el);
      el = el.previousElementSibling;
    }
    garde.push(el);
    // ligne de calcul : le membre de gauche avec le membre de droite
    if (el.classList.contains('d') && el.previousElementSibling) garde.push(el.previousElementSibling);
  }

  function derniereLigne(garde, segment) {
    for (var k = segment.length - 1; k >= 0; k--) {
      var el = segment[k];
      if (el.matches(LAISSER) || el.matches('p.note')) continue;
      if (el.classList.contains('calculs')) {
        var fin = el.querySelector(':scope > div:last-child');
        while (fin && fin.classList.contains('x')) fin = fin.previousElementSibling;
        if (fin) { garderLigne(garde, fin); return; }
      }
      garde.push(el);
      return;
    }
  }

  function cacherReste(el, garde) {
    [].forEach.call(el.children, function (c) {
      if (c.matches(LAISSER) || garde.indexOf(c) >= 0) return;
      if (garde.some(function (g) { return c.contains(g); })) cacherReste(c, garde);
      else c.classList.add('succ-cache');
    });
  }

  function preparerSuccinct() {
    page.querySelectorAll(ZONES).forEach(function (zone) {
      if (zone.classList.contains('succ-zone')) return;
      // À vous de jouer sans résultat marqué : les réponses courtes (div.succinct-avj, CSS)
      if (zone.parentNode.classList.contains('avj') && !zone.querySelector(RES)) return;
      zone.classList.add('succ-zone');
      var garde = [], segments = [[]];
      [].forEach.call(zone.children, function (c) {
        if (c.matches('p.cas') && segments[segments.length - 1].length) segments.push([]);
        segments[segments.length - 1].push(c);
      });
      segments.forEach(function (segment) {
        var avant = garde.length;
        segment.forEach(function (el) {
          var res = [].slice.call(el.querySelectorAll(RES));
          if (el.matches(RES)) res.push(el);
          res.forEach(function (r) {
            var l = r.closest(LIGNE);
            garderLigne(garde, l && zone.contains(l) && l !== zone ? l : r);
            // gris qui porte un \res (\rem, \justif) : reste affiché (tex2html.css)
            var gris = r.closest('.x, p.note');
            if (gris && zone.contains(gris)) gris.classList.add('succ-garde');
          });
        });
        // sans \res : la dernière ligne, sauf pour le chapeau qui précède les questions
        var chapeau = segments.length > 1 && !segment[0].matches('p.cas');
        if (garde.length === avant && !chapeau) derniereLigne(garde, segment);
        segment.forEach(function (el) {
          [].forEach.call(el.querySelectorAll('img.fig'), function (f) { garde.push(f); });
          if (el.matches('img.fig')) garde.push(el);
        });
      });
      cacherReste(zone, garde);
    });
  }

  function basculerSuccinct() {
    garderPassage(function () {
      reglage.succinct = !reglage.succinct;
      racine.classList.toggle('presentateur-succinct', reglage.succinct);
      libeller();
    });
    retenir();
  }

  // garde à l'écran le passage en cours de lecture : le texte se recompose à la nouvelle taille
  function garderPassage(changer) {
    var haut = 40;
    var point = document.elementFromPoint(window.innerWidth / 5, haut) || page;
    var r = point.getBoundingClientRect();
    var part = (haut - r.top) / (r.height || 1);
    changer();
    r = point.getBoundingClientRect();
    window.scrollBy(0, r.top + part * r.height - haut);
  }

  function basculer() {
    garderPassage(function () {
      reglage.demi = !reglage.demi;
      reglage.partage = 0.5;   // changer de largeur remet le trait au milieu
      placerTrait();
      racine.classList.toggle('presentateur-demi', reglage.demi);
      agrandir();
      libeller();
    });
    dessiner();   // la zone blanche suit le trait
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

  /* Zone blanche : quadrillage ou repère, redessinés à chaque changement de taille.
     Traits fins noirs, pour le contraste sur le tableau. Positions et épaisseurs sont calées
     sur les pixels de l'écran : sinon, avec une mise à l'échelle ou un zoom du navigateur
     (125 %, 90 %…), l'arrondi épaissit certains traits à intervalles réguliers. */
  var ppx = 1;   // pixels de l'écran par pixel CSS, relu à chaque dessin

  function cale(v) { return Math.round(v * ppx) / ppx; }

  // arrondi vers le bas à mi-chemin (écran à 150 %) : un trait fin reste fin, et égal dans les deux sens
  function epaisseur(v) { return Math.max(1, Math.ceil(v * ppx - 0.5)) / ppx; }

  // chaque trait est un rectangle plein, aux bords exacts
  function verticale(x, y1, y2, e) { return 'M' + x + ' ' + y1 + 'H' + (x + e) + 'V' + y2 + 'H' + x + 'z'; }

  // (tracés dans le même sens que verticale : en sens opposés, les croisements resteraient blancs)
  function horizontale(y, x1, x2, e) { return 'M' + x1 + ' ' + y + 'H' + x2 + 'V' + (y + e) + 'H' + x1 + 'z'; }

  function dessinTraits(chemin) {
    return '<path d="' + chemin + '" fill="#000" shape-rendering="crispEdges"/>';
  }

  function dessinQuadrillage(l, h) {
    var c = Math.max(1, cale(reglage.carreau)), e = epaisseur(1), chemin = '', k;
    for (k = 1; k * c < l; k++) chemin += verticale(k * c, 0, h, e);
    for (k = 1; k * c < h; k++) chemin += horizontale(k * c, 0, l, e);
    return dessinTraits(chemin);
  }

  // repère orthonormé de −5 à 5 sur chaque axe, le plus grand possible et centré ;
  // marge plus large en haut : la flèche et le « y » échappent à l'image coupée
  function dessinRepere(l, h) {
    var MARGE = 14, MARGE_HAUT = 48;
    var u = Math.max(10, cale(Math.floor(Math.min(l - 2 * MARGE, h - MARGE_HAUT - MARGE) / 11.2)));
    var ox = cale(l / 2), oy = cale(MARGE_HAUT + (h - MARGE_HAUT - MARGE) / 2);
    var e = epaisseur(1), axe = epaisseur(2);
    var f = Math.max(12, Math.min(24, Math.round(u * 0.3)));   // taille des nombres
    var bout = 5.5 * u, fleche = Math.max(6, Math.round(u * 0.14));
    var chemin = '', textes = '', i;

    function texte(x, y, ancre, contenu, classe) {
      // fond blanc : un trait qui toucherait le nombre se lirait comme un signe moins
      var large = contenu.length * f * 0.55, marge = f * 0.3;
      var gauche = ancre === 'middle' ? x - large / 2 : ancre === 'end' ? x - large : x;
      textes += '<rect x="' + (gauche - marge) + '" y="' + (y - f * 0.85) + '" width="' + (large + 2 * marge)
        + '" height="' + f + '" fill="#fff"/>';
      textes += '<text x="' + x + '" y="' + y + '" text-anchor="' + ancre + '" font-size="' + f + '"'
        + (classe ? ' class="' + classe + '"' : '') + '>' + contenu + '</text>';
    }

    for (i = -5; i <= 5; i++) {
      chemin += verticale(ox + i * u, oy - 5 * u, oy + 5 * u + e, e);
      chemin += horizontale(oy + i * u, ox - 5 * u, ox + 5 * u + e, e);
      if (i !== 0) {
        var nombre = (i < 0 ? '−' : '') + Math.abs(i);
        texte(ox + i * u, oy + Math.round(f * 1.15), 'middle', nombre);
        texte(ox - Math.round(f * 0.45), oy - i * u + Math.round(f * 0.35), 'end', nombre);
      }
    }
    texte(ox - Math.round(f * 0.45), oy + Math.round(f * 1.15), 'end', 'O');
    texte(ox + bout, oy - Math.round(f * 0.5), 'end', 'x', 'nom-axe');
    texte(ox + Math.round(f * 0.6), oy - bout + Math.round(f * 0.7), 'start', 'y', 'nom-axe');
    var pointes = 'M' + (ox + bout + fleche) + ' ' + oy + 'l' + (-2 * fleche) + ' ' + (-fleche) + 'v' + (2 * fleche) + 'z'
      + 'M' + ox + ' ' + (oy - bout - fleche) + 'l' + (-fleche) + ' ' + (2 * fleche) + 'h' + (2 * fleche) + 'z';
    chemin += horizontale(oy, ox - bout, ox + bout, axe) + verticale(ox, oy - bout, oy + bout, axe);
    return dessinTraits(chemin) + '<path d="' + pointes + '" fill="#000"/>' + textes;
  }

  function dessiner() {
    if (!fond) { tableau.innerHTML = ''; return; }
    ppx = window.devicePixelRatio || 1;
    var gauche = cale(window.innerWidth * reglage.partage);   // la zone elle-même démarre sur un pixel de l'écran
    var l = window.innerWidth - gauche, h = window.innerHeight;
    tableau.style.left = gauche + 'px';
    tableau.innerHTML = '<svg width="' + l + '" height="' + h + '" aria-hidden="true">'
      + (fond === 'repere' ? dessinRepere(l, h) : dessinQuadrillage(l, h)) + '</svg>';
  }

  function changerFond(nouveau) {
    fond = fond === nouveau ? null : nouveau;
    dessiner();
    libeller();
  }

  function changerCarreau(sens) {
    reglage.carreau = borneCarreau(reglage.carreau + sens * CARREAU_PAS);
    dessiner();
    libeller();
    retenir();
  }

  function placerTrait() {
    racine.style.setProperty('--partage', reglage.partage);
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
    preparerSuccinct();
    racine.classList.toggle('presentateur-succinct', reglage.succinct);
    racine.setAttribute('data-theme', 'light');   // noir sur blanc, comme la feuille
    agrandir();
    window.scrollTo(0, 0);
    if (racine.requestFullscreen) {
      racine.requestFullscreen().catch(function () {});   // refusé : le mode reste utilisable
    }
  }

  function quitter() {
    if (!avant) return;
    if (change) { location.reload(); return; }   // partie changée sur place : la page entière, avec ses scripts
    racine.classList.remove('presentateur', 'presentateur-demi', 'presentateur-succinct');
    if (avant.theme === null) racine.removeAttribute('data-theme');
    else racine.setAttribute('data-theme', avant.theme);
    agrandir();
    page.querySelectorAll('details').forEach(function (d) {
      d.open = avant.ouverts.indexOf(d) >= 0;
    });
    if (document.fullscreenElement) document.exitFullscreen();
    window.scrollTo(0, avant.y);
    avant = null;
    fond = null;
    if (champExo) { champExo.value = ''; champExo.classList.remove('erreur'); }
    dessiner();
    libeller();
    boutons.classList.remove('ouvert');
  }

  var ouvrir = document.createElement('button');
  ouvrir.type = 'button';
  ouvrir.className = 'presentateur-entrer';
  ouvrir.textContent = 'Mode présentateur';
  ouvrir.title = 'Projeter cette page en classe : plein écran, corrections repliées';
  ouvrir.onclick = entrer;
  surTitre.appendChild(ouvrir);

  var tableau = document.createElement('div');
  tableau.className = 'presentateur-tableau';

  var trait = document.createElement('div');
  trait.className = 'presentateur-trait';
  trait.title = 'Déplacer pour agrandir ou réduire la zone blanche';

  var boutons = document.createElement('div');
  boutons.className = 'presentateur-boutons';
  var menu = document.createElement('div');
  menu.className = 'presentateur-menu';

  function ligne() {
    var d = document.createElement('div');
    menu.appendChild(d);
    return d;
  }

  function bouton(parent, texte, titre, action) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = texte;
    b.title = titre;
    b.onclick = action;
    parent.appendChild(b);
    return b;
  }

  // page d'exercices : aller à l'exercice n, avec une marge au-dessus (haut de l'image souvent coupé)
  var champExo = null;
  var exos = page.querySelectorAll('section.exo[id^="exercice-"]');
  if (pageExercices && exos.length) {
    var allerExo = document.createElement('form');
    var titreExo = document.createElement('label');
    titreExo.textContent = 'Exercice';
    champExo = document.createElement('input');
    champExo.type = 'number';
    champExo.min = 1;
    champExo.title = 'Numéro de l’exercice à afficher';
    titreExo.appendChild(champExo);
    allerExo.appendChild(titreExo);
    bouton(allerExo, 'Aller', 'Afficher cet exercice en haut de l’écran', function () {});
    allerExo.lastChild.type = 'submit';
    allerExo.onsubmit = function (e) {
      e.preventDefault();
      var cible = champExo.value && document.getElementById('exercice-' + champExo.value);
      champExo.classList.toggle('erreur', !cible);
      if (!cible) return;
      cible.scrollIntoView({block: 'start', behavior: 'instant'});
      window.scrollBy({top: -30, behavior: 'instant'});
      champExo.blur();
      boutons.classList.remove('ouvert');
    };
    champExo.oninput = function () { champExo.classList.remove('erreur'); };
    ligne().appendChild(allerExo);
  }

  // page de partie d'un cours : parties voisines, lues dans la navigation de la page
  function voisine(classe, mot) {
    var a = page.querySelector('nav.parties a.' + classe);
    return a && a.querySelector('span') && a.querySelector('span').textContent.indexOf(mot) >= 0 ? a.href : null;
  }
  var enChargement = false;
  function changerPartie(adresse) {
    if (!adresse || enChargement) return;
    enChargement = true;
    boutons.classList.remove('ouvert');
    fetch(adresse).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (texte) {
      var doc = new DOMParser().parseFromString(texte, 'text/html');
      var neuf = doc.querySelector('main.lecture');
      if (!neuf) throw new Error('page sans contenu');
      page.innerHTML = neuf.innerHTML;
      page.querySelectorAll('details').forEach(function (d) { d.open = false; });
      document.title = doc.title;
      history.pushState(null, '', adresse);
      change = true;
      window.scrollTo(0, 0);
      majParties();
      preparerSuccinct();
      libeller();
    }).catch(function () {
      location.href = adresse;   // hors ligne ou page locale : changement de page ordinaire
    }).then(function () { enChargement = false; });
  }
  var ligneParties = null, precedente = null, suivante = null;
  if (!pageExercices && page.querySelector('nav.parties')) {
    ligneParties = ligne();
    precedente = bouton(ligneParties, '← Partie précédente', 'Afficher la partie précédente du cours',
      function () { changerPartie(voisine('prec', 'précédente')); });
    suivante = bouton(ligneParties, 'Partie suivante →', 'Afficher la partie suivante du cours',
      function () { changerPartie(voisine('suiv', 'suivante')); });
  }
  function majParties() {
    if (!ligneParties) return;
    precedente.hidden = !voisine('prec', 'précédente');
    suivante.hidden = !voisine('suiv', 'suivante');
    ligneParties.hidden = precedente.hidden && suivante.hidden;
  }
  majParties();
  // retour arrière du navigateur après un changement sur place : la page de l'adresse affichée
  window.addEventListener('popstate', function () { if (change) location.reload(); });

  var ligneTaille = ligne();
  var moins = bouton(ligneTaille, 'A−', 'Réduire la taille du texte', function () { zoomer(-1); });
  var plus = bouton(ligneTaille, 'A+', 'Agrandir la taille du texte', function () { zoomer(1); });
  var succinct = bouton(menu, '', '', basculerSuccinct);
  var largeur = bouton(menu, '', '', basculer);
  var quadrillage = bouton(menu, 'Quadrillage', 'Afficher ou retirer le quadrillage de la zone blanche',
    function () { changerFond('quadrillage'); });
  var ligneCarreaux = ligne();
  var carreauMoins = bouton(ligneCarreaux, 'Carreaux −', 'Réduire les carreaux', function () { changerCarreau(-1); });
  var carreauPlus = bouton(ligneCarreaux, 'Carreaux +', 'Agrandir les carreaux', function () { changerCarreau(1); });
  var repere = bouton(menu, 'Repère', 'Afficher ou retirer le repère de la zone blanche',
    function () { changerFond('repere'); });
  bouton(menu, 'Quitter', 'Quitter le mode présentateur', quitter);
  boutons.appendChild(menu);

  var icone = bouton(boutons, '☰', 'Menu du mode présentateur', function () {
    boutons.classList.toggle('ouvert');   // clic ou doigt, sans survol possible
  });
  icone.className = 'presentateur-icone';
  libeller();
  placerTrait();

  document.body.appendChild(tableau);
  document.body.appendChild(trait);
  document.body.appendChild(boutons);

  trait.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    trait.setPointerCapture(e.pointerId);
  });
  trait.addEventListener('pointermove', function (e) {
    if (!trait.hasPointerCapture(e.pointerId)) return;
    garderPassage(function () {
      reglage.partage = bornePartage(e.clientX / window.innerWidth);
      placerTrait();
    });
    dessiner();
  });
  trait.addEventListener('lostpointercapture', retenir);

  document.addEventListener('click', function (e) {
    if (!boutons.contains(e.target)) boutons.classList.remove('ouvert');
  });
  document.addEventListener('fullscreenchange', agrandir);
  window.addEventListener('resize', dessiner);
  // Échap sort d'abord du plein écran (navigateur) ; une seconde fois, du mode présentateur
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && avant && !document.fullscreenElement) quitter();
  });
})();
