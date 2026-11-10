/* Mesure d'audience du site « Faire des maths » (Umami Cloud, sans cookies) : chargé
   par toutes les pages, en defer, juste avant umami.js (site_commun.SCRIPT_COMPTEUR).
   Rien de personnel n'est envoyé : ni code ni prénom du mode élève, ni texte libre
   (question à l'IA, suggestion, recherche dans l'index) ; seulement des pages, des
   numéros d'exercice ou de méthode et des identifiants d'exercice (% exo: …).

   Profil des visites (étiquette « tag » d'Umami, filtre du tableau de bord) :
   « élève » quand le mode élève est actif sur l'appareil (lien personnel de l'ENT),
   « visiteur » sinon (élèves sans lien personnel compris).
   Visites du professeur : ouvrir une fois https://faire-des-maths.fr/#sans-mesure sur
   chacun de ses appareils (et navigateurs) ; #avec-mesure rétablit la mesure.

   Événements (nom : données)
   - pdf, tex : fichier (lien ouvert depuis le site)
   - ouverture AVJ, ouverture corrigé, ouverture fiche, ouverture réponses,
     ouverture IA : page, ancre (methode-N, exercice-N), exo (identifiant)
   - exercice fait : page, ancre, exo (bouton marteau)
   - question IA : ia, page, ancre, exo ; sur « Se tester » : exercice (n° du DS blanc)
   - DS blanc commencé : page ; bilan Se tester : page, questions (réussies/total),
     acquises, travail (méthodes à retravailler) ; retravailler : page, methode, lien
     (envoyés par se-tester.js)
   - diaporama : page, progression (25, 50, 75, 100 %)
   - merci : page ; suggestion envoyée : niveau (envoyé par suggestions.js)
   - index : volet (méthodes, thématique), entree */
(function () {
  'use strict';
  try {
    if (location.hash === '#sans-mesure') localStorage.setItem('umami.disabled', '1');
    if (location.hash === '#avec-mesure') localStorage.removeItem('umami.disabled');
  } catch (e) {}

  function estEleve() {
    if (/(^|[#&])eleve=/.test(location.hash)) return true;
    try { var o = JSON.parse(localStorage.getItem('fdm-eleve:v1')); return !!(o && o.code); }
    catch (e) { return false; }
  }
  var u = document.querySelector('script[data-website-id]');
  if (u) u.setAttribute('data-tag', estEleve() ? 'élève' : 'visiteur');

  function track(nom, donnees) {
    if (window.umami && window.umami.track) window.umami.track(nom, donnees);
  }
  window.umTrack = track;

  function page() { return location.pathname.replace(/index\.html$/, ''); }
  function texte(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, 120) : ''; }

  // exercice (section.exo et son identifiant) ou méthode qui contient ou précède el
  function lieu(el) {
    var d = {page: page()}, exo = el.closest('section.exo');
    if (exo) {
      d.ancre = exo.id;
      var m = exo.querySelector('[data-exo]');
      if (m) d.exo = m.dataset.exo;
      return d;
    }
    var ancre = '';
    document.querySelectorAll('[id^="methode-"], [id^="exercice-"]').forEach(function (e) {
      if (/^(methode|exercice)-\d+$/.test(e.id) &&
          (el.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_PRECEDING)) ancre = e.id;
    });
    if (ancre) d.ancre = ancre;
    return d;
  }

  // clics : PDF et .tex, marteau, IA, cœur, index
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var a = t.closest('a[href]');
    if (a && /\.(pdf|tex)(#|$)/i.test(a.getAttribute('href'))) {
      var nom = a.getAttribute('href').split('#')[0];
      track(/\.tex$/i.test(nom) ? 'tex' : 'pdf', {fichier: nom.split('/').pop()});
      return;
    }
    var b = t.closest('button.marteau[data-exo]');
    if (b) {
      var E = window.FDM_ELEVE;   // mode élève : un exercice déjà compté ne compte plus
      if (!b.mtEnCours && !(E && E.fait(b.dataset.exo))) track('exercice fait', lieu(b));
      return;
    }
    b = t.closest('details.ia button[data-ia]');
    if (b) {
      var d = lieu(b), z = b.closest('details.ia'), n = /^Exercice (\d+)/.exec(z.dataset.titre || '');
      d.ia = b.dataset.ia;
      if (document.getElementById('st-donnees') && n) d.exercice = n[1];
      track('question IA', d);
      return;
    }
    b = t.closest('button.coeur[data-page]');
    if (b) {
      var deja = false;
      try { deja = !!localStorage.getItem('fdm-merci:' + b.dataset.page); } catch (x) {}
      if (!deja) track('merci', {page: b.dataset.page});
      return;
    }
    if (a && /\/index\/(index\.html)?$/.test(location.pathname)) {
      var li = a.closest('li');
      if (!li) return;
      var terme = li.querySelector(':scope > .terme');
      if (terme) {
        var parent = li.parentElement.closest('li'), pt = parent && parent.querySelector(':scope > .terme');
        track('index', {volet: 'thématique', entree: (pt ? texte(pt) + ' / ' : '') + texte(terme)});
      } else track('index', {volet: 'méthodes', entree: texte(li.querySelector('a'))});
    }
  }, true);   // capture : avant les boutons, qui changent leur état au clic

  // volets ouverts
  var TYPES = {'avj': 'ouverture AVJ', 'corrige': 'ouverture corrigé', 'exercices': 'ouverture fiche',
               'reponses': 'ouverture réponses', 'ia': 'ouverture IA'};
  document.addEventListener('toggle', function (e) {
    var d = e.target;
    if (!d.open || !d.classList) return;
    for (var c in TYPES) if (d.classList.contains(c)) { track(TYPES[c], lieu(d)); return; }
  }, true);

  // diaporamas reveal.js (Mieux apprendre) : jusqu'où va-t-on ?
  function suivreDiaporama() {
    var R = window.Reveal;
    if (!R || !R.on || !R.getProgress) return;
    var atteint = 0;
    function voir() {
      var p = R.isLastSlide && R.isLastSlide() ? 100 : Math.floor(R.getProgress() * 4) * 25;
      while (atteint < p) { atteint += 25; track('diaporama', {page: page(), progression: atteint}); }
    }
    R.on('slidechanged', voir);
  }
  if (document.readyState === 'complete') suivreDiaporama();
  else window.addEventListener('load', suivreDiaporama);
})();
