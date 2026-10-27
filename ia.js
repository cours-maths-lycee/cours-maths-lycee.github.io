/* Bouton « Poser une question à une IA » (prototype ; scripts/tex2html.py, bouton_ia).
   <details class="ia" data-genre data-titre data-niveau data-chapitre data-source
   data-corrige> : le texte de l'exercice (et de son corrigé), de la méthode ou de
   la partie, en LaTeX, part avec la question de l'élève.
   Le texte est toujours copié dans le presse-papiers ; il est aussi passé dans
   l'adresse de l'IA quand elle l'accepte et qu'il n'est pas trop long. Ces
   paramètres ne sont pas documentés par les éditeurs : s'ils cessent de marcher,
   l'élève colle le texte. gemini.google.com et Le Chat ne les acceptent pas (essai
   du professeur : app?q=, app?prompt=, ?q=, guided-learning?query=) ; Gemini passe
   par le mode IA de la recherche Google (udm=50), sans compte ; Le Chat : « Copier
   pour une autre IA », puis coller. */
(function () {
  'use strict';
  // adresse avec le texte, adresse sans (texte à coller)
  var IA = {
    gemini: ['https://www.google.com/search?udm=50&q=', 'https://gemini.google.com/app'],
    chatgpt: ['https://chatgpt.com/?q=', 'https://chatgpt.com/'],
    claude: ['https://claude.ai/new?q=', 'https://claude.ai/new']
  };
  var LONGUEUR_MAX = 7000;   // adresse encodée : au-delà, certaines IA tronquent ou refusent

  function texte(d, question) {
    var s = d.dataset;
    var t = 'Je suis élève de ' + s.niveau + '. Je travaille le chapitre « ' + s.chapitre +
      ' » de mon cours de mathématiques. Voici ' + s.genre + (s.titre ? ' (« ' + s.titre + ' »)' : '') +
      ', écrit en LaTeX ([figure] : une figure qui n\'est pas jointe ; \\cas, \\justif, \\explique, ' +
      '\\res : mise en page de mon professeur).\n\n```latex\n' + s.source + '\n```\n';
    if (s.corrige) t += '\nVoici le corrigé de mon professeur :\n\n```latex\n' + s.corrige + '\n```\n';
    t += '\nRéponds-moi en français, simplement, comme un professeur patient. ' +
      'Ne me donne pas la solution complète d\'un coup : aide-moi pas à pas, ' +
      'avec des questions qui me font avancer. Suis les méthodes et les notations de ce cours, ' +
      'sans notion au-delà de mon niveau. Écris les formules simplement.\n\nMa question : ' + question;
    return t;
  }

  // copie : presse-papiers moderne, sinon zone de texte provisoire (page hors https)
  function copier(t) {
    var z = document.createElement('textarea');
    z.value = t; z.setAttribute('readonly', ''); z.style.position = 'fixed'; z.style.opacity = '0';
    document.body.appendChild(z); z.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(z);
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).catch(function () {});
    return ok || !!(navigator.clipboard && window.isSecureContext);
  }

  document.querySelectorAll('details.ia').forEach(function (d) {
    var zone = d.querySelector('textarea'), etat = d.querySelector('.ia-etat');
    d.querySelectorAll('button[data-ia]').forEach(function (b) {
      b.onclick = function () {
        var t = texte(d, zone.value.trim()), copie = copier(t), ia = IA[b.dataset.ia];
        if (!ia) {
          etat.textContent = copie ? 'Texte copié : colle-le dans l\'IA de ton choix (Gemini, Le Chat…).'
            : 'La copie a échoué : sélectionne le texte à la main.';
          return;
        }
        var adresse = ia[0] && encodeURIComponent(t).length <= LONGUEUR_MAX
          ? ia[0] + encodeURIComponent(t) : null;
        window.open(adresse || ia[1], '_blank', 'noopener');
        etat.textContent = adresse
          ? 'Texte envoyé (et copié). S\'il n\'apparaît pas dans l\'IA, colle-le.'
          : 'Texte copié : colle-le dans l\'IA (appui long, puis « Coller »).';
      };
    });
  });
})();
