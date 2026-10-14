var FDM_ELEVE_CONFIG = {"api": "https://script.google.com/macros/s/AKfycbw1z92aBm9Ru_Q-sIKm3kxSIETlIhYPdYRLTqVQKpBnKKpeSkP5qzy-l6kKetmIPLoo/exec", "paliers": [10, 20, 50]};
/* Mode élève du site « Faire des maths » (chargé par toutes les pages, sans defer,
   avant marteau.js).
   publier.py écrit avant ce fichier : var FDM_ELEVE_CONFIG = {api: <web app
   Google Apps Script, scripts/site/compteurs_google.gs>, paliers: [10, 20, 50]}.
   Lien personnel envoyé par l'ENT (scripts/eleves.py) :
     https://faire-des-maths.fr/#eleve=K7F3QXPM&prenom=L%C3%A9a
   Le fragment (#…) n'est jamais envoyé au serveur du site ni au compteur de
   visites ; il est gardé dans le navigateur (localStorage), puis retiré de
   l'adresse. Le serveur des compteurs ne connaît que le code, jamais le prénom.
   Mode actif :
   - bandeau « Bonjour Léa » et nombre d'exercices comptés ;
   - corrigé d'un exercice pas encore compté : verrouillé 5 minutes à partir du
     premier clic sur « Corrigé » (heure notée par le serveur, qui ne compte
     l'exercice qu'après ce délai) ;
   - bouton marteau (marteau.js) : l'exercice est compté une seule fois.
   window.FDM_ELEVE : {prenom, fait(id), nombre(), envoyerFait(id)} ; l'événement
   « fdm-eleve » (document) signale une mise à jour. */
(function () {
  'use strict';
  var CFG = window.FDM_ELEVE_CONFIG || {};
  var API = CFG.api, PALIERS = CFG.paliers || [];
  var CLE = 'fdm-eleve:v1';
  var ATTENTE = 300;   // secondes ; le serveur donne la valeur qui fait foi
  window.FDM_ELEVE = null;

  function lire() { try { return JSON.parse(localStorage.getItem(CLE)); } catch (e) { return null; } }
  function ecrire(o) {
    try { if (o) localStorage.setItem(CLE, JSON.stringify(o)); else localStorage.removeItem(CLE); } catch (e) {}
  }

  // lien personnel : #eleve=CODE&prenom=…
  var frag = location.hash.slice(1);
  if (/(^|&)eleve=/.test(frag)) {
    var q = new URLSearchParams(frag);
    var code = (q.get('eleve') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code) {
      var avant = lire();
      ecrire({code: code, prenom: (q.get('prenom') || '').slice(0, 40),
              faits: avant && avant.code === code ? avant.faits : [],
              ouverts: avant && avant.code === code ? avant.ouverts : {}});
    }
    history.replaceState(null, '', location.pathname + location.search);
  }
  var etat = lire();
  if (!API || !etat || !etat.code) return;
  etat.faits = etat.faits || [];
  etat.ouverts = etat.ouverts || {};

  function fait(id) { return etat.faits.indexOf(id) >= 0; }
  function signaler() {
    ecrire(etat);
    majBandeau();
    majCorriges();
    document.dispatchEvent(new CustomEvent('fdm-eleve'));
  }

  // ---------- serveur ----------
  function poster(params) {
    params.eleve = etat.code;
    return fetch(API, {method: 'POST', body: new URLSearchParams(params)})
      .then(function (r) { return r.json(); });
  }
  function envoyerFait(id) {
    return poster({id: id}).then(function (j) {
      if (j && j.ok) {
        if ((j.compte || j.deja) && !fait(id)) etat.faits.push(id);
        if (j.ouvert) etat.ouverts[id] = j.ouvert;
        if (typeof j.nombre === 'number') etat.nombre = j.nombre;
        signaler();
      } else if (j && j.erreur === 'code inconnu') {
        oublier();
      }
      return j || {ok: false};
    }).catch(function () { return {ok: false, erreur: 'réseau'}; });
  }
  function synchroniser() {
    fetch(API + '?eleve=' + encodeURIComponent(etat.code))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j) return;
        if (!j.ok) { if (j.erreur === 'code inconnu') { oublier(); bandeauInconnu(); } return; }
        etat.faits = j.faits || [];
        etat.nombre = etat.faits.length;
        for (var id in j.ouverts || {}) etat.ouverts[id] = j.ouverts[id];
        if (j.attente) ATTENTE = j.attente;
        signaler();
      })
      .catch(function () {});
  }
  function oublier() { ecrire(null); window.FDM_ELEVE = null; }

  window.FDM_ELEVE = {
    prenom: etat.prenom,
    fait: fait,
    nombre: function () { return etat.faits.length; },
    envoyerFait: envoyerFait
  };

  // ---------- bandeau ----------
  var css = [
    '.eleve-bandeau{display:flex;flex-wrap:wrap;gap:.3rem 1rem;align-items:center;justify-content:space-between;',
    ' padding:.5rem max(16px,calc((100vw - 900px)/2));background:var(--accent-fond);color:var(--texte);',
    ' border-bottom:1px solid var(--trait);font:.95rem/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
    '.eleve-bandeau strong{color:var(--accent)}',
    '.eleve-bandeau button{font:inherit;font-size:.85rem;cursor:pointer;border:1px solid var(--trait);',
    ' border-radius:5px;background:transparent;color:var(--doux);padding:.15rem .6rem}',
    '.eleve-attente{margin:.4rem 0;padding:.45rem .7rem;border-left:3px solid var(--accent);',
    ' background:var(--accent-fond);font:.95rem/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
    'details.corrige.eleve-verrou>summary{opacity:.75}',
    '.marteau-message{margin:.2rem 0 .4rem;color:var(--doux);',
    ' font:.9rem/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}'
  ].join('\n');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var bandeau;
  function placerBandeau() {
    if (bandeau) return bandeau;
    bandeau = document.createElement('div');
    bandeau.className = 'eleve-bandeau';
    var entete = document.querySelector('header.bandeau');
    if (entete) entete.after(bandeau); else document.body.prepend(bandeau);
    return bandeau;
  }
  function nb(n, mot) { return n + ' ' + mot + (n > 1 ? 's' : ''); }
  function majBandeau() {
    var b = placerBandeau(), n = etat.faits.length, suite = '';
    var prochain = PALIERS.filter(function (p) { return p > n; })[0];
    if (prochain) suite = ' — encore ' + nb(prochain - n, 'exercice') + ' pour le prochain bonus';
    else if (PALIERS.length) suite = ' — tous les bonus sont atteints, bravo !';
    b.innerHTML = '<span>Bonjour <strong></strong> ! <span class="eleve-nombre"></span></span>' +
      '<button type="button">Ce n’est pas moi</button>';
    b.querySelector('strong').textContent = etat.prenom || '';
    b.querySelector('.eleve-nombre').textContent = (n ? nb(n, 'exercice') + ' compté' + (n > 1 ? 's' : '')
      : 'Aucun exercice compté pour l’instant') + suite + '.';
    b.querySelector('button').onclick = function () {
      if (confirm('Quitter le mode élève sur cet appareil ?\nPour y revenir : rouvrir le lien reçu sur l’ENT.')) {
        oublier();
        location.reload();
      }
    };
  }
  function bandeauInconnu() {
    placerBandeau().textContent = 'Ce lien personnel n’est pas reconnu : vérifiez le lien reçu sur ' +
      'l’ENT, ou demandez-en un nouveau à votre professeur.';
  }

  // ---------- corrigés verrouillés 5 minutes ----------
  function idDe(det) {
    var b = det.querySelector('.marteau[data-exo]');
    return b ? b.dataset.exo : null;
  }
  // ms restantes avant l'ouverture permise ; null : pas encore commencé
  function restant(id) {
    var o = etat.ouverts[id];
    return o ? Math.max(0, ATTENTE * 1000 - (Date.now() - o)) : null;
  }
  function verrouille(id) {
    if (fait(id)) return false;
    var r = restant(id);
    return r === null || r > 0;
  }
  function duree(ms) {
    var s = Math.ceil(ms / 1000), m = Math.floor(s / 60);
    return (m ? m + ' min ' : '') + (s % 60 < 10 && m ? '0' : '') + (s % 60) + ' s';
  }
  function majCorriges() {
    document.querySelectorAll('details.corrige').forEach(function (det) {
      var id = idDe(det), s = det.querySelector('summary');
      if (!id || !s) return;
      if (!s.dataset.texte) s.dataset.texte = s.textContent;
      var r = restant(id), bloque = verrouille(id);
      det.classList.toggle('eleve-verrou', bloque);
      s.textContent = s.dataset.texte + (bloque && r !== null ? ' — disponible dans ' + duree(r) : '');
      var msg = det.previousElementSibling;
      if (msg && msg.classList.contains('eleve-attente') && !(bloque && r !== null)) msg.remove();
    });
  }
  function attendre(det, id) {
    var msg = det.previousElementSibling;
    if (!msg || !msg.classList.contains('eleve-attente')) {
      msg = document.createElement('p');
      msg.className = 'eleve-attente';
      det.before(msg);
    }
    msg.textContent = 'Cherchez d’abord l’exercice dans votre cahier : la correction s’ouvrira ' +
      '5 minutes après votre premier clic sur « Corrigé ».';
    majCorriges();
  }
  document.addEventListener('click', function (ev) {
    var s = ev.target.closest && ev.target.closest('summary');
    var det = s && s.parentElement;
    if (!det || !det.matches('details.corrige')) return;
    var id = idDe(det);
    if (!id || !verrouille(id)) return;
    ev.preventDefault();
    if (!etat.ouverts[id]) {
      etat.ouverts[id] = Date.now();
      ecrire(etat);
      poster({id: id, action: 'ouvrir'}).then(function (j) {
        if (j && j.ok && j.ouvert) { etat.ouverts[id] = j.ouvert; ecrire(etat); majCorriges(); }
      }).catch(function () {});
    }
    attendre(det, id);
  }, true);
  // autres ouvertures (« tout ouvrir », lien #corrige-N) : refermé tant que verrouillé
  document.addEventListener('toggle', function (ev) {
    var det = ev.target;
    if (!det.open || !det.matches || !det.matches('details.corrige')) return;
    var id = idDe(det);
    if (id && verrouille(id)) det.open = false;
  }, true);
  setInterval(function () {
    if (document.querySelector('details.corrige.eleve-verrou')) majCorriges();
  }, 1000);

  function demarrer() {
    majBandeau();
    majCorriges();
    synchroniser();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
