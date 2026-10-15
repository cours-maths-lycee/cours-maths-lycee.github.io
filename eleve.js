var FDM_ELEVE_CONFIG = {"api": "https://script.google.com/macros/s/AKfycbw1z92aBm9Ru_Q-sIKm3kxSIETlIhYPdYRLTqVQKpBnKKpeSkP5qzy-l6kKetmIPLoo/exec", "bonus": 10};
/* Mode élève du site « Faire des maths » (chargé par toutes les pages, sans defer,
   avant marteau.js).
   publier.py écrit avant ce fichier : var FDM_ELEVE_CONFIG = {api: <web app
   Google Apps Script, scripts/site/compteurs_google.gs>, bonus: 10} (un bonus tous les
   10 exercices comptés).
   Lien personnel envoyé par l'ENT (scripts/eleves.py) :
     https://faire-des-maths.fr/#eleve=K7F3QXPM&prenom=L%C3%A9a
   Le fragment (#…) n'est jamais envoyé au serveur du site ni au compteur de
   visites ; il est gardé dans le navigateur (localStorage), puis retiré de
   l'adresse. Le serveur des compteurs ne connaît que le code, jamais le prénom.
   Mode actif :
   - bandeau « Bonjour Léa », nombre d'exercices comptés, bonus obtenus et prochain
     bonus ;
   - corrigés libres : l'élève les ouvre quand il veut (confiance ; le professeur
     vérifie le cahier) ;
   - bouton marteau (marteau.js) : l'exercice est compté une seule fois ; le
     serveur donne un mot-code, à recopier sur le cahier à côté du numéro de
     l'exercice.
   window.FDM_ELEVE : {prenom, fait(id), mot(id), nombre(), envoyerFait(id)} ; l'événement
   « fdm-eleve » (document) signale une mise à jour. */
(function () {
  'use strict';
  var CFG = window.FDM_ELEVE_CONFIG || {};
  var API = CFG.api, BONUS = CFG.bonus || 0;
  var AIDE = document.currentScript ? new URL('mode-emploi.html#mode-eleve', document.currentScript.src).href
    : null;
  var CLE = 'fdm-eleve:v1';
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
              faits: avant && avant.code === code ? avant.faits : []});
    }
    history.replaceState(null, '', location.pathname + location.search);
  }
  var etat = lire();
  if (!API || !etat || !etat.code) return;
  etat.faits = etat.faits || [];
  etat.mots = etat.mots || {};
  delete etat.ouverts;   // anciennes versions : corrigés verrouillés 5 minutes
  delete etat.places;

  function fait(id) { return etat.faits.indexOf(id) >= 0; }
  function signaler() {
    ecrire(etat);
    majBandeau();
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
        if (j.mot) etat.mots[id] = j.mot;
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
        etat.mots = j.mots || {};
        signaler();
      })
      .catch(function () {});
  }
  function oublier() { ecrire(null); window.FDM_ELEVE = null; }

  window.FDM_ELEVE = {
    prenom: etat.prenom,
    fait: fait,
    mot: function (id) { return etat.mots[id] || ''; },
    nombre: function () { return etat.faits.length; },
    envoyerFait: envoyerFait
  };

  // ---------- bandeau ----------
  var css = [
    '.eleve-bandeau{display:flex;flex-wrap:wrap;gap:.3rem 1rem;align-items:center;justify-content:space-between;',
    ' padding:.5rem max(16px,calc((100vw - 900px)/2));background:var(--accent-fond);color:var(--texte);',
    ' border-bottom:1px solid var(--trait);font:.95rem/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
    '.eleve-bandeau strong{color:var(--accent)}',
    '.eleve-bandeau a{color:var(--accent);white-space:nowrap}',
    '.eleve-bandeau button{font:inherit;font-size:.85rem;cursor:pointer;border:1px solid var(--trait);',
    ' border-radius:5px;background:transparent;color:var(--doux);padding:.15rem .6rem}',
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
  // un bonus tous les BONUS exercices : bonus obtenus, puis exercices avant le prochain
  function texteBonus(n) {
    if (!BONUS) return '';
    var k = Math.floor(n / BONUS);
    return ' — ' + (k ? k + ' bonus obtenu' + (k > 1 ? 's' : '') + ', encore '
      : 'encore ') + nb(BONUS - n % BONUS, 'exercice') + ' pour le prochain bonus';
  }
  function majBandeau() {
    var b = placerBandeau(), n = etat.faits.length, suite = texteBonus(n);
    b.innerHTML = '<span>Bonjour <strong></strong> ! <span class="eleve-nombre"></span>' +
      (AIDE ? ' <a href="' + AIDE + '">Comment ça marche ?</a>' : '') + '</span>' +
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

  function demarrer() {
    majBandeau();
    synchroniser();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
