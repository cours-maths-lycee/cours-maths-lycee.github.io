/* Page « Cartes flash » du site (cartes-flash.html, scripts/site_cartes.py) : choix élève /
   enseignant.
   Élève : chapitres qui ont des cartes (liens vers leur page cartes.html) ; code d'une série
   en classe, tapé à la main si le QR code ne passe pas (?serie=CODE au serveur : réglages,
   puis cartes.html#serie=…).
   Enseignant (tableau de bord à projeter) : le professeur choisit chapitre, parties, nombre
   de questions et temps ; le serveur (compteurs_google.gs, action=ouvrir) rend un code
   public et un secret, gardé dans ce navigateur, qui seul permet de lire les résultats
   (?serie=CODE&secret=…, toutes les 4 secondes). Affichage : QR code (qrcode.js, licence MIT)
   et code ; élèves qui ont commencé, qui ont terminé ; moyenne de la classe (pas de score
   individuel à l'écran). Prénoms : fichier tableau-de-bord.json (python scripts/eleves.py
   tableau), chargé depuis l'ordinateur du professeur et gardé dans ce navigateur, jamais
   envoyé ; élèves sans lien personnel : « Élève 1 », « Élève 2 »… dans l'ordre d'arrivée. */
(function () {
  'use strict';
  var R = document.getElementById('cf');
  if (!R) return;
  function $(id) { return document.getElementById('cf-' + id); }
  var API = (window.FDM_ELEVE_CONFIG || {}).api || '';
  var DONNEES = JSON.parse($('donnees').textContent);
  var ROMAINS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII',
                 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
  function lire(cle) { try { return JSON.parse(localStorage.getItem(cle)); } catch (e) { return null; } }
  function ecrire(cle, v) {
    try { if (v === null) localStorage.removeItem(cle); else localStorage.setItem(cle, JSON.stringify(v)); } catch (e) {}
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; });
  }
  function mesurer(nom, d) { if (window.umTrack) window.umTrack(nom, d || {}); }

  // ---------- choix élève / enseignant ----------
  var boutons = R.querySelectorAll('.commutateur button');
  function volet(nom) {
    boutons.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.volet === nom ? 'true' : 'false'); });
    $('eleve').hidden = nom !== 'eleve';
    $('prof').hidden = nom !== 'prof';
    ecrire('fdm-cartes-flash:volet', nom);
  }
  boutons.forEach(function (b) { b.onclick = function () { volet(b.dataset.volet); }; });
  volet(lire('fdm-cartes-flash:volet') === 'prof' ? 'prof' : 'eleve');

  // ---------- élève : code d'une série en classe ----------
  function rejoindre(e) {
    e.preventDefault();
    var code = $('code').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    var msg = $('code-msg');
    if (code.length !== 4) { msg.textContent = 'Le code a 4 caractères.'; return; }
    if (!API) { msg.textContent = 'Les séries en classe ne sont pas disponibles sur cette version du site.'; return; }
    msg.textContent = 'Recherche de la série…';
    fetch(API + '?serie=' + encodeURIComponent(code)).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) { msg.textContent = 'Série introuvable : vérifie le code (une série dure 6 heures).'; return; }
      location.href = j.page + '/cartes.html#serie=' + code + '&parties=' + j.parties + '&n=' + j.n + '&t=' + j.t;
    }).catch(function () { msg.textContent = 'Pas de connexion au serveur.'; });
  }
  $('rejoindre').onsubmit = rejoindre;

  // ---------- enseignant : préparation ----------
  var choixChap = $('chapitre');
  function chapitre() { return DONNEES.chapitres[+choixChap.value] || null; }
  function majParties() {
    var c = chapitre(), z = $('parties');
    z.innerHTML = '';
    if (!c) return;
    c.parties.forEach(function (p) {
      var li = document.createElement('li');
      li.innerHTML = '<input type="checkbox" id="cf-p' + p[0] + '" value="' + p[0] + '" checked>' +
        '<label for="cf-p' + p[0] + '">' + ROMAINS[p[0]] + ' — ' + esc(p[1]) + '</label>';
      z.appendChild(li);
    });
  }
  choixChap.onchange = majParties;
  majParties();
  $('tout').onclick = function () { $('parties').querySelectorAll('input').forEach(function (x) { x.checked = true; }); };
  $('rien').onclick = function () { $('parties').querySelectorAll('input').forEach(function (x) { x.checked = false; }); };
  function choix(nom) { var x = R.querySelector('input[name="cf-' + nom + '"]:checked'); return x ? x.value : ''; }

  // ---------- fichier des élèves (prénoms), gardé dans ce navigateur ----------
  var ELEVES = lire('fdm-cartes-flash:eleves') || null;
  function majFichier() {
    var n = ELEVES ? ELEVES.eleves.length : 0;
    $('fichier-etat').textContent = n ? n + ' élève' + (n > 1 ? 's' : '') + ' chargé' + (n > 1 ? 's' : '') +
      (ELEVES.classes && ELEVES.classes.length ? ' (' + ELEVES.classes.join(', ') + ')' : '') + ', sur cet ordinateur seulement.'
      : 'Aucun fichier : les élèves apparaîtront comme « Élève 1 », « Élève 2 »…';
    $('oublier').hidden = !n;
  }
  $('fichier').onchange = function () {
    var f = this.files[0];
    if (!f) return;
    var lecteur = new FileReader();
    lecteur.onload = function () {
      try {
        var d = JSON.parse(lecteur.result);
        if (!d || !Array.isArray(d.eleves)) throw new Error();
        ELEVES = {eleves: d.eleves.filter(function (e) { return e && e.code && e.prenom; }).map(function (e) {
          return {code: String(e.code), prenom: String(e.prenom), initiale: String(e.initiale || ''), classe: String(e.classe || '')};
        })};
        ELEVES.classes = ELEVES.eleves.map(function (e) { return e.classe; })
          .filter(function (c, i, a) { return c && a.indexOf(c) === i; }).sort();
        ecrire('fdm-cartes-flash:eleves', ELEVES);
      } catch (e) { $('fichier-etat').textContent = 'Fichier illisible : prendre tableau-de-bord.json.'; return; }
      majFichier();
    };
    lecteur.readAsText(f);
    this.value = '';
  };
  $('oublier').onclick = function () { ELEVES = null; ecrire('fdm-cartes-flash:eleves', null); majFichier(); };
  majFichier();

  // ---------- enseignant : série en cours ----------
  var SERIE = lire('fdm-cartes-flash:serie'), tic = null;
  function lien(s) {
    return new URL(s.page + '/cartes.html', location.href).href.split('#')[0] +
      '#serie=' + s.code + '&parties=' + s.parties + '&n=' + s.n + '&t=' + s.t;
  }
  $('lancer').onclick = function () {
    var c = chapitre(), msg = $('lancer-msg');
    var parties = Array.prototype.map.call($('parties').querySelectorAll('input:checked'), function (x) { return x.value; });
    if (!c) return;
    if (!parties.length) { msg.textContent = 'Choisir au moins une partie.'; return; }
    if (!API) { msg.textContent = 'Les séries en classe ne sont pas disponibles sur cette version du site.'; return; }
    msg.textContent = 'Ouverture de la série…';
    var reglages = {page: c.page, parties: parties.join(','), n: choix('n') || '5', t: choix('t') || '1'};
    fetch(API, {method: 'POST', body: new URLSearchParams({action: 'ouvrir', page: reglages.page,
                                                          parties: reglages.parties, n: reglages.n, t: reglages.t})})
      .then(function (r) { return r.json(); }).then(function (j) {
        if (!j.ok) { msg.textContent = 'Impossible d’ouvrir la série : ' + j.erreur + '.'; return; }
        msg.textContent = '';
        SERIE = {code: j.code, secret: j.secret, page: reglages.page, parties: reglages.parties,
                 n: +reglages.n, t: +reglages.t, titre: c.titre, niveau: c.niveau, debut: Date.now(),
                 toutes: parties.length === c.parties.length};
        ecrire('fdm-cartes-flash:serie', SERIE);
        mesurer('série en classe ouverte', {page: SERIE.page, questions: SERIE.n});
        afficherSerie();
      }).catch(function () { msg.textContent = 'Pas de connexion au serveur.'; });
  };

  function afficherSerie() {
    var actif = !!SERIE && Date.now() - SERIE.debut < 6 * 3600e3;
    if (!actif) { SERIE = null; ecrire('fdm-cartes-flash:serie', null); }
    $('preparer').hidden = actif;
    $('tableau').hidden = !actif;
    arreter();
    if (!actif) return;
    var parties = SERIE.parties.split(',').map(function (p) { return ROMAINS[+p]; }).join(', ');
    $('titre').textContent = SERIE.niveau + ' — ' + SERIE.titre;
    $('reglages').textContent = (SERIE.toutes ? 'Toutes les parties' : 'Parties ' + parties) + ' ; ' + SERIE.n + ' questions ; ' +
      (SERIE.t ? 'temps limité (' + SERIE.n + ' min)' : 'sans limite de temps') + '.';
    $('code-grand').textContent = SERIE.code;
    $('adresse').textContent = location.host + location.pathname.replace(/[^/]*$/, '') + 'cartes-flash.html';
    var qr = window.qrcode(0, 'M');
    qr.addData(lien(SERIE));
    qr.make();
    $('qr').innerHTML = qr.createSvgTag({cellSize: 6, margin: 24, scalable: true, alt: 'QR code de la série ' + SERIE.code});
    $('vue').innerHTML = '<p class="cf-attente">En attente des élèves…</p>';
    relever();
    tic = setInterval(function () { if (!document.hidden) relever(); }, 4000);
  }
  function arreter() { if (tic) { clearInterval(tic); tic = null; } }
  $('nouvelle').onclick = function () { SERIE = null; ecrire('fdm-cartes-flash:serie', null); afficherSerie(); };
  $('qr-cacher').onclick = function () {
    var z = $('acces'), cache = !z.hidden;
    z.hidden = cache;
    this.textContent = cache ? 'Montrer le QR code' : 'Masquer le QR code';
  };
  $('plein').onclick = function () {
    var z = $('tableau');
    if (document.fullscreenElement) document.exitFullscreen();
    else if (z.requestFullscreen) z.requestFullscreen();
  };

  // noms : prénom (avec l'initiale du nom si deux prénoms identiques dans le fichier)
  function nomEleve(code) {
    if (!ELEVES) return null;
    var e = ELEVES.eleves.filter(function (x) { return x.code === code; })[0];
    if (!e) return null;
    var memes = ELEVES.eleves.filter(function (x) { return x.prenom === e.prenom; }).length;
    return e.prenom + (memes > 1 && e.initiale ? ' ' + e.initiale + '.' : '');
  }
  function relever() {
    if (!SERIE) return;
    fetch(API + '?serie=' + encodeURIComponent(SERIE.code) + '&secret=' + encodeURIComponent(SERIE.secret))
      .then(function (r) { return r.json(); }).then(function (j) {
        if (!j.ok) {
          $('vue').innerHTML = '<p class="cf-attente">' + (j.erreur === 'série inconnue ou terminée'
            ? 'Série terminée (une série dure 6 heures).' : 'Erreur : ' + esc(j.erreur)) + '</p>';
          arreter();
          return;
        }
        montrer(j.eleves || []);
      }).catch(function () { $('etat').textContent = 'Connexion perdue, nouvel essai dans quelques secondes…'; });
  }
  function montrer(eleves) {
    $('etat').textContent = '';
    eleves.sort(function (a, b) { return a.debut - b.debut; });
    var anonymes = {}, n = 0;
    eleves.forEach(function (e) {
      e.nom = e.eleve ? nomEleve(e.eleve) : null;
      if (!e.nom) {
        var cle = e.eleve || e.anonyme;
        if (!anonymes[cle]) anonymes[cle] = ++n;
        e.nom = 'Élève ' + anonymes[cle];
      }
    });
    var finis = eleves.filter(function (e) { return e.etat === 'finie'; })
      .sort(function (a, b) { return a.fin - b.fin; });
    var enCours = eleves.filter(function (e) { return e.etat !== 'finie'; });
    var q = 0, ok = 0;
    finis.forEach(function (e) { q += e.questions; ok += e.justes; });
    var h = '<div class="cf-compteurs"><div><strong>' + finis.length + '</strong> ' +
      (finis.length > 1 ? 'ont terminé' : 'a terminé') + '</div><div><strong>' + enCours.length + '</strong> en cours</div>' +
      (q ? '<div><strong>' + Math.round(100 * ok / q) + '&nbsp;%</strong> de réussite de la classe</div>' : '') + '</div>';
    if (finis.length) h += '<h3>Ont terminé</h3><ul class="cf-noms">' + finis.map(function (e) {
      return '<li class="fini">' + esc(e.nom) + '</li>'; }).join('') + '</ul>';
    if (enCours.length) h += '<h3>En cours</h3><ul class="cf-noms">' + enCours.map(function (e) {
      return '<li>' + esc(e.nom) + '</li>'; }).join('') + '</ul>';
    if (!eleves.length) h = '<p class="cf-attente">En attente des élèves…</p>';
    $('vue').innerHTML = h;
  }
  afficherSerie();
})();
