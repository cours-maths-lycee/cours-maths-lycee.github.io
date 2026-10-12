var FDM = {"url": "https://script.google.com/macros/s/AKfycbxtxXFwdiC_r2j1vf67upimHgl-CLojKReH_HgVRhgmDH5CQ4FYV4wOKcN2NydvNWdc/exec", "site": "https://faire-des-maths.fr/", "chapitres": {"2nde/01_Fractions_et_puissances": ["2nde", "Chapitre 1 — Fractions et puissances"], "2nde/02_Fonctions": ["2nde", "Chapitre 2 — Intervalles et fonctions"], "2nde/03_Vecteurs": ["2nde", "Chapitre 3 — Vecteurs"], "2nde/04_Calcul_litteral": ["2nde", "Chapitre 4 — Calcul littéral"], "2nde/05_Variations_signe_et_inequations": ["2nde", "Chapitre 5 — Variations, signe et inéquations"], "2nde/06_Ensembles_de_nombres_et_racines_carrees": ["2nde", "Chapitre 6 — Ensembles de nombres et racines carrees"], "2nde/07_Pourcentages": ["2nde", "Chapitre 7 — Pourcentages"], "2nde/08_Vecteurs_et_trigo": ["2nde", "Chapitre 8 — Vecteurs et trigo"], "2nde/09_Equations_cartesiennes_de_droites": ["2nde", "Chapitre 9 — Equations cartesiennes de droites"], "2nde/10_Fonctions_de_reference": ["2nde", "Chapitre 10 — Fonctions de reference"], "2nde/11_Probas": ["2nde", "Chapitre 11 — Probas"], "2nde/12_Statistiques": ["2nde", "Chapitre 12 — Statistiques"], "2nde/13_Systemes": ["2nde", "Chapitre 13 — Systemes"], "1ere-spe/01_Calcul_litteral": ["1ère spécialité", "Chapitre 1 — Calcul littéral"], "1ere-spe/02_Fonctions": ["1ère spécialité", "Chapitre 2 — Fonctions"], "1ere-spe/03_Second_degre": ["1ère spécialité", "Chapitre 3 — Le second degré"], "1ere-spe/04_Derivation": ["1ère spécialité", "Chapitre 4 — Dérivation"], "1ere-spe/05_Suites": ["1ère spécialité", "Chapitre 5 — Suites numériques"], "1ere-spe/06_Probabilites_conditionnelles": ["1ère spécialité", "Chapitre 6 — Probabilites conditionnelles"], "1ere-spe/07_Suites_arithmetiques_geometriques": ["1ère spécialité", "Chapitre 7 — Suites arithmétiques et géométriques"], "1ere-spe/08_Geometrie_dans_un_repere": ["1ère spécialité", "Chapitre 8 — Geometrie dans un repere"], "1ere-spe/09_Trigonometrie": ["1ère spécialité", "Chapitre 9 — Trigonometrie"], "1ere-spe/10_Produit_scalaire": ["1ère spécialité", "Chapitre 10 — Produit scalaire"], "1ere-spe/11_Exponentielles": ["1ère spécialité", "Chapitre 11 — Exponentielles"], "1ere-spe/12_Statistiques": ["1ère spécialité", "Chapitre 12 — Statistiques"], "1ere-specifique/01_Suites": ["1ère spécifique", "Chapitre 1 — Suites numériques"], "1ere-specifique/02_Fonctions_affines_pourcentages": ["1ère spécifique", "Chapitre 2 — Fonctions affines et pourcentages"], "1ere-specifique/03_Calcul_litteral_second_degre": ["1ère spécifique", "Chapitre 3 — Calcul littéral et second degré"], "1ere-sti2d/01_Calcul_litteral": ["1ère STI2D", "Chapitre 1 — Calcul littéral"], "1ere-sti2d/02_Fonctions": ["1ère STI2D", "Chapitre 2 — Fonctions"], "1ere-sti2d/03_Polynomes_second_degre": ["1ère STI2D", "Chapitre 3 — Polynômes du second degré"], "1ere-sti2d/04_Suites_numeriques": ["1ère STI2D", "Chapitre 4 — Suites numériques"], "1ere-sti2d/05_Derivation_etude_de_fonctions": ["1ère STI2D", "Chapitre 5 — Dérivation et étude de fonctions"], "1ere-sti2d/06_Produit_scalaire": ["1ère STI2D", "Chapitre 6 — Produit scalaire"], "1ere-sti2d/07_Trigonometrie": ["1ère STI2D", "Chapitre 7 — Trigonometrie"], "1ere-sti2d/08_Nombres_complexes": ["1ère STI2D", "Chapitre 8 — Nombres complexes"], "1ere-sti2d/09_Primitives": ["1ère STI2D", "Chapitre 9 — Primitives"], "1ere-sti2d/10_Probabilites_conditionnelles": ["1ère STI2D", "Chapitre 10 — Probabilites conditionnelles"], "1ere-sti2d/11_Variables_aleatoires_Bernouilli": ["1ère STI2D", "Chapitre 11 — Variables aleatoires Bernouilli"], "1ere-sti2d/12_Statistiques": ["1ère STI2D", "Chapitre 12 — Statistiques"]}};
/* Mode « Suggérer des améliorations » (page contribuer.html).
   publier.py écrit avant ce fichier : var FDM = {url: <web app Google Apps Script>,
   site: <adresse publique>,
   chapitres: {"<niveau>/<dossier>": [<niveau>, <chapitre>]}}.
   Mode actif : bandeau en haut de chaque page et, à chaque passage (partie,
   définition, propriété, méthode, exemple corrigé, exercice, corrigé), un bouton
   qui ouvre le formulaire ; celui-ci envoie aussi le niveau, le chapitre, le
   passage et son lien précis. Le mode est gardé dans le navigateur
   (localStorage) ; ?suggestions=1 ou ?suggestions=0 dans l'adresse le règle. */
(function () {
  var CLE = 'fdm-suggestions';
  function lire() { try { return localStorage.getItem(CLE) === '1'; } catch (e) { return false; } }
  function ecrire(v) {
    try { if (v) localStorage.setItem(CLE, '1'); else localStorage.removeItem(CLE); } catch (e) {}
  }
  var q = /[?&]suggestions=([01])/.exec(location.search);
  if (q) ecrire(q[1] === '1');
  var actif = lire();
  // l'adresse porte toujours le réglage : le stockage peut manquer (pages
  // ouvertes en local, navigation privée)
  function avecMode(href, v) {
    var m = /^([^?#]*)(\?[^#]*)?(#.*)?$/.exec(href);
    var q = (m[2] || '').replace(/[?&]suggestions=[01]/, '').replace(/^&/, '?');
    return m[1] + (q ? q + '&' : '?') + 'suggestions=' + (v ? 1 : 0) + (m[3] || '');
  }
  window.FDM_SUGGESTIONS = {
    actif: actif,
    basculer: function (v, retour) {
      ecrire(v); location.href = avecMode(retour || location.href.split('#')[0], v);
    }
  };
  document.documentElement.classList.toggle('mode-suggestions', actif);
  if (!actif) return;

  var css = [
    '.sugg-bandeau{position:sticky;top:0;z-index:20;display:flex;flex-wrap:wrap;gap:.4rem 1rem;align-items:center;',
    ' justify-content:space-between;padding:.55rem max(16px,calc((100vw - 900px)/2));background:var(--accent);',
    ' color:var(--fond);font:600 .95rem/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
    '.sugg-bandeau a{color:inherit}',
    '.sugg-bandeau button{font:inherit;cursor:pointer;border:1px solid currentColor;border-radius:5px;',
    ' background:transparent;color:inherit;padding:.2rem .7rem}',
    '.sugg{display:block;margin:.3rem 0 .6rem auto;font:600 .85rem/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;',
    ' cursor:pointer;color:var(--accent);background:var(--accent-fond);border:1px dashed var(--accent);',
    ' border-radius:5px;padding:.25rem .65rem}',
    '.sugg:hover{border-style:solid}',
    'dialog.sugg-form{width:min(780px,calc(100vw - 32px));max-height:calc(100vh - 32px);border:1px solid var(--trait);',
    ' border-radius:8px;padding:1.1rem 1.2rem;background:var(--carte);color:var(--texte);',
    ' font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
    'dialog.sugg-form::backdrop{background:rgba(0,0,0,.45)}',
    '.sugg-form h2{margin:0 0 .3rem;font-size:1.2rem}',
    '.sugg-form .passage{margin:0 0 .8rem;color:var(--doux);font-size:.9rem;overflow-wrap:anywhere}',
    '.sugg-form form{display:flex;flex-direction:column;gap:.75rem}',
    '.sugg-form label{display:flex;flex-direction:column;gap:.2rem;font-weight:600}',
    '.sugg-form input,.sugg-form textarea{font:inherit;font-weight:400;padding:.45rem .6rem;border:1px solid var(--trait);',
    ' border-radius:5px;background:var(--fond);color:var(--texte)}',
    '.sugg-form .piege{display:none}',
    '.sugg-form .extrait-titre{font-weight:600;margin-bottom:-.5rem}',
    '.sugg-form .extrait{max-height:45vh;overflow:auto;border:1px solid var(--trait);border-radius:6px;',
    ' padding:.2rem .7rem;background:var(--fond);font:16px/1.55 "Palatino Linotype","Book Antiqua",Palatino,Georgia,serif}',
    '.sugg-form .extrait>*{margin:.4rem 0}',
    '.sugg-form .boutons{display:flex;gap:.7rem;flex-wrap:wrap}',
    '.sugg-form button{font:inherit;font-weight:600;cursor:pointer;border-radius:6px;padding:.5rem 1rem;',
    ' border:1px solid var(--accent)}',
    '.sugg-form button[type=submit]{background:var(--accent);color:var(--fond)}',
    '.sugg-form button.annuler{background:transparent;color:var(--accent)}',
    '.sugg-form button:disabled{opacity:.6}',
    '.sugg-form .etat{margin:0;color:var(--doux);font-size:.9rem}'
  ].join('\n');

  function texte(el) {
    // formules KaTeX : leur source entre $, plus lisible qu'un double rendu
    var c = el.cloneNode(true);
    c.querySelectorAll('.katex').forEach(function (k) {
      var a = k.querySelector('annotation');
      k.replaceWith(a ? '$' + a.textContent + '$' : (k.querySelector('.katex-html') || k).textContent);
    });
    c.querySelectorAll('.sugg, .sur-titre').forEach(function (b) { b.remove(); });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }

  // niveau, chapitre et adresse publique de la page (aussi en local, file://)
  function contexte() {
    var p = location.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    for (var i = 0; i + 1 < p.length; i++) {
      var ch = FDM.chapitres[p[i] + '/' + p[i + 1]];
      if (ch) return [ch[0], ch[1], FDM.site + p.slice(i).join('/')];
    }
    return ['', '', FDM.site + (p[p.length - 1] || '')];
  }

  // Passages : [sélecteur, où placer le bouton, description]
  function titreBoite(el) {
    var b = el.closest('section[id]'), h = b && b.querySelector('h3');
    return h ? texte(h) : '';
  }
  var PASSAGES = [
    ['h1.titre-partie[id], h2.partie[id]', 'apres', function (el) { return 'Partie : ' + texte(el); }],
    ['section.boite[id]', 'titre', function (el) { return titreBoite(el); }],
    ['section.boite details.correction:not(.avj)', 'fin', function (el) { return titreBoite(el) + ' — exemple corrigé'; }],
    ['section.boite h4.etape', 'apres', function (el) { return titreBoite(el) + ' — énoncé du « À vous de jouer »'; },
      function (el) { return /vous de jouer/.test(el.textContent); }],
    ['section.boite details.correction.avj', 'fin', function (el) { return titreBoite(el) + ' — correction du « À vous de jouer »'; }],
    ['section.exo[id]', 'titre', function (el) { return titreBoite(el) + ' — énoncé'; }],
    ['details.corrige[id]', 'fin', function (el) { return titreBoite(el) + ' — corrigé'; }]
  ];

  var dialogue, formulaire, etat, cible = {}, ouverture = 0;

  function construireDialogue() {
    dialogue = document.createElement('dialog');
    dialogue.className = 'sugg-form';
    dialogue.innerHTML =
      '<h2>Suggérer une amélioration</h2><p class="passage"></p>' +
      '<form><input type="text" name="site_web" class="piege" tabindex="-1" autocomplete="off">' +
      '<label>Nom<input type="text" name="nom" required maxlength="100" autocomplete="name"></label>' +
      '<label>Adresse électronique<input type="email" name="email" required maxlength="200" autocomplete="email"></label>' +
      '<div class="extrait-titre">Passage concerné</div><div class="extrait"></div>' +
      '<label>Problème repéré<textarea name="probleme" rows="4" required maxlength="4000"></textarea></label>' +
      '<label>Amélioration proposée<textarea name="amelioration" rows="4" required maxlength="4000"></textarea></label>' +
      '<label class="calcul"></label>' +
      '<div class="boutons"><button type="submit">Envoyer</button>' +
      '<button type="button" class="annuler">Annuler</button></div>' +
      '<p class="etat" role="status"></p>' +
      '<p class="etat">Votre nom et votre adresse ne servent qu\'à vous répondre : ils ne sont ni publiés ni transmis.</p></form>';
    document.body.appendChild(dialogue);
    formulaire = dialogue.querySelector('form');
    etat = dialogue.querySelector('.etat');
    dialogue.querySelector('.annuler').onclick = function () { dialogue.close(); };
    formulaire.addEventListener('submit', envoyer);
  }

  // copie du passage, sous les yeux pendant la rédaction : énoncé seul pour
  // un exercice, corrections dépliées, sans boutons ni identifiants
  function extrait(el) {
    var c = el.cloneNode(true);
    if (el.matches('h4.etape')) {
      // « À vous de jouer » : le titre et la suite, jusqu'aux réponses
      c = document.createElement('div');
      for (var x = el; x && !(x !== el && x.matches('h4, details')); x = x.nextElementSibling)
        if (!x.matches('.sugg')) c.appendChild(x.cloneNode(true));
    }
    c.querySelectorAll('.sugg' + (el.matches('section.exo') ? ', details.corrige' : ''))
      .forEach(function (x) { x.remove(); });
    [c].concat([].slice.call(c.querySelectorAll('[id]'))).forEach(function (x) { x.removeAttribute('id'); });
    [c].concat([].slice.call(c.querySelectorAll('details'))).forEach(function (x) { if (x.tagName === 'DETAILS') x.open = true; });
    return c;
  }

  function ouvrir(passage, lien, el) {
    if (!dialogue) construireDialogue();
    var ctx = contexte(), a = 2 + Math.floor(Math.random() * 8), b = 2 + Math.floor(Math.random() * 8);
    cible = {niveau: ctx[0], chapitre: ctx[1], passage: passage, lien: lien, a: a, b: b};
    dialogue.querySelector('.passage').textContent = passage;
    var zone = dialogue.querySelector('.extrait');
    zone.innerHTML = '';
    zone.appendChild(extrait(el));
    zone.scrollTop = 0;
    dialogue.querySelector('.calcul').innerHTML = 'Contre les robots : combien font ' + a + ' × ' + b +
      ' ?<input type="text" name="calcul" required inputmode="numeric" maxlength="3" autocomplete="off">';
    etat.textContent = '';
    ouverture = Date.now();
    if (dialogue.showModal) dialogue.showModal(); else dialogue.setAttribute('open', '');
  }

  function envoyer(e) {
    e.preventDefault();
    var f = formulaire, bouton = f.querySelector('button[type=submit]');
    if (+f.calcul.value.trim() !== cible.a * cible.b) { etat.textContent = 'Le calcul n\'est pas juste.'; return; }
    if (!FDM.url) { etat.textContent = 'Le dépôt des suggestions n\'est pas encore ouvert.'; return; }
    var d = new URLSearchParams();
    ['nom', 'email', 'probleme', 'amelioration', 'calcul', 'site_web'].forEach(function (n) { d.append(n, f[n].value); });
    ['niveau', 'chapitre', 'passage', 'lien', 'a', 'b'].forEach(function (n) { d.append(n, cible[n]); });
    d.append('duree', Math.round((Date.now() - ouverture) / 1000));
    bouton.disabled = true; etat.textContent = 'Envoi en cours…';
    fetch(FDM.url, {method: 'POST', body: d})
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (r.ok) {
          ['probleme', 'amelioration', 'calcul'].forEach(function (n) { f[n].value = ''; });
          etat.textContent = 'Merci ! Votre proposition est enregistrée.';
          setTimeout(function () { dialogue.close(); }, 1800);
        } else etat.textContent = 'L\'envoi a échoué : ' + (r.erreur || 'erreur inconnue') + '.';
      })
      .catch(function () { etat.textContent = 'L\'envoi a échoué : vérifiez votre connexion.'; })
      .finally(function () { bouton.disabled = false; });
  }

  function bouton(passage, lien, el) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'sugg';
    b.textContent = '✎ Suggérer une amélioration';
    b.onclick = function (e) { e.preventDefault(); e.stopPropagation(); ouvrir(passage, lien, el); };
    return b;
  }

  function demarrer() {
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
    var accueil = document.querySelector('.bandeau a');
    var racine = accueil ? accueil.getAttribute('href').replace(/index\.html$/, '') : '';
    var bandeau = document.createElement('div');
    bandeau.className = 'sugg-bandeau';
    bandeau.innerHTML = '<span>Mode « Suggérer des améliorations » : un bouton à chaque passage. ' +
      '<a href="' + racine + 'contribuer.html">Comment faire</a></span>' +
      '<button type="button">Quitter ce mode</button>';
    bandeau.querySelector('button').onclick = function () { window.FDM_SUGGESTIONS.basculer(false); };
    document.body.insertBefore(bandeau, document.body.firstChild);

    // liens internes : le mode suit, même sans stockage
    document.querySelectorAll('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (/^(#|[a-z]+:|\/\/)/i.test(h) || !/\.html([?#]|$)/.test(h)) return;
      a.setAttribute('href', avecMode(h, true));
    });

    var adresse = contexte()[2];
    PASSAGES.forEach(function (p) {
      document.querySelectorAll(p[0]).forEach(function (el) {
        if (p[3] && !p[3](el)) return;
        var ancre = el.id ? el : el.closest('[id]');
        var b = bouton(p[2](el), adresse + (ancre ? '#' + ancre.id : ''), el);
        if (p[1] === 'apres') el.insertAdjacentElement('afterend', b);
        else if (p[1] === 'titre') (el.querySelector('h3') || el.firstChild).insertAdjacentElement('afterend', b);
        else el.appendChild(b);
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
