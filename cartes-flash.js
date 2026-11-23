/* Page « Cartes flash » du site (cartes-flash.html, scripts/site_cartes.py) : choix élève /
   enseignant.
   Élève : chapitres qui ont des cartes (liens vers leur page cartes.html) ; code d'une série
   en classe, tapé à la main si le QR code ne passe pas (?serie=CODE au serveur : réglages,
   puis cartes.html#serie=…).
   Enseignant (tableau de bord à projeter) : le professeur choisit chapitre, parties, nombre
   de questions et temps ; le tableau de bord tire la série (cartes lues dans la page
   cartes.html du chapitre), la même pour toute la classe : genres par tiers, niveaux
   progressifs (profil de cartes.js), parties mélangées, une part de hasard ; aperçu des
   questions replié, « Autre tirage ». Le serveur (compteurs_google.gs, action=ouvrir) rend
   un code public et un secret, gardé dans ce navigateur, qui seul permet de lire les
   résultats (?serie=CODE&secret=…, toutes les 4 secondes). Affichage : QR code (qrcode.js,
   licence MIT ; le lien porte la liste des cartes) et code ; élèves qui ont commencé, qui
   ont terminé ; moyenne de la classe (pas de score individuel à l'écran) ; les questions
   de la série, sans les réponses, pour un élève sans téléphone (« Masquer les questions »,
   choix gardé dans ce navigateur).
   « Terminer la série » (deux clics ; action=fermer : plus de nouvel élève, les résultats
   en cours arrivent encore) : débriefing à projeter, chaque question avec son pourcentage
   de réussite, dans l'ordre de la série ou les moins réussies d'abord, réponse repliée
   (« Voir la réponse ») ; « Actualiser » pour les derniers résultats. Prénoms : fichier tableau-de-bord.json (python scripts/eleves.py
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
      if (!j.ok) {
        msg.textContent = j.erreur === 'série terminée' ? 'Cette série est terminée.'
          : 'Série introuvable : vérifie le code (une série dure 6 heures).';
        return;
      }
      location.href = j.page + '/cartes.html#serie=' + code + '&parties=' + j.parties + '&n=' + j.n + '&t=' + j.t +
        (j.cartes ? '&cartes=' + j.cartes : '');
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
  choixChap.onchange = function () { majParties(); majApercu(); };
  majParties();
  $('tout').onclick = function () { $('parties').querySelectorAll('input').forEach(function (x) { x.checked = true; }); majApercu(); };
  $('rien').onclick = function () { $('parties').querySelectorAll('input').forEach(function (x) { x.checked = false; }); majApercu(); };
  $('parties').onchange = majApercu;
  R.querySelectorAll('input[name="cf-n"]').forEach(function (x) { x.onchange = majApercu; });
  function choix(nom) { var x = R.querySelector('input[name="cf-' + nom + '"]:checked'); return x ? x.value : ''; }
  function partiesCochees() {
    return Array.prototype.map.call($('parties').querySelectorAll('input:checked'), function (x) { return +x.value; });
  }

  // ---------- cartes d'un chapitre (lues dans sa page cartes.html) ----------
  var GENRES = {cours: 'Cours', methode: 'Méthode', exo: 'Exercice'};
  var CARTES_PAGE = {};   // page -> promesse de [{id, suf, p, g, n, q, r}]
  function suffixe(id) { return id.slice(id.lastIndexOf('-') + 1); }
  function chargerCartes(page) {
    if (CARTES_PAGE[page]) return CARTES_PAGE[page];
    var adresse = new URL(page + '/cartes.html', location.href);
    CARTES_PAGE[page] = fetch(adresse.href).then(function (r) {
      if (!r.ok) throw new Error('page des cartes introuvable');
      return r.text();
    }).then(function (t) {
      var doc = new DOMParser().parseFromString(t, 'text/html');
      doc.querySelectorAll('#fc-cartes img[src]').forEach(function (im) {   // figures : fig/… à côté de la page
        im.setAttribute('src', new URL(im.getAttribute('src'), adresse).href);
      });
      return Array.prototype.map.call(doc.querySelectorAll('#fc-cartes article'), function (a) {
        return {id: a.dataset.id, suf: suffixe(a.dataset.id), p: +a.dataset.p, g: a.dataset.g, n: +a.dataset.n,
                q: a.querySelector('.q').innerHTML, r: a.querySelector('.r').innerHTML};
      });
    });
    CARTES_PAGE[page].catch(function () { delete CARTES_PAGE[page]; });
    return CARTES_PAGE[page];
  }

  // ---------- tirage de la série commune (même esprit que cartes.js, sans historique) ----------
  var PROFIL10 = [1, 1, 1, 2, 2, 2, 3, 3, 4, 4];
  function tirage(cartes, parties, n) {
    var pool = cartes.filter(function (c) { return parties.indexOf(c.p) >= 0; });
    n = Math.min(n, pool.length);
    var o = ['cours', 'methode', 'exo'], q = {}, rang = Math.floor(Math.random() * 3);
    o.forEach(function (g) { q[g] = Math.floor(n / 3); });
    for (var k = 0; k < n - 3 * Math.floor(n / 3); k++) q[o[(rang + k) % 3]]++;
    var prises = {}, parPartie = {}, serie = [];
    for (var i = 0; i < n; i++) {
      var vise = PROFIL10[Math.min(9, Math.floor(i * 10 / n))], meilleure = null, mn = -1e9;
      pool.forEach(function (c) {
        if (prises[c.id]) return;
        var x = -1.5 * Math.abs(c.n - vise) + (q[c.g] > 0 ? 3 : -3) - 1.2 * (parPartie[c.p] || 0) + Math.random() * 1.2;
        if (x > mn) { mn = x; meilleure = c; }
      });
      prises[meilleure.id] = 1; q[meilleure.g]--; parPartie[meilleure.p] = (parPartie[meilleure.p] || 0) + 1;
      serie.push(meilleure);
    }
    return serie;
  }
  var TIRAGE = null;   // {page, parties, n, cartes: [...]}
  function majApercu() {
    var c = chapitre(), parties = partiesCochees(), n = +(choix('n') || 5), z = $('apercu');
    TIRAGE = null;
    if (!c || !parties.length) { z.innerHTML = ''; $('apercu-msg').textContent = ''; return; }
    var cle = c.page + '|' + parties.join(',') + '|' + n;
    $('apercu-msg').textContent = 'Tirage de la série…';
    chargerCartes(c.page).then(function (cartes) {
      if (cle !== chapitre().page + '|' + partiesCochees().join(',') + '|' + (+(choix('n') || 5))) return;   // réglages changés entre-temps
      var serie = tirage(cartes, parties, n);
      TIRAGE = {cle: cle, cartes: serie};
      z.innerHTML = serie.map(function (x) {
        return '<li><span class="cf-etiquette">' + (GENRES[x.g] || '') + ' · partie ' + ROMAINS[x.p] + ' · niveau ' + x.n +
          '</span><div class="cf-q-texte">' + x.q + '</div></li>';
      }).join('');
      $('apercu-msg').textContent = serie.length < n ? 'Seulement ' + serie.length + ' cartes dans ces parties.' : '';
    }).catch(function () { $('apercu-msg').textContent = 'Impossible de lire les cartes du chapitre.'; });
  }
  $('retirer').onclick = majApercu;

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
      '#serie=' + s.code + '&parties=' + s.parties + '&n=' + s.n + '&t=' + s.t +
      (s.cartes ? '&cartes=' + s.cartes.join(',') : '');
  }
  $('lancer').onclick = function () {
    var c = chapitre(), msg = $('lancer-msg');
    var parties = partiesCochees();
    if (!c) return;
    if (!parties.length) { msg.textContent = 'Choisir au moins une partie.'; return; }
    if (!API) { msg.textContent = 'Les séries en classe ne sont pas disponibles sur cette version du site.'; return; }
    var reglages = {page: c.page, parties: parties.join(','), n: choix('n') || '5', t: choix('t') || '1'};
    if (!TIRAGE || TIRAGE.cle !== c.page + '|' + reglages.parties + '|' + reglages.n) {
      msg.textContent = 'Tirage de la série en cours, réessayer dans un instant.';
      return;
    }
    var cartes = TIRAGE.cartes.map(function (x) { return x.suf; });
    if (!cartes.length) { msg.textContent = 'Aucune carte dans ces parties.'; return; }
    msg.textContent = 'Ouverture de la série…';
    fetch(API, {method: 'POST', body: new URLSearchParams({action: 'ouvrir', page: reglages.page,
                                                          parties: reglages.parties, n: reglages.n, t: reglages.t,
                                                          cartes: cartes.join(',')})})
      .then(function (r) { return r.json(); }).then(function (j) {
        if (!j.ok) { msg.textContent = 'Impossible d’ouvrir la série : ' + j.erreur + '.'; return; }
        msg.textContent = '';
        SERIE = {code: j.code, secret: j.secret, page: reglages.page, parties: reglages.parties,
                 n: cartes.length, t: +reglages.t, titre: c.titre, niveau: c.niveau, debut: Date.now(),
                 toutes: parties.length === c.parties.length, cartes: cartes, ferme: false};
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
    terminerArme(false);
    if (!actif) { majApercu(); return; }
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
    $('suivi').hidden = !!SERIE.ferme; $('debrief').hidden = !SERIE.ferme;
    $('terminer').hidden = !!SERIE.ferme; $('qr-cacher').hidden = !!SERIE.ferme;
    $('enonces-cacher').hidden = !!SERIE.ferme;
    if (SERIE.ferme) { debriefer(); return; }
    enonces();
    $('vue').innerHTML = '<p class="cf-attente">En attente des élèves…</p>';
    relever();
    tic = setInterval(function () { if (!document.hidden) relever(); }, 4000);
  }
  function arreter() { if (tic) { clearInterval(tic); tic = null; } }
  $('nouvelle').onclick = function () { SERIE = null; ecrire('fdm-cartes-flash:serie', null); afficherSerie(); };

  // ---------- terminer la série (deux clics, sans fenêtre de confirmation) ----------
  var arme = null;
  function terminerArme(oui) {
    if (arme) { clearTimeout(arme); arme = null; }
    $('terminer').textContent = oui ? 'Confirmer : terminer la série' : 'Terminer la série';
    $('terminer').classList.toggle('second', !oui);
    if (oui) arme = setTimeout(function () { terminerArme(false); }, 5000);
  }
  $('terminer').onclick = function () {
    if (!SERIE) return;
    if (!arme) { terminerArme(true); return; }
    terminerArme(false);
    $('etat').textContent = 'Fermeture de la série…';
    fetch(API, {method: 'POST', body: new URLSearchParams({action: 'fermer', serie: SERIE.code, secret: SERIE.secret})})
      .then(function (r) { return r.json(); }).then(function (j) {
        if (!j.ok && j.erreur !== 'série inconnue ou terminée') {
          $('etat').textContent = 'Impossible de terminer la série : ' + j.erreur + '.';
          return;
        }
        SERIE.ferme = true; ecrire('fdm-cartes-flash:serie', SERIE);
        mesurer('série en classe terminée', {page: SERIE.page, questions: SERIE.n});
        $('etat').textContent = '';
        afficherSerie();
      }).catch(function () { $('etat').textContent = 'Pas de connexion au serveur.'; });
  };

  // ---------- débriefing : chaque question, son pourcentage de réussite, réponse repliée ----------
  var ouvertes = {};
  function debriefer() {
    var z = $('questions');
    if (!SERIE.cartes) {
      $('debrief-resume').innerHTML = '';
      z.innerHTML = '<p class="cf-attente">Série lancée avant la série commune : pas de débriefing question par question.</p>';
      return;
    }
    $('debrief-msg').textContent = 'Chargement des résultats…';
    Promise.all([chargerCartes(SERIE.page),
                 fetch(API + '?serie=' + encodeURIComponent(SERIE.code) + '&secret=' + encodeURIComponent(SERIE.secret))
                   .then(function (r) { return r.json(); })])
      .then(function (t) { montrerDebrief(t[0], t[1]); })
      .catch(function () { $('debrief-msg').textContent = 'Pas de connexion au serveur ou cartes introuvables.'; });
  }
  function montrerDebrief(cartes, j) {
    if (!j.ok) {
      $('debrief-msg').textContent = j.erreur === 'série inconnue ou terminée'
        ? 'Les résultats de cette série ne sont plus sur le serveur (une série dure 6 heures).' : 'Erreur : ' + j.erreur;
      return;
    }
    $('debrief-msg').textContent = '';
    var parSuf = {};
    cartes.forEach(function (c) { parSuf[c.suf] = c; });
    var finis = (j.eleves || []).filter(function (e) { return e.etat === 'finie'; });
    var lignes = SERIE.cartes.map(function (suf, k) {
      var justes = 0, faux = 0, vides = 0;
      finis.forEach(function (e) {
        var x = (e.reponses || '').charAt(k);
        if (x === '1') justes++; else if (x === '0') faux++; else if (e.reponses) vides++;
      });
      return {k: k, c: parSuf[suf], justes: justes, faux: faux, vides: vides,
              taux: justes + faux ? justes / (justes + faux) : -1};
    });
    var q = 0, ok = 0;
    finis.forEach(function (e) { q += e.questions; ok += e.justes; });
    $('debrief-resume').innerHTML = '<div><strong>' + finis.length + '</strong> ' +
      (finis.length > 1 ? 'élèves ont terminé' : 'élève a terminé') + '</div>' +
      (q ? '<div><strong>' + Math.round(100 * ok / q) + '&nbsp;%</strong> de réussite de la classe</div>' : '');
    if (choix('ordre') === 'taux') lignes.sort(function (a, b) { return (a.taux < 0 ? 2 : a.taux) - (b.taux < 0 ? 2 : b.taux) || a.k - b.k; });
    $('questions').innerHTML = lignes.map(function (l) {
      var pc = l.taux < 0 ? null : Math.round(100 * l.taux);
      var classe = pc === null ? '' : pc < 50 ? ' bas' : pc < 75 ? ' moyen' : ' haut';
      var detail = l.justes + l.faux ? l.justes + ' sur ' + (l.justes + l.faux) : 'aucune réponse';
      if (l.vides) detail += ' ; ' + l.vides + ' sans réponse (temps écoulé)';
      return '<li class="cf-q' + classe + '" data-k="' + l.k + '"><div class="cf-q-tete"><span class="cf-q-num">Question ' + (l.k + 1) +
        '</span>' + (l.c ? '<span class="cf-etiquette">' + (GENRES[l.c.g] || '') + '</span>' : '') +
        '<span class="cf-q-taux">' + (pc === null ? '—' : pc + '&nbsp;%') + '</span><span class="cf-doux">' + detail + '</span></div>' +
        '<div class="cf-barre"><span style="width:' + (pc || 0) + '%"></span></div>' +
        (l.c ? '<div class="cf-q-texte">' + l.c.q + '</div><button type="button" class="cf-bouton second cf-voir">' +
               (ouvertes[l.k] ? 'Cacher la réponse' : 'Voir la réponse') + '</button>' +
               '<div class="cf-q-rep"' + (ouvertes[l.k] ? '' : ' hidden') + '>' + l.c.r + '</div>'
             : '<p class="cf-doux">Carte retirée du site depuis le lancement de la série.</p>') + '</li>';
    }).join('');
  }
  $('questions').onclick = function (e) {
    var b = e.target.closest('.cf-voir');
    if (!b) return;
    var li = b.closest('.cf-q'), rep = li.querySelector('.cf-q-rep'), k = +li.dataset.k;
    rep.hidden = !rep.hidden; ouvertes[k] = !rep.hidden;
    b.textContent = rep.hidden ? 'Voir la réponse' : 'Cacher la réponse';
  };
  R.querySelectorAll('input[name="cf-ordre"]').forEach(function (x) { x.onchange = function () { if (SERIE) debriefer(); }; });
  $('actualiser').onclick = function () { if (SERIE) debriefer(); };
  $('qr-cacher').onclick = function () {
    var z = $('acces'), cache = !z.hidden;
    z.hidden = cache;
    this.textContent = cache ? 'Montrer le QR code' : 'Masquer le QR code';
  };
  // questions de la série à côté du QR code, sans les réponses : pour un élève sans téléphone
  function enonces() {
    var z = $('enonces-liste');
    $('enonces').hidden = !SERIE.cartes || !!lire('fdm-cartes-flash:sans-enonces');
    $('enonces-cacher').hidden = !SERIE.cartes;
    $('enonces-cacher').textContent = $('enonces').hidden ? 'Montrer les questions' : 'Masquer les questions';
    z.innerHTML = '';
    if (!SERIE.cartes) return;
    var code = SERIE.code;
    chargerCartes(SERIE.page).then(function (cartes) {
      if (!SERIE || SERIE.code !== code) return;
      var parSuf = {};
      cartes.forEach(function (c) { parSuf[c.suf] = c; });
      z.innerHTML = SERIE.cartes.map(function (suf) {
        return '<li><div class="cf-q-texte">' + (parSuf[suf] ? parSuf[suf].q : '(carte retirée du site)') + '</div></li>';
      }).join('');
    }).catch(function () { z.innerHTML = '<li>Impossible de lire les cartes du chapitre.</li>'; });
  }
  $('enonces-cacher').onclick = function () {
    var cache = !$('enonces').hidden;
    $('enonces').hidden = cache;
    ecrire('fdm-cartes-flash:sans-enonces', cache ? 1 : null);
    this.textContent = cache ? 'Montrer les questions' : 'Masquer les questions';
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
        if (j.ok && j.ferme && !SERIE.ferme) {   // terminée depuis un autre onglet
          SERIE.ferme = true; ecrire('fdm-cartes-flash:serie', SERIE); afficherSerie(); return;
        }
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
