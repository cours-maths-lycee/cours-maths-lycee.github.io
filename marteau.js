/* Bouton « exercice fait » : un marteau aplatit un cercle en carré ∎.
   Fin du corrigé : <button type="button" class="marteau" data-exo="ID"></button>
   Titre de l'exercice (affichage seul) : <span class="marteau-etat" data-exo="ID"></span>
   Réglages facultatifs, avant le script :
     window.MARTEAU_CONFIG = {durees: {frappe: 150, …}, accelere: 0.5, texte: "Fait", reduit: false};
     window.MARTEAU_API = "https://script.google.com/…/exec" : total de tous les élèves
     (scripts/site/compteurs_google.gs) ; sans lui, nombre propre à l'appareil (démo).
   Mode élève (window.FDM_ELEVE, scripts/site/eleve.js) : « fait » = compté pour
   l'élève par le serveur, une seule fois par exercice ; une fois compté, le carré
   s'ouvre par la droite et le mot-code sort de la boîte (à recopier sur le cahier). */
(function () {
  'use strict';
  var CFG = window.MARTEAU_CONFIG || {};
  // durées en ms (version complète ; × accelere quand l'exercice a déjà été fait)
  var DUREES = Object.assign({
    armer: 120, frappe: 150, impact: 110, remontee: 190,
    rotation: 260, remplissage: 320, etincelles: 320, pop: 300, plusun: 700,
    ouverture: 380, defilement: 650
  }, CFG.durees);
  var ACCELERE = CFG.accelere || 0.5;
  var API = window.MARTEAU_API || null;
  var CLE = 'fdm-marteau:v1:';

  // ---------- données : lireCompteur(id), incrementer(id) ----------
  var memoire = {}, totaux = {};
  function eleve() { return window.FDM_ELEVE; }
  function personnel(id) {
    if (eleve()) return eleve().fait(id) ? 1 : 0;
    var n = memoire[id] || 0;
    try { var v = parseInt(localStorage.getItem(CLE + id), 10); if (v > n) n = v; } catch (e) {}
    return n;
  }
  function ecrire(id, n) {
    memoire[id] = n;
    try { localStorage.setItem(CLE + id, String(n)); } catch (e) {}
  }
  // jeton tiré au hasard, propre au navigateur : le serveur ne compte qu'un clic
  // par exercice et par jeton toutes les 10 minutes (il ne l'enregistre pas)
  var jeton;
  function lireJeton() {
    if (jeton) return jeton;
    try { jeton = localStorage.getItem(CLE + 'jeton'); } catch (e) {}
    if (!jeton) {
      jeton = Math.random().toString(36).slice(2) + Date.now().toString(36);
      try { localStorage.setItem(CLE + 'jeton', jeton); } catch (e) {}
    }
    return jeton;
  }
  var charge = false;
  var Donnees = {
    // nombre affiché : total de tous les élèves (serveur, scripts/site/compteurs_google.gs) ;
    // sans serveur (démo), le nombre de l'appareil ; null tant que le serveur n'a pas répondu
    lireCompteur: function (id) {
      if (!API) return personnel(id);
      return charge ? totaux[id] || 0 : null;
    },
    personnel: personnel,
    incrementer: function (id) {
      var n = personnel(id) + 1;
      ecrire(id, n);
      if (API) {
        // même règle que le serveur : un clic compté par exercice toutes les 10 minutes
        var maintenant = Date.now(), dernier = 0;
        try { dernier = +localStorage.getItem(CLE + 't:' + id) || 0; } catch (e) {}
        if (maintenant - dernier < 600000) return n;
        try { localStorage.setItem(CLE + 't:' + id, String(maintenant)); } catch (e) {}
        if (charge) totaux[id] = (totaux[id] || 0) + 1;
        try {
          var corps = new URLSearchParams({ id: id, jeton: lireJeton() });
          fetch(API, { method: 'POST', body: corps, keepalive: true }).catch(function () {});
        } catch (e) {}
      }
      return n;
    },
    chargerTotaux: function (ids) {
      if (!API || !ids.length) return Promise.resolve();
      return fetch(API)
        .then(function (r) { return r.ok ? r.json() : {}; })
        .then(function (j) {
          if (!j || !j.ids) return;
          for (var id in j.ids) if (typeof j.ids[id] === 'number') totaux[id] = j.ids[id];
          charge = true;
        })
        .catch(function () {});
    }
  };

  // ---------- géométrie (viewBox 0 0 64 64) ----------
  var s = 9, k = 0.5523 * s;
  function L(a, b, t) { return a + (b - a) * t; }
  function rot(p, i) { for (var j = 0; j < i; j++) p = [-p[1], p[0]]; return p; }
  function chemin(f) {
    var d = 'M' + (-s) + ' ' + (-s);
    for (var i = 0; i < 4; i++) {
      var t = f[i];
      var p1 = rot([L(-s + k, -s + 2 * s / 3, t), L(-s - k, -s, t)], i);
      var p2 = rot([L(s - k, s - 2 * s / 3, t), L(-s - k, -s, t)], i);
      var b = rot([s, -s], i);
      d += ' C' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2) + ' ' + p2[0].toFixed(2) + ' ' +
        p2[1].toFixed(2) + ' ' + b[0] + ' ' + b[1];
    }
    return d + 'Z';
  }
  var SVG = '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
    '<g class="mt-etincelles"><path d="M20 30L15 27M19 34L14 35M44 30L49 27M45 34L50 35"/></g>' +
    '<g class="mt-forme"><path/></g>' +
    // boîte ouverte (mode élève) : carré de la forme finie, côté droit en porte
    '<g class="mt-boite"><rect class="mt-boite-fond" x="23" y="31" width="18" height="18"/>' +
    '<path class="mt-boite-corps" d="M41 31H23V49H41"/>' +
    '<path class="mt-porte" d="M41 31V49"/></g><g class="mt-outil">' +
    '<rect class="mt-manche" x="38" y="24.6" width="22" height="3" rx="1.5"/>' +
    '<rect class="mt-tete" x="25" y="20" width="14" height="11" rx="2"/>' +
    '<rect class="mt-lisere" x="25" y="20" width="3" height="11" rx="1"/></g></svg>';

  // état d'un dessin : a angle du marteau, f aplatissements, g rotation, sx sy écrasement
  function scene(svg, fait) {
    var forme = svg.querySelector('.mt-forme'), path = forme.firstChild;
    var outil = svg.querySelector('.mt-outil');
    var e = { a: 38, f: fait ? [1, 1, 1, 1] : [0, 0, 0, 0], g: 0, sx: 1, sy: 1, plein: fait,
      etincelles: svg.querySelector('.mt-etincelles') };
    e.dessiner = function () {
      path.setAttribute('d', chemin(e.f));
      forme.setAttribute('transform', 'translate(32 40) scale(' + e.sx.toFixed(3) + ' ' +
        e.sy.toFixed(3) + ') rotate(' + e.g.toFixed(2) + ')');
      outil.setAttribute('transform', 'rotate(' + e.a.toFixed(2) + ' 59 26)');
      svg.classList.toggle('mt-plein', e.plein);
    };
    e.dessiner();
    return e;
  }

  // ---------- interpolation ----------
  var easeIn = function (p) { return p * p * p; };
  var easeOut = function (p) { return 1 - Math.pow(1 - p, 3); };
  var easeInOut = function (p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  var lin = function (p) { return p; };
  function tween(duree, courbe, maj) {
    return new Promise(function (fin) {
      var t0 = performance.now();
      function pas(t) {
        var p = duree > 0 ? Math.min(1, (t - t0) / duree) : 1;
        maj(courbe(p), p);
        if (p < 1) requestAnimationFrame(pas); else fin();
      }
      requestAnimationFrame(pas);
    });
  }
  function anime(el, images, duree, courbe) {
    if (!el.animate) return Promise.resolve();
    var a = el.animate(images, { duration: duree, easing: courbe || 'ease-out' });
    return a.finished ? a.finished.catch(function () {}) : Promise.resolve();
  }

  // ---------- animation, dans l'icône du bouton (comme le prototype) ----------
  async function animer(btn, rapide) {
    var x = rapide ? ACCELERE : 1;
    function D(n) { return DUREES[n] * x; }
    var e = btn.mt, svg = btn.querySelector('svg');
    svg.style.setProperty('--mt-remplissage', D('remplissage') * 0.8 + 'ms');
    e.f = [0, 0, 0, 0]; e.plein = false; e.g = 0; e.a = 38; e.sx = e.sy = 1;
    e.dessiner();
    await tween(D('armer'), easeOut, function (v) { e.a = 38 + 8 * v; e.dessiner(); });
    for (var i = 0; i < 4; i++) {
      await tween(D('frappe'), easeIn, function (v) {
        e.a = 46 * (1 - v);
        if (v > 0.72) e.f[i] = (v - 0.72) / 0.28;
        e.dessiner();
      });
      e.f[i] = 1;
      anime(e.etincelles, [{ opacity: 1 }, { opacity: 0 }], D('etincelles'), 'ease-out');
      await tween(D('impact'), lin, function (v) {
        var q = Math.sin(Math.PI * v);
        e.sx = 1 + 0.07 * q; e.sy = 1 - 0.09 * q; e.dessiner();
      });
      var repos = i < 3 ? 46 : 38;
      await tween(D('remontee'), easeOut, function (v) { e.a = repos * v; e.dessiner(); });
      if (i < 3) {
        await tween(D('rotation'), easeInOut, function (v) { e.g = -90 * (i + v); e.dessiner(); });
      }
    }
    e.plein = true;
    await tween(D('remplissage'), easeOut, function (v) {
      e.sx = e.sy = 1 + 0.18 * Math.sin(Math.PI * v); e.dessiner();
    });
  }

  // ---------- affichage ----------
  var annonce;
  function annoncer(texte) {
    if (!annonce) {
      annonce = document.createElement('div');
      annonce.className = 'marteau-annonce';
      annonce.setAttribute('aria-live', 'polite');
      document.body.appendChild(annonce);
    }
    annonce.textContent = texte;
  }
  // message visible sous le bouton (mode élève)
  function message(btn, texte) {
    var m = btn.nextElementSibling;
    if (!m || !m.classList.contains('marteau-message')) {
      if (!texte) return;
      m = document.createElement('p');
      m.className = 'marteau-message';
      btn.after(m);
    }
    m.textContent = texte;
    if (texte) annoncer(texte);
  }
  // ---------- boîte ouverte et mot-code (mode élève) ----------
  var PORTE = -115;   // angle d'ouverture du côté droit, autour du coin haut droit
  function poserCode(btn, mot) {
    var c = btn.querySelector('.mt-code');
    if (!c) {
      c = document.createElement('span');
      c.className = 'mt-code';
      c.appendChild(document.createElement('span'));
      btn.querySelector('.mt-icone').after(c);
    }
    c.firstChild.textContent = 'code : ' + mot;
    return c;
  }
  function boite(btn, v) {
    var svg = btn.querySelector('svg');
    svg.querySelector('.mt-porte').setAttribute('transform', 'rotate(' + (PORTE * v).toFixed(1) + ' 41 31)');
    svg.querySelector('.mt-boite-fond').style.opacity = 1 - v;
    svg.querySelector('.mt-outil').style.opacity = 1 - v;
  }
  function boiteOuverte(btn, mot) {
    if (mot) {
      poserCode(btn, mot);
      boite(btn, 1);
      btn.classList.add('mt-ouvert');
    } else {
      btn.classList.remove('mt-ouvert');
      var c = btn.querySelector('.mt-code');
      if (c) c.remove();
      btn.querySelector('.mt-outil').style.opacity = '';
    }
  }
  async function ouvrirBoite(btn, mot) {
    var c = poserCode(btn, mot), texte = c.firstChild;
    texte.style.transform = 'translateX(-105%)';
    boite(btn, 0);
    btn.classList.add('mt-ouvert');
    await tween(DUREES.ouverture, easeOut, function (v) { boite(btn, v); });
    await anime(texte, [{ transform: 'translateX(-105%)' }, { transform: 'translateX(0)' }],
      DUREES.defilement, 'cubic-bezier(.2,.75,.3,1)');
    texte.style.transform = '';
  }

  function elements(id) {
    return [].filter.call(document.querySelectorAll('.marteau[data-exo], .marteau-etat[data-exo]'),
      function (el) { return el.dataset.exo === id && el.mt; });
  }
  function afficher(id, effet) {
    var n = Donnees.lireCompteur(id), fait = Donnees.personnel(id) > 0;
    elements(id).forEach(function (el) {
      var e = el.mt;
      e.f = fait ? [1, 1, 1, 1] : [0, 0, 0, 0]; e.plein = fait; e.g = 0; e.a = 38;
      e.dessiner();
      var nombre = el.querySelector('.mt-nombre');
      nombre.textContent = n === null ? '' : n;
      var total = n === null ? '' : (API ? ' ; fait ' + n + ' fois sur le site' : ' ; fait ' + n + ' fois');
      var mot = eleve() && fait ? eleve().mot(id) : '';
      if (el.tagName === 'BUTTON' && eleve()) {
        boiteOuverte(el, mot);
        el.setAttribute('aria-label', fait ? 'Exercice compté' + (mot ? ', code : ' + mot : '')
          : 'Marquer l’exercice comme fait et vérifié');
      } else if (el.tagName === 'BUTTON') {
        el.setAttribute('aria-label', (fait ? 'Exercice déjà fait, cliquer pour l’ajouter encore'
          : 'Marquer l’exercice comme fait') + total);
      } else {
        el.setAttribute('aria-label', (fait ? 'Exercice déjà fait' : 'Exercice pas encore fait') + total);
      }
      if (effet === 'pop') {
        anime(nombre, [{ transform: 'scale(1)' }, { transform: 'scale(1.4)' }, { transform: 'scale(1)' }],
          DUREES.pop);
        if (el.tagName === 'BUTTON') {
          var plus = document.createElement('span');
          plus.className = 'marteau-plusun';
          plus.textContent = '+1';
          el.appendChild(plus);
          anime(plus, [{ opacity: 1, transform: 'translateY(0)' },
            { opacity: 0, transform: 'translateY(-1.6em)' }], DUREES.plusun).then(function () {
            plus.remove();
          });
        }
      } else if (effet === 'fondu') {
        anime(el.querySelector('svg'), [{ opacity: 0.2 }, { opacity: 1 }], 300);
      }
    });
  }

  // l'animation, petite et déclenchée par l'élève, se joue aussi quand le système demande
  // de réduire les animations (Windows sans animations) ; MARTEAU_CONFIG.reduit: true la retire
  function reduit() {
    return CFG.reduit === true && window.matchMedia &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function deja(mot) {
    return 'Exercice déjà compté' + (mot ? ' (code : ' + mot + ')' : '') + ' : choisissez-en un autre.';
  }
  async function clicEleve(btn, E) {
    var id = btn.dataset.exo, sobre = reduit();
    if (E.fait(id)) {
      message(btn, deja(E.mot(id)));
      return;
    }
    var envoi = E.envoyerFait(id);
    try {
      if (sobre) await new Promise(function (r) { setTimeout(r, 300); });
      else await animer(btn, false);
    } catch (e) {}
    var j = await envoi;
    if (j.ok && j.compte) {
      if (typeof j.total === 'number') totaux[id] = j.total;
      if (j.mot && !sobre) {
        try { await ouvrirBoite(btn, j.mot); } catch (e) {}
      }
      afficher(id);
      message(btn, 'Exercice compté : vous en êtes à ' + j.nombre + '.' +
        (j.mot ? ' Recopiez le code « ' + j.mot + ' » sur votre cahier, à côté du numéro de l’exercice.'
          : ''));
    } else {
      afficher(id);
      if (j.deja) message(btn, deja(j.mot));
      else if (j.erreur === 'code inconnu') message(btn, 'Lien personnel non reconnu : exercice non compté.');
      else message(btn, 'Pas de connexion au serveur : exercice non compté, réessayez dans un moment.');
    }
  }
  async function clic(btn) {
    if (btn.mtEnCours) return;
    btn.mtEnCours = true;
    if (eleve()) {
      try { await clicEleve(btn, eleve()); } finally { btn.mtEnCours = false; }
      return;
    }
    var id = btn.dataset.exo, sobre = reduit();
    try {
      if (sobre) await new Promise(function (r) { setTimeout(r, 300); }); // pas de double compte
      else await animer(btn, Donnees.personnel(id) > 0);
    } catch (e) {
      // une animation interrompue ne doit pas empêcher de compter
    } finally {
      var n = Donnees.incrementer(id);
      afficher(id, sobre ? 'fondu' : 'pop');
      annoncer('Exercice compté comme fait.');
      btn.mtEnCours = false;
    }
  }

  var tous = [];
  document.addEventListener('fdm-eleve', function () { tous.forEach(function (id) { afficher(id); }); });
  function init(racine) {
    var ids = [];
    (racine || document).querySelectorAll('.marteau[data-exo], .marteau-etat[data-exo]')
      .forEach(function (el) {
        if (el.mt) return;
        var bouton = el.tagName === 'BUTTON';
        var texte = el.dataset.texte || (bouton && CFG.texte) || '';
        el.innerHTML = '<span class="mt-icone">' + SVG + '</span><span class="mt-nombre">0</span>' +
          (bouton && texte ? '<span class="mt-texte">' + texte + '</span>' : '');
        el.mt = scene(el.querySelector('svg'), false);
        if (bouton) el.addEventListener('click', function () { clic(el); });
        else el.setAttribute('role', 'img');
        if (ids.indexOf(el.dataset.exo) < 0) ids.push(el.dataset.exo);
        if (tous.indexOf(el.dataset.exo) < 0) tous.push(el.dataset.exo);
      });
    ids.forEach(function (id) { afficher(id); });
    Donnees.chargerTotaux(ids).then(function () { ids.forEach(function (id) { afficher(id); }); });
  }

  window.Marteau = { init: init, donnees: Donnees, DUREES: DUREES };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();
})();
