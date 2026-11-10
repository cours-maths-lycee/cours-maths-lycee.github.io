/* Page « Se tester » d'un chapitre (scripts/site_se_tester.py) : consignes, compte à
   rebours, corrigé et grille à cocher, bilan par méthode. L'état reste dans le
   navigateur (localStorage) ; en mode élève (scripts/site/eleve.js), le bilan part en
   plus dans l'onglet « DS blancs » du professeur : chapitre, date du DS blanc (début du
   compte à rebours), nombres de méthodes acquises et à retravailler ; le compte à rebours part de l'heure de fin : il continue
   pendant la veille du téléphone et si la page est fermée. Mesure anonyme (mesure.js) :
   DS blanc commencé, bilan (questions réussies, méthodes à retravailler), retravailler. */
(function () {
  'use strict';
  var D = JSON.parse(document.getElementById('st-donnees').textContent);
  var DUREE = 55 * 60 * 1000, ETAPES = ['accueil', 'chrono', 'corrige', 'bilan'];
  var TITRE = document.title;
  function $(id) { return document.getElementById('st-' + id); }
  function pluriel(n, mot) { return n + ' ' + mot + (n > 1 ? 's' : ''); }

  var etat = {etape: 'accueil', fin: 0, coches: {}};
  try { etat = JSON.parse(localStorage.getItem(D.cle)) || etat; } catch (e) {}
  function garder() { try { localStorage.setItem(D.cle, JSON.stringify(etat)); } catch (e) {} }

  function montrer(nom, sansRemonter) {
    etat.etape = nom; garder();
    ETAPES.forEach(function (x) { $(x).hidden = x !== nom; });
    document.title = TITRE;
    if (nom === 'chrono') lancerChrono(); else arreterChrono();
    if (nom === 'corrige') compter();
    if (nom === 'bilan') faireBilan();
    if (!sansRemonter) window.scrollTo(0, 0);
  }

  // ---------- compte à rebours ----------
  var tic = null, verrou = null, sonne = false;
  function garderEcran() {
    if (navigator.wakeLock && navigator.wakeLock.request)
      navigator.wakeLock.request('screen').then(function (v) { verrou = v; }).catch(function () {});
  }
  function bip() {
    try {
      var A = new (window.AudioContext || window.webkitAudioContext)(), o = A.createOscillator(), g = A.createGain();
      o.connect(g); g.connect(A.destination); o.frequency.value = 660; g.gain.value = 0.15;
      o.start(); o.stop(A.currentTime + 0.9);
    } catch (e) {}
  }
  function majChrono() {
    var r = Math.max(0, etat.fin - Date.now()), s = Math.ceil(r / 1000);
    var txt = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    $('temps').textContent = txt;
    document.title = txt + ' — DS blanc';
    if (r === 0) {
      if (tic) { clearInterval(tic); tic = null; }
      if (!sonne) { sonne = true; bip(); }
      $('temps').classList.add('fini');
      $('info').textContent = 'Les 55 minutes sont écoulées. Pas fini ? Tu peux continuer dans une autre couleur : ' +
        'le corrigé t’aidera à voir ce qui a manqué de temps et ce qui a manqué de méthode.';
      $('terminer').textContent = 'Voir le corrigé';
      $('terminer').classList.remove('second');
      $('zone-terminer').hidden = false; $('zone-confirmer').hidden = true;
    }
  }
  function lancerChrono() {
    $('zone-terminer').hidden = false; $('zone-confirmer').hidden = true;
    garderEcran();
    majChrono();
    if (!tic && Date.now() < etat.fin) tic = setInterval(majChrono, 500);
  }
  function arreterChrono() {
    if (tic) { clearInterval(tic); tic = null; }
    if (verrou) { verrou.release().catch(function () {}); verrou = null; }
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && etat.etape === 'chrono') { garderEcran(); majChrono(); }
  });
  function mesurer(nom, d) { d.page = D.page; if (window.umTrack) window.umTrack(nom, d); }   // mesure.js
  $('demarrer').onclick = function () {
    etat.fin = Date.now() + DUREE; montrer('chrono');
    mesurer('DS blanc commencé', {});
  };
  $('terminer').onclick = function () {
    if (Date.now() >= etat.fin) { montrer('corrige'); return; }
    $('zone-terminer').hidden = true; $('zone-confirmer').hidden = false;
  };
  $('continuer').onclick = function () { $('zone-terminer').hidden = false; $('zone-confirmer').hidden = true; };
  $('confirmer').onclick = function () { montrer('corrige'); };

  // ---------- grille ----------
  var lignes = document.querySelectorAll('.st-ligne');
  lignes.forEach(function (l) {
    var q = l.dataset.q;
    l.querySelectorAll('input').forEach(function (x) {
      if (etat.coches[q] === x.value) x.checked = true;
      x.onchange = function () { etat.coches[q] = x.value; garder(); compter(); };
    });
  });
  function compter() {
    var n = 0;
    lignes.forEach(function (l) { if (etat.coches[l.dataset.q]) n++; });
    $('compte').textContent = pluriel(n, 'question') + ' ' + (n > 1 ? 'cochées' : 'cochée') + ' sur ' + lignes.length;
    $('voir-bilan').disabled = n < lignes.length;
  }
  $('voir-bilan').onclick = function () { montrer('bilan'); };
  $('revenir').onclick = function () { montrer('corrige'); };
  $('recommencer').onclick = function () {
    if (!confirm('Effacer ce bilan et recommencer le DS blanc ?')) return;
    try { localStorage.removeItem(D.cle); } catch (e) {}
    location.reload();
  };

  // ---------- bilan : une méthode est à retravailler dès qu'une de ses questions n'est pas réussie ----------
  function faireBilan() {
    var par = {};
    lignes.forEach(function (l) {
      var m = par[l.dataset.m] = par[l.dataset.m] || {ok: 0, n: 0};
      m.n++; if (etat.coches[l.dataset.q] === 'ok') m.ok++;
    });
    var premiere = null, nbAcquises = 0;
    document.querySelectorAll('.st-meth').forEach(function (c) { $('cartes').appendChild(c); });
    Array.prototype.forEach.call($('cartes').querySelectorAll('.st-meth'), function (c) {
      var s = par[c.dataset.m], reussi = s.ok === s.n;
      c.classList.toggle('acquis', reussi); c.classList.toggle('travail', !reussi);
      c.querySelector('.score').textContent = pluriel(s.ok, 'question') + ' ' + (s.ok > 1 ? 'réussies' : 'réussie') + ' sur ' + s.n;
      if (reussi) nbAcquises++; else if (!premiere) premiere = c.dataset.m;
      $(reussi ? 'acquis' : 'travail').appendChild(c);
    });
    $('titre-travail').hidden = !premiere;
    $('titre-acquis').hidden = !nbAcquises;
    $('resume').textContent = premiere
      ? 'Commence par la méthode ' + premiere + ' : relis son exemple corrigé, puis fais un exercice de sa partie avant de passer à la suivante.'
      : 'Toutes les méthodes testées sont réussies. Garde le rythme : refais un exercice difficile de la fiche quelques jours avant le DS.';
    enregistrer(nbAcquises, Object.keys(par).length - nbAcquises);
    // mesure anonyme, une fois par grille remplie : questions réussies, méthodes à retravailler
    var ok = 0, travail = [];
    lignes.forEach(function (l) { if (etat.coches[l.dataset.q] === 'ok') ok++; });
    Object.keys(par).forEach(function (m) { if (par[m].ok < par[m].n) travail.push(m); });
    var sig = etat.fin + ':' + ok + ':' + travail.join(',');
    if (etat.mesure !== sig) {
      etat.mesure = sig; garder();
      mesurer('bilan Se tester', {questions: ok + '/' + lignes.length, acquises: nbAcquises,
                                  travail: travail.join(', ') || 'aucune'});
    }
  }
  // un lien d'une méthode à retravailler : le bilan renvoie-t-il vers le cours et la fiche ?
  $('travail').addEventListener('click', function (e) {
    var a = e.target.closest('a[href]'), c = a && a.closest('.st-meth');
    if (c) mesurer('retravailler', {methode: c.dataset.m,
                                    lien: /exercices\.html/.test(a.getAttribute('href')) ? 'exercices' : 'méthode'});
  });

  // ---------- mode élève : bilan enregistré pour le professeur (une fois par DS blanc et par grille) ----------
  function enregistrer(acquises, travail) {
    var E = window.FDM_ELEVE;
    if (!E || !E.envoyerDsBlanc || !etat.fin) return;
    var debut = etat.fin - DUREE, signature = debut + ':' + acquises + ':' + travail;
    $('appareil').textContent = 'est enregistré pour ton professeur (chapitre, date, nombres de méthodes acquises et à retravailler)';
    if (etat.envoye === signature) { $('envoi').textContent = 'Bilan enregistré.'; $('envoi').hidden = false; return; }
    $('envoi').textContent = 'Enregistrement du bilan…'; $('envoi').hidden = false;
    E.envoyerDsBlanc({page: D.page, debut: debut, acquises: acquises, travail: travail}).then(function (j) {
      if (j.ok) { etat.envoye = signature; garder(); $('envoi').textContent = 'Bilan enregistré.'; }
      else $('envoi').textContent = 'Le bilan n’a pas pu être enregistré' +
        (j.erreur === 'réseau' ? ' (pas de connexion)' : '') + ' : rouvre cette page plus tard pour réessayer.';
    });
  }

  // ---------- bouton IA : scripts/site/ia.js lit ces attributs au moment du clic ----------
  var zone = document.querySelector('details.ia'), choix = document.getElementById('ia-exos');
  function choisirExo(n) {
    var s = D.sources[n];
    zone.dataset.titre = 'Exercice ' + n + ' — ' + s.titre;
    zone.dataset.source = s.enonce;
    zone.dataset.corrige = s.corrige;
    choix.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.n === String(n) ? 'true' : 'false');
    });
  }
  if (zone && choix) {
    choix.querySelectorAll('button').forEach(function (b) {
      b.onclick = function () { choisirExo(b.dataset.n); };
    });
    choisirExo('1');
  }

  montrer(ETAPES.indexOf(etat.etape) >= 0 ? etat.etape : 'accueil', true);
})();
