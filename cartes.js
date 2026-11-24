/* Page « Cartes flash » d'un chapitre (scripts/site_cartes.py) : séries de 5 (par défaut) ou
   10 questions rapides, temps limité au choix (1 minute par question, pour toute la série), bilan, suivi dans le temps.

   Cartes : <article data-id data-p (partie) data-g (cours, methode, exo) data-n (niveau 1 à 4)
   data-m (méthode, 0 sinon)> dans #fc-cartes, formules déjà rendues.

   Suivi (localStorage, une clé par niveau : une carte vue dans un chapitre compte aussi
   pour une révision de plusieurs chapitres) : pour chaque carte, ses vues, ses réussites,
   son dernier résultat et le nombre de fois où elle sera encore reproposée après un
   échec ; les séries (date, chapitre, score, parties) ; les cartes ratées de la dernière
   série du chapitre.

   Pas de répétition espacée carte par carte (faite pour des faits isolés, comme du
   vocabulaire) : en maths, plusieurs cartes entraînent le même savoir-faire, et le
   mélange des parties et des méthodes espace déjà les révisions.
   Tirage d'une série (« hasard piloté ») :
   - d'abord les cartes de cours ratées à la série précédente (moitié de la série au plus) ;
   - puis, carte par carte, la meilleure note parmi les cartes des parties choisies :
     genre (un tiers cours, un tiers méthodes, un tiers exercices ; sur 5 questions, la
     place en trop tourne d'une série à l'autre), niveau visé, carte jamais vue (une
     garantie par tranche de 5 questions), carte ratée encore à reproposer, carte réussie
     d'autant moins reprise qu'elle l'a été souvent, partie où l'élève se trompe le plus
     (taux d'erreur sur le dernier résultat de chaque carte : la partie est le bon
     niveau, toutes les cartes en ont une ; une méthode n'est rattachée qu'à certaines),
     partie déjà tirée dans la série (moins), une part de hasard ;
   - carte ratée : reproposée 2 fois au plus ; ratée 3 fois de suite, elle n'est plus
     poussée (l'élève ne s'enlise pas) et revient comme une carte déjà vue ;
   - niveau visé : profil progressif (3 faciles, 3 normales, 2 moyennes, 2 plus difficiles
     sur 10), décalé d'un cran selon les séries précédentes (poids 1, 0,8, 0,64…) : plus
     difficile au-delà de 85 % de réussite (jusqu'à repasser sous 78 %), plus facile sous
     55 % (jusqu'à repasser au-dessus de 62 %) ; dans la série, un cran
     de plus après deux « Juste » de suite, un de moins après un « Faux ».
   Fin de séance : score, cartes ratées (liens vers la méthode et les exercices), « Revoir
   les cartes ratées » (sans note, jusqu'à « Compris »), progression.
   Lien direct : cartes.html#partie=4 (une partie), #jusqua=4 (parties I à IV).
   Série en classe (code projeté par le tableau de bord, tapé sur cartes-flash.html) :
   cartes.html#serie=K7FQ&parties=1,2,3&n=5&t=1&cartes=c004,c017,… : réglages imposés par
   le professeur et cartes tirées par son tableau de bord, dans l'ordre (fin de leur
   identifiant) : la même série pour toute la classe, sans le tirage adaptatif, lancée dès
   l'arrivée sur la page (pas d'écran d'accueil) ; sans
   « cartes » (ancien lien), tirage ordinaire. Début et fin de la série envoyés au serveur
   (compteurs_google.gs, onglet « Séries en classe ») avec le code de l'élève (mode élève)
   ou, sinon, un jeton anonyme tiré par le navigateur (le tableau de bord affiche alors
   « Élève 1 », « Élève 2 »…), et à la fin les réponses carte par carte (« 1 », « 0 »,
   « - » si le temps a manqué), pour le débriefing en classe.
   Statistiques (onglet « Réponses aux cartes », scripts/stats_cartes.py) : à la fin de
   chaque série, seul ou en classe, une ligne par carte répondue : carte, genre, niveau,
   rang, niveau visé par le tirage, juste, secondes avant « Voir la réponse » ; avec le
   code de l'élève en mode élève, sans aucun identifiant pour un visiteur (jeton tiré
   pour la série seulement).
   Mode élève (eleve.js) : chaque séance part dans l'onglet « Cartes flash » du professeur.
   Mesure anonyme (mesure.js) : série commencée, série finie, cartes revues. */
(function () {
  'use strict';
  var R = document.getElementById('fc');
  if (!R) return;
  function $(id) { return document.getElementById('fc-' + id); }
  var PAGE = R.dataset.page, CLE = 'fdm-cartes:v1:' + R.dataset.niveau;
  var CARTES = Array.prototype.map.call(document.querySelectorAll('#fc-cartes article'), function (a) {
    return {id: a.dataset.id, p: +a.dataset.p, g: a.dataset.g, n: +a.dataset.n, m: +a.dataset.m,
            q: a.querySelector('.q').innerHTML, r: a.querySelector('.r').innerHTML};
  });
  var METHODES = {}, PARTIES = {};
  document.querySelectorAll('#fc-methodes span').forEach(function (s) {
    METHODES[s.dataset.m] = {page: s.dataset.page, exos: s.dataset.exos, titre: s.dataset.titre};
  });
  document.querySelectorAll('#fc-noms-parties span').forEach(function (s) {
    PARTIES[s.dataset.p] = {page: s.dataset.page, titre: s.dataset.titre};
  });
  var PAR_SUFFIXE = {};   // fin de l'identifiant (après le dernier tiret) -> carte
  CARTES.forEach(function (c) { PAR_SUFFIXE[c.id.slice(c.id.lastIndexOf('-') + 1)] = c; });
  var GENRES = {cours: 'Cours', methode: 'Méthode', exo: 'Exercice'};
  var ROMAINS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII',
                 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];

  // ---------- suivi ----------
  var suivi = {c: {}, s: [], ratees: {}, prefs: {}};
  try { suivi = JSON.parse(localStorage.getItem(CLE)) || suivi; } catch (e) {}
  suivi.c = suivi.c || {}; suivi.s = suivi.s || []; suivi.ratees = suivi.ratees || {}; suivi.prefs = suivi.prefs || {};
  function garder() { try { localStorage.setItem(CLE, JSON.stringify(suivi)); } catch (e) {} }
  function etatCarte(id) { return suivi.c[id]; }
  // carte réussie à son dernier passage (anciennes données : boîte de Leitner au-delà de 1)
  function reussie(id) { var s = suivi.c[id]; return !!s && (s.k !== undefined ? s.k === 1 : s.b > 1); }
  function mesurer(nom, d) { d.page = PAGE; if (window.umTrack) window.umTrack(nom, d); }
  function pluriel(n, mot) { return n + ' ' + mot + (n > 1 ? 's' : ''); }
  function seancesPage() { return suivi.s.filter(function (s) { return s.page === PAGE; }); }

  // ---------- accueil ----------
  var cases = document.querySelectorAll('#fc-parties li');
  function partiesChoisies() {
    var res = [];
    cases.forEach(function (li) { if (li.querySelector('input').checked) res.push(+li.dataset.p); });
    return res;
  }
  function cocher(f) { cases.forEach(function (li) { li.querySelector('input').checked = f(+li.dataset.p); }); majDemarrer(); }
  function majDemarrer() { $('demarrer').disabled = partiesChoisies().length === 0; }
  cases.forEach(function (li) { li.querySelector('input').onchange = majDemarrer; });
  $('tout').onclick = function () { cocher(function () { return true; }); };
  $('rien').onclick = function () { cocher(function () { return false; }); };
  // ---------- série en classe ----------
  var CLASSE = null;
  function identite() {
    var id = {};
    try { var e = JSON.parse(localStorage.getItem('fdm-eleve:v1')); if (e && e.code) id.eleve = e.code; } catch (x) {}
    if (id.eleve) return id;
    var j = null;
    try { j = localStorage.getItem('fdm-anonyme:v1'); } catch (x) {}
    if (!/^[a-z0-9]{10,20}$/.test(j || '')) {
      j = '';
      for (var k = 0; k < 12; k++) j += 'abcdefghijkmnpqrstuvwxyz23456789'.charAt(Math.floor(Math.random() * 32));
      try { localStorage.setItem('fdm-anonyme:v1', j); } catch (x) {}
    }
    id.anonyme = j;
    return id;
  }
  function envoyerClasse(etat, d) {
    var api = (window.FDM_ELEVE_CONFIG || {}).api;
    if (!api || !CLASSE) return Promise.resolve({ok: false, erreur: 'réseau'});
    var p = identite();
    p.action = 'classe'; p.serie = CLASSE.code; p.etat = etat;
    if (d) { p.questions = d.questions; p.justes = d.justes; if (d.reponses) p.reponses = d.reponses; }
    return fetch(api, {method: 'POST', body: new URLSearchParams(p)})
      .then(function (r) { return r.json(); })
      .catch(function () { return {ok: false, erreur: 'réseau'}; });
  }
  function modeClasse(actif) {
    $('classe').hidden = !actif;
    [$('parties'), document.querySelector('input[name="fc-n"]')].forEach(function (el) {
      var bloc = el && el.closest('.fc-carte-info');
      if (bloc) bloc.hidden = actif;
    });
    if (actif) $('classe').innerHTML = '<h2>Série en classe</h2><p>Code <strong>' + CLASSE.code + '</strong> : ' +
      pluriel(CLASSE.cartes ? CLASSE.cartes.length : CLASSE.n, 'question') + (CLASSE.t ? ', temps limité' : '') +
      (CLASSE.cartes ? ', les mêmes pour toute la classe. ' : ', parties choisies par ton professeur. ') +
      'Ton résultat lui sera envoyé à la fin.</p>';
  }
  function lireAdresse() {
    var h = location.hash.slice(1), m;
    if (/(^|&)serie=/.test(h)) {
      var q = new URLSearchParams(h), code = (q.get('serie') || '').toUpperCase();
      var l = (q.get('parties') || '').split(',').map(Number).filter(function (x) { return x > 0; });
      if (/^[A-Z0-9]{4}$/.test(code) && l.length) {
        var liste = (q.get('cartes') || '').split(',').filter(function (x) { return /^[a-z0-9]{1,12}$/.test(x); });
        CLASSE = {code: code, n: q.get('n') === '10' ? 10 : 5, t: q.get('t') === '1' ? 1 : 0,
                  cartes: liste.length ? liste : null};
        cocher(function (p) { return l.indexOf(p) >= 0; });
        poserChoix('n', CLASSE.n); poserChoix('t', CLASSE.t);
        modeClasse(true);
        history.replaceState(null, '', location.pathname + location.search);
        demarrer();   // code tapé par l'élève : les questions tout de suite, sans écran d'accueil
        return;
      }
      history.replaceState(null, '', location.pathname + location.search);
      return;
    }
    if ((m = /^partie=(\d+)$/.exec(h))) cocher(function (p) { return p === +m[1]; });
    else if ((m = /^jusqua=(\d+)$/.exec(h))) cocher(function (p) { return p <= +m[1]; });
    else if ((m = /^parties=([\d,]+)$/.exec(h))) {
      var l = m[1].split(',').map(Number);
      cocher(function (p) { return l.indexOf(p) >= 0; });
    }
  }
  function choix(nom) { var x = document.querySelector('input[name="fc-' + nom + '"]:checked'); return x ? +x.value : 0; }
  function poserChoix(nom, v) {
    var x = document.querySelector('input[name="fc-' + nom + '"][value="' + v + '"]');
    if (x) x.checked = true;
  }
  if (suivi.prefs.n) poserChoix('n', suivi.prefs.n);
  if (suivi.prefs.t !== undefined) poserChoix('t', suivi.prefs.t);
  function majAccueil() {
    cases.forEach(function (li) {
      var p = +li.dataset.p, du = CARTES.filter(function (c) { return c.p === p; });
      var ok = du.filter(function (c) { return reussie(c.id); }).length;
      li.querySelector('.fc-jauge span').style.width = Math.round(100 * ok / du.length) + '%';
      li.querySelector('.fc-jauge').title = ok + ' carte' + (ok > 1 ? 's' : '') + ' réussie' + (ok > 1 ? 's' : '') + ' sur ' + du.length;
    });
    var sp = seancesPage();
    if (sp.length) {
      var justes = 0, questions = 0;
      sp.forEach(function (s) { justes += s.ok; questions += s.v; });
      $('stats').textContent = pluriel(sp.length, 'série') + ' sur ce chapitre ; ton pourcentage de réussite : ' +
        Math.round(100 * justes / questions) + '\u00a0%.';
    } else $('stats').textContent = '';
    if (window.FDM_ELEVE && window.FDM_ELEVE.envoyerSeance) $('eleve').textContent = ' et sont aussi enregistrés pour ton professeur';
  }

  // ---------- écrans ----------
  function montrer(nom) {
    ['accueil', 'seance', 'bilan'].forEach(function (x) { $(x).hidden = x !== nom; });
    document.body.classList.toggle('fc-plein', nom === 'seance');
    window.scrollTo(0, 0);
  }

  // ---------- niveau visé ----------
  var PROFIL10 = [1, 1, 1, 2, 2, 2, 3, 3, 4, 4];
  function profil(i, n) { return PROFIL10[Math.min(9, Math.floor(i * 10 / n))]; }
  // décalage du niveau (−1, 0 ou +1), rejoué série après série sur l'historique :
  // réussite pondérée (poids 1, 0,8, 0,64…) ; on entre à +1 au-delà de 85 % et on n'en
  // sort que sous 78 %, on entre à −1 sous 55 % et on n'en sort qu'au-dessus de 62 %
  // (pas de yo-yo autour d'un seuil)
  function decalage() {
    var sp = seancesPage(), etat = 0;
    if (!sp.length) sp = suivi.s;
    for (var i = 0; i < sp.length; i++) {
      var poids = 1, somme = 0, total = 0;
      for (var k = i; k >= 0 && poids > 0.05; k--) {
        somme += poids * sp[k].ok / sp[k].v; total += poids; poids *= 0.8;
      }
      var r = somme / total;
      etat = etat === 1 ? (r < 0.78 ? 0 : 1) : etat === -1 ? (r > 0.62 ? 0 : -1)
        : r > 0.85 ? 1 : r < 0.55 ? -1 : 0;
    }
    return etat;
  }

  // ---------- séance ----------
  var S = null, tic = null;
  function quotas(n, rang) {
    var q = {cours: Math.floor(n / 3), methode: Math.floor(n / 3), exo: Math.floor(n / 3)};
    var reste = n - 3 * Math.floor(n / 3), o = ['cours', 'exo', 'methode'];
    var ordre = o.slice(rang % 3).concat(o.slice(0, rang % 3));   // tourne d'une série à l'autre
    for (var k = 0; k < reste; k++) q[ordre[k]]++;
    return q;
  }
  function demarrer() {
    var parties = partiesChoisies(), n = choix('n') || 5, chrono = choix('t') === 1;
    suivi.prefs = {n: n, t: chrono ? 1 : 0}; garder();
    var pool = CARTES.filter(function (c) { return parties.indexOf(c.p) >= 0; });
    n = Math.min(n, pool.length);
    var prioritaires = (suivi.ratees[PAGE] || []).filter(function (id) {
      var c = pool.filter(function (x) { return x.id === id; })[0];
      var st = etatCarte(id);
      return c && c.g === 'cours' && st && st.r > 0;
    }).slice(0, Math.floor(n / 2));
    var liste = null;   // série en classe : les cartes du professeur, dans l'ordre (k : rang dans sa liste)
    if (CLASSE && CLASSE.cartes) {
      liste = [];
      CLASSE.cartes.forEach(function (x, k) { if (PAR_SUFFIXE[x]) liste.push({c: PAR_SUFFIXE[x], k: k}); });
      if (liste.length) { n = liste.length; prioritaires = []; } else liste = null;
    }
    S = {pool: pool, n: n, i: 0, vues: [], ratees: [], parties: parties, chrono: chrono, debut: Date.now(),
         fin: chrono ? Date.now() + n * 60000 : 0, decal: decalage(), adj: 0, suite: 0, quotas: quotas(n, seancesPage().length), neuves: 0,
         prio: prioritaires, utilisees: {}, parPartie: {}, revoir: null, liste: liste, vise: 0,
         jeton: jetonSerie()};
    if (liste) S.reponses = CLASSE.cartes.map(function () { return '-'; });
    mesurer('série commencée', {questions: n, chrono: chrono ? 'oui' : 'non', parties: texteParties(parties),
                                classe: CLASSE ? 'oui' : 'non'});
    if (CLASSE) {
      S.classe = true;
      envoyerClasse('debut').then(function (j) { if (!j.ok && j.erreur === 'série terminée') S.classeTerminee = true; });
    }
    montrer('seance');
    if (chrono) { majTemps(); tic = setInterval(majTemps, 500); } else $('temps').textContent = '';
    suivante();
  }
  function jetonSerie() {
    var j = '';
    for (var k = 0; k < 12; k++) j += 'abcdefghijkmnpqrstuvwxyz23456789'.charAt(Math.floor(Math.random() * 32));
    return j;
  }
  function texteParties(l) {
    var toutes = Array.prototype.map.call(cases, function (li) { return +li.dataset.p; });
    if (l.length === toutes.length) return 'tout';
    return l.map(function (p) { return ROMAINS[p] || p; }).join(',');
  }
  // taux d'erreur de l'élève dans une partie, sur le dernier résultat de chaque carte
  // (une partie jamais travaillée compte pour 50 %) : plus de questions là où il se trompe
  function erreursPartie(p) {
    var vues = 0, ratees = 0;
    S.pool.forEach(function (x) {
      var st = etatCarte(x.id);
      if (x.p !== p || !st) return;
      var k = st.k !== undefined ? st.k : (st.b > 1 ? 1 : 0);
      vues++; if (k === 0) ratees++;
    });
    return (ratees + 1) / (vues + 2);
  }
  function note(c, vise, maintenant) {
    var s = -1.5 * Math.abs(c.n - vise), st = etatCarte(c.id);
    s += S.quotas[c.g] > 0 ? 3 : -3;
    if (!st) s += S.neuves < Math.ceil(S.n / 5) ? 4 : 1;   // jamais vue
    else if (st.r > 0) s += 2.5;                            // ratée, encore à reproposer
    else s -= 0.8 * (st.j || 0) + (st.k === 0 ? 1.5 : 0);   // déjà vue : moins à chaque réussite
    s -= 1.2 * (S.parPartie[c.p] || 0);
    s += 3 * erreursPartie(c.p);
    return s + Math.random() * 1.2;
  }
  function tirer() {
    var maintenant = Date.now();
    if (S.liste) { S.vise = 0; return S.liste[S.i] ? S.liste[S.i].c : null; }
    S.vise = Math.max(1, Math.min(4, profil(S.i, S.n) + S.decal + S.adj));
    while (S.prio.length) {
      var id = S.prio.shift();
      var c = S.pool.filter(function (x) { return x.id === id && !S.utilisees[x.id]; })[0];
      if (c) return c;
    }
    var vise = Math.max(1, Math.min(4, profil(S.i, S.n) + S.decal + S.adj)), meilleure = null, mn = -1e9;
    S.pool.forEach(function (c) {
      if (S.utilisees[c.id]) return;
      var x = note(c, vise, maintenant);
      if (x > mn) { mn = x; meilleure = c; }
    });
    return meilleure;
  }
  function afficher(c, titre) {
    $('titre').textContent = titre;
    $('genre').textContent = GENRES[c.g] || '';
    $('question').innerHTML = c.q;
    $('reponse').innerHTML = c.r;
    $('reponse').hidden = true; $('voir').hidden = false;
    $('bas').hidden = true; $('bas-revoir').hidden = true;
    $('voir').focus();
    if (S) { S.affiche = Date.now(); S.secondes = -1; }
  }
  function suivante() {
    if (S.i >= S.n) return finir(false);
    var c = tirer();
    if (!c) return finir(false);
    if (!etatCarte(c.id)) S.neuves++;
    S.courante = c; S.utilisees[c.id] = 1;
    S.quotas[c.g]--; S.parPartie[c.p] = (S.parPartie[c.p] || 0) + 1;
    afficher(c, R.dataset.fil + ' / Question ' + (S.i + 1) + '/' + S.n);
  }
  $('voir').onclick = function () {
    if (S && S.secondes < 0) S.secondes = Math.min(3600, Math.round((Date.now() - S.affiche) / 1000));
    $('reponse').hidden = false; $('voir').hidden = true;
    if (S && S.revoir) $('bas-revoir').hidden = false; else $('bas').hidden = false;
  };
  function repondre(juste) {
    var c = S.courante, maintenant = Date.now(), st = suivi.c[c.id] || {v: 0, j: 0};
    st.v++; st.d = maintenant;
    delete st.b; delete st.e; delete st.f;   // anciennes versions (répétition espacée)
    if (juste) { st.j++; st.k = 1; st.r = 0; }
    else {   // ratée : reproposée 2 fois au plus, puis plus poussée
      st.r = st.k === 0 && st.r !== undefined ? Math.max(0, st.r - 1) : 2;
      st.k = 0; S.ratees.push(c);
    }
    suivi.c[c.id] = st; garder();
    S.vues.push({c: c, juste: juste, rang: S.i + 1, vise: S.vise, secondes: Math.max(0, S.secondes)});
    if (S.liste) S.reponses[S.liste[S.i].k] = juste ? '1' : '0';
    if (juste) { if (++S.suite >= 2) { S.adj = Math.min(1, S.adj + 1); S.suite = 0; } }
    else { S.adj = Math.max(-1, S.adj - 1); S.suite = 0; }
    S.i++;
    suivante();
  }
  $('juste').onclick = function () { repondre(true); };
  $('faux').onclick = function () { repondre(false); };
  document.addEventListener('keydown', function (e) {
    if ($('seance').hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    if ((e.key === ' ' || e.key === 'Enter') && !$('voir').hidden) { e.preventDefault(); $('voir').click(); }
    else if (e.key === 'ArrowLeft' && !$('bas').hidden) $('juste').click();
    else if (e.key === 'ArrowRight' && !$('bas').hidden) $('faux').click();
  });

  // ---------- compte à rebours (temps limité) ----------
  function majTemps() {
    var r = Math.max(0, S.fin - Date.now()), s = Math.ceil(r / 1000);
    $('temps').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    $('temps').classList.toggle('fini', s <= 30);
    if (r === 0 && !S.revoir) finir(true);
  }
  function arreter() { if (tic) { clearInterval(tic); tic = null; } }

  // ---------- revoir les cartes ratées (sans note, jusqu'à « Compris ») ----------
  function revoirSuivante() {
    if (!S.revoir.length) { S.revoir = null; montrer('bilan'); $('revoir').hidden = true; return; }
    S.courante = S.revoir[0];
    afficher(S.courante, R.dataset.fil + ' / Cartes ratées : encore ' + S.revoir.length);
  }
  $('revoir').onclick = function () {
    S.revoir = S.ratees.slice(); $('temps').textContent = '';
    mesurer('cartes revues', {cartes: S.revoir.length});
    montrer('seance'); revoirSuivante();
  };
  $('compris').onclick = function () { S.revoir.shift(); revoirSuivante(); };
  $('encore').onclick = function () { S.revoir.push(S.revoir.shift()); revoirSuivante(); };

  // ---------- bilan ----------
  function finir(tempsEcoule) {
    arreter();
    var v = S.vues.length, ok = S.vues.filter(function (x) { return x.juste; }).length;
    if (!v) { montrer('accueil'); majAccueil(); return; }
    var precedentes = seancesPage();
    var record = precedentes.length ? Math.max.apply(null, precedentes.map(function (s) { return s.ok / s.v; })) : -1;
    var seance = {t: S.debut, page: PAGE, v: v, ok: ok, n: S.n, parties: texteParties(S.parties), chrono: S.chrono ? 1 : 0};
    suivi.s.push(seance);
    if (suivi.s.length > 400) suivi.s = suivi.s.slice(-400);
    suivi.ratees[PAGE] = S.ratees.map(function (c) { return c.id; });
    garder();
    $('score').textContent = ok + ' / ' + v;
    var taux = ok / v, msg;
    if (tempsEcoule) msg = 'Temps écoulé : ' + pluriel(v, 'question') + ' sur ' + S.n + '. ';
    else msg = '';
    var seancesDuJour = precedentes.filter(function (s) { return S.debut - s.t < 3 * 3600e3; }).length;
    if (record >= 0 && taux > record) msg += 'Nouveau record sur ce chapitre ! ';
    if (taux === 1) msg += 'Tout est juste. ';
    else if (taux >= 0.8) msg += 'Très bien. ';
    else if (taux >= 0.5) msg += 'C’est en route. ';
    else msg += 'Les cartes ratées vont revenir : c’est en les retrouvant qu’on les retient. ';
    msg += seancesDuJour === 0
      ? 'Enchaîne une deuxième série : les cartes ratées reviennent en premier, c’est là qu’on progresse.'
      : 'Reviens un autre jour : se tester souvent, en plusieurs fois, aide à retenir.';
    $('message').textContent = msg;
    $('revoir').hidden = !S.ratees.length;
    $('revoir').textContent = S.ratees.length > 1 ? 'Revoir les ' + S.ratees.length + ' cartes ratées' : 'Revoir la carte ratée';
    afficherRatees();
    afficherProgression();
    montrer('bilan');
    mesurer('série finie', {score: ok + '/' + v, questions: S.n, chrono: S.chrono ? 'oui' : 'non',
                             parties: seance.parties, temps: tempsEcoule ? 'écoulé' : 'fini'});
    enregistrer(seance);
    envoyerReponses();
    if (S.classe && S.classeTerminee) {
      $('envoi-classe').hidden = false;
      $('envoi-classe').textContent = 'La série de ton professeur était déjà terminée : ton résultat ne lui a pas été envoyé.';
      CLASSE = null; modeClasse(false);
    } else if (S.classe) {
      $('envoi-classe').hidden = false; $('envoi-classe').textContent = 'Envoi du résultat à ton professeur…';
      envoyerClasse('fin', {questions: v, justes: ok, reponses: S.reponses ? S.reponses.join('') : ''}).then(function (j) {
        $('envoi-classe').textContent = j.ok ? 'Résultat envoyé à ton professeur.'
          : 'Le résultat n’a pas pu être envoyé' + (j.erreur === 'réseau' ? ' (pas de connexion)' : ' : ' + j.erreur) + '.';
      });
      CLASSE = null; modeClasse(false);   // les séries suivantes sont des séries ordinaires
    } else $('envoi-classe').hidden = true;
  }
  function afficherRatees() {
    var z = $('rates'); z.innerHTML = '';
    $('titre-rates').hidden = !S.ratees.length;
    S.ratees.forEach(function (c) {
      var d = document.createElement('div'); d.className = 'fc-rate';
      var m = c.m && METHODES[c.m], p = PARTIES[c.p], liens = [];
      if (m) {
        liens.push('<a href="' + m.page + '#methode-' + c.m + '">Revoir la méthode ' + c.m + '</a>');
        if (m.exos) liens.push('<a href="exercices.html#exercice-' + m.exos.split('-')[0] + '">Exercices ' +
                               m.exos.replace('-', ' à ') + '</a>');
      } else if (p) liens.push('<a href="' + p.page + '">Revoir la partie ' + (ROMAINS[c.p] || c.p) + '</a>');
      d.innerHTML = '<div>' + c.q + '</div><div class="liens">' + liens.join('') + '</div>';
      z.appendChild(d);
    });
    z.onclick = function (e) {
      var a = e.target.closest('a[href]');
      if (a) mesurer('retravailler', {lien: /exercices\.html/.test(a.getAttribute('href')) ? 'exercices' : 'méthode'});
    };
  }
  function afficherProgression() {
    var toutes = seancesPage(), sp = toutes.slice(-12), z = $('progression');
    var vues = CARTES.filter(function (c) { return etatCarte(c.id); }).length;
    var txt = '';
    var justes = 0, questions = 0;
    toutes.forEach(function (s) { justes += s.ok; questions += s.v; });
    if (questions) {
      txt += '<p class="fc-global"><strong>' + Math.round(100 * justes / questions) + '&nbsp;%</strong> ' +
        'de bonnes réponses sur ce chapitre</p><p class="fc-doux fc-centre">' + justes + ' ' +
        (justes > 1 ? 'réponses justes' : 'réponse juste') + ' sur ' + questions + ', en ' +
        pluriel(toutes.length, 'série') + '.</p>';
    }
    if (sp.length) {
      // un bâton par série (les 12 dernières), score en %, axes gradués
      var W = 320, H = 180, g = 36, d = 8, h = 14, b = 34, n = sp.length, premier = toutes.length - n + 1;
      var lp = W - g - d, pas = lp / n, lb = Math.min(26, pas * 0.6);
      var y = function (r) { return h + (1 - r) * (H - h - b); };
      var s = '<svg class="fc-courbe" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Score de chaque série, en pourcentage">';
      for (var k = 0; k <= 100; k += 20) {
        s += '<line class="axe' + (k ? ' pointille' : '') + '" x1="' + g + '" y1="' + y(k / 100) + '" x2="' + (W - d) +
          '" y2="' + y(k / 100) + '"/><text class="gy" x="' + (g - 4) + '" y="' + (y(k / 100) + 3.5) + '">' + k + '&nbsp;%</text>';
      }
      sp.forEach(function (se, k) {
        var r = se.ok / se.v, cx = g + pas * (k + 0.5);
        s += '<rect class="baton" x="' + (cx - lb / 2).toFixed(1) + '" y="' + y(r).toFixed(1) + '" width="' + lb.toFixed(1) +
          '" height="' + (y(0) - y(r)).toFixed(1) + '"><title>Série ' + (premier + k) + ' : ' + se.ok + ' sur ' + se.v +
          '</title></rect>';
        s += '<text class="gx" x="' + cx.toFixed(1) + '" y="' + (y(r) - 3).toFixed(1) + '">' + Math.round(100 * r) + '</text>';
        s += '<text class="gx" x="' + cx.toFixed(1) + '" y="' + (y(0) + 13) + '">' + (premier + k) + '</text>';
      });
      s += '<text class="gx titre" x="' + (g + lp / 2) + '" y="' + (H - 4) + '">Série n°</text></svg>';
      txt += s + '<p class="fc-doux">Score de chaque série sur ce chapitre, en %' +
        (toutes.length > n ? ' (les ' + n + ' dernières)' : '') + '.</p>';
    }
    txt += '<p>' + pluriel(vues, 'carte') + ' du chapitre ' + (vues > 1 ? 'déjà vues' : 'déjà vue') + ' sur ' +
      CARTES.length + '.</p>';
    z.innerHTML = txt;
  }

  // ---------- statistiques : une ligne par carte répondue (onglet « Réponses aux cartes ») ----------
  function envoyerReponses() {
    var api = (window.FDM_ELEVE_CONFIG || {}).api;
    if (!api || !S.vues.length) return;
    var p = {action: 'reponses', page: PAGE, jeton: S.jeton, classe: S.classe && CLASSE ? CLASSE.code : ''};
    try { var e = JSON.parse(localStorage.getItem('fdm-eleve:v1')); if (e && e.code) p.eleve = e.code; } catch (x) {}
    // jamais le jeton anonyme du navigateur : un visiteur n'a aucun identifiant ici
    p.lignes = JSON.stringify(S.vues.map(function (x) {
      return [x.c.id, x.c.g, x.c.n, x.rang, x.vise, x.juste ? 1 : 0, x.secondes];
    }));
    fetch(api, {method: 'POST', body: new URLSearchParams(p)}).catch(function () {});
  }

  // ---------- mode élève : séance enregistrée pour le professeur ----------
  function enregistrer(seance) {
    var E = window.FDM_ELEVE;
    if (!E || !E.envoyerSeance) return;
    $('envoi').hidden = false; $('envoi').textContent = 'Enregistrement de la série…';
    E.envoyerSeance({page: PAGE, debut: seance.t, questions: seance.v, justes: seance.ok,
                     parties: seance.parties, chrono: seance.chrono}).then(function (j) {
      $('envoi').textContent = j.ok ? 'Série enregistrée pour ton professeur.'
        : 'La série n’a pas pu être enregistrée' + (j.erreur === 'réseau' ? ' (pas de connexion)' : '') + '.';
    });
  }

  $('demarrer').onclick = demarrer;
  $('encore-seance').onclick = demarrer;
  $('accueil-retour').onclick = function () { majAccueil(); montrer('accueil'); };
  window.addEventListener('hashchange', lireAdresse);
  lireAdresse(); majDemarrer(); majAccueil();
  document.addEventListener('fdm-eleve', majAccueil);
})();
