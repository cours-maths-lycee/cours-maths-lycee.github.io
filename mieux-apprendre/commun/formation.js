/* ==========================================================================
   Mieux apprendre — script commun aux formations
   - choisit le mode : diaporama (reveal.js) ou lecture (téléphone, ?lecture)
   - injecte les illustrations SVG (<div class="bd" data-src="images/x.svg">)
   - gère les extraits vidéo YouTube (début / fin, retour à la présentation)
   - navigation : numéro de diapositive modifiable (bas à gauche), fenêtres Plan (P)
     et Raccourcis (?), touche K pour la vidéo de la diapositive

   Extrait vidéo :
     <div class="extrait"
          data-yt="ID_YOUTUBE"            identifiant de la vidéo (vide si à retrouver)
          data-debut="1:05" data-fin="4:10"   bornes de l'extrait (m:ss ou secondes)
          data-titre="Titre affiché"
          data-credit="Chaîne ou auteur"
          data-suite="auto"></div>        passe à la diapositive suivante à la fin
   Paramètres d'adresse :
     ?lecture  force le mode lecture   ?diaporama  force le mode diaporama
   ========================================================================== */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var LARGEUR_LECTURE = 760;
  var modeLecture = params.has('lecture') ||
    (!params.has('diaporama') && !params.has('print-pdf') && window.matchMedia('(max-width: ' + LARGEUR_LECTURE + 'px)').matches);
  var deck = null;

  function secondes(v) {
    if (v == null || v === '') return null;
    var p = String(v).split(':').map(Number);
    return p.reduce(function (a, b) { return a * 60 + b; }, 0);
  }
  function horloge(s) {
    var m = Math.floor(s / 60), r = Math.round(s % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  /* ---------- Illustrations SVG injectées en ligne (pour hériter des polices et couleurs) */
  function chargerIllustrations() {
    var blocs = document.querySelectorAll('.bd[data-src]');
    return Promise.all(Array.prototype.map.call(blocs, function (el) {
      return fetch(el.getAttribute('data-src'))
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(function (t) { el.innerHTML = t; })
        .catch(function () {
          var img = document.createElement('img');
          img.src = el.getAttribute('data-src'); img.alt = el.getAttribute('data-alt') || '';
          el.appendChild(img);
        });
    }));
  }

  /* ---------- API YouTube chargée à la demande */
  var apiYT = null;
  function chargerApiYT() {
    if (apiYT) return apiYT;
    apiYT = new Promise(function (ok, ko) {
      if (window.YT && window.YT.Player) return ok(window.YT);
      var prec = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () { if (prec) prec(); ok(window.YT); };
      var s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = ko;
      document.head.appendChild(s);
      setTimeout(function () { ko(new Error('délai dépassé')); }, 8000);
    });
    return apiYT;
  }

  function sortirPleinEcran() {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
  }

  function finExtrait(el) {
    sortirPleinEcran();
    var ecran = el.querySelector('.ecran');
    if (!ecran.querySelector('.suite')) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'suite'; b.textContent = deck ? 'Extrait terminé · Suite →' : 'Extrait terminé';
      b.addEventListener('click', function () { if (deck) deck.next(); });
      ecran.appendChild(b);
      if (deck) b.focus();
    }
    if (deck && el.getAttribute('data-suite') === 'auto') setTimeout(function () { deck.next(); }, 1500);
  }

  /* En quittant une diapositive, ses vidéos sont retirées (et non mises en pause) :
     un lecteur pas encore prêt, ou le lecteur de secours sans API, continuerait sinon
     en arrière-plan. La diapositive retrouve son bouton de lancement. */
  function retirerVideo(el) {
    if (!el._lance) return;
    if (el._lecteur && el._lecteur.destroy) { try { el._lecteur.destroy(); } catch (e) {} }
    el._lecteur = null; el._lance = false;
    preparerExtrait(el);
  }
  function arreterTout() {
    var courante = deck && deck.getCurrentSlide();
    document.querySelectorAll('.extrait').forEach(function (el) {
      if (!courante || !courante.contains(el)) retirerVideo(el);
    });
    document.querySelectorAll('.defi, .memo').forEach(function (el) {
      if (el._arreter && (!courante || !courante.contains(el))) el._arreter();
    });
  }
  /* Mode lecture (page à faire défiler) : une vidéo sortie de l'écran est retirée. */
  function surveillerVideos() {
    if (!('IntersectionObserver' in window)) return;
    var obs = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) { if (!e.isIntersecting) retirerVideo(e.target); });
    });
    document.querySelectorAll('.extrait').forEach(function (el) { obs.observe(el); });
  }

  /* ---------- Défi « deux histoires à la fois »
     <div class="defi" data-pas="6" data-audio="sons/histoire.mp3" data-temps="0,4.8,…">
       <ol class="defi-ecrit"><li>phrase affichée</li>…</ol>   histoire lue à l'écran, une phrase à la fois
       <ol class="defi-oral"><li>phrase dite</li>…</ol>        histoire entendue, phrase par phrase
     </div>
     Avec la voix française du navigateur, chaque phrase écrite s'affiche quand commence
     la phrase entendue correspondante (les deux histoires restent synchronisées).
     Avec un enregistrement (data-audio, fait par outils/gen_audio.py) : la priorité, synchronisé par data-temps
     (début de chaque phrase entendue, en secondes) ; sans data-temps, ou lecture par l'enseignant :
     une phrase toutes les data-pas secondes.
     data-mode="suite" : les deux histoires l'une après l'autre (l'écrite, une phrase toutes les
     data-pas secondes, puis l'entendue en entier), pour comparer avec la manche simultanée.
     data-mode="cadence" : en même temps, mais une phrase écrite et une phrase entendue toutes les
     data-pas secondes (silence après chaque phrase entendue) : même temps total que la manche « suite ». */
  function choisirVoix() {
    if (!('speechSynthesis' in window)) return null;
    var voix = speechSynthesis.getVoices().filter(function (v) { return /^fr/i.test(v.lang); });
    if (!voix.length) return null;
    function note(v) {
      var n = 0;
      if (/fr[-_]FR/i.test(v.lang)) n += 4;
      if (/natural|online|neural/i.test(v.name)) n += 3;
      if (/denise|eloise|vivienne|henri|remy|hortense|google|am[ée]lie|thomas/i.test(v.name)) n += 2;
      return n;
    }
    return voix.sort(function (a, b) { return note(b) - note(a); })[0];
  }

  function preparerDefi(el) {
    function textes(sel) {
      return Array.prototype.map.call(el.querySelectorAll(sel + ' li'), function (li) { return li.textContent.replace(/\s+/g, ' ').trim(); });
    }
    var phrases = textes('.defi-ecrit'), orales = textes('.defi-oral');
    var pas = parseFloat(el.getAttribute('data-pas')) || 6;
    var src = el.getAttribute('data-audio');
    var suite = el.getAttribute('data-mode') === 'suite', cadence = el.getAttribute('data-mode') === 'cadence';
    el.querySelectorAll('.defi-ecrit, .defi-oral').forEach(function (n) { n.hidden = true; });

    var scene = document.createElement('div'); scene.className = 'defi-scene'; scene.setAttribute('aria-live', 'polite');
    scene.innerHTML = '<p class="defi-phrase">Lis l\'histoire qui va s\'afficher ici ' + (suite ? '<strong>puis</strong>' : '<strong>et</strong>') +
      ' écoute celle qui sera racontée. Pas de retour en arrière&nbsp;!</p>';
    var barre = document.createElement('div'); barre.className = 'defi-barre'; barre.innerHTML = '<span></span>';
    var cmd = document.createElement('div'); cmd.className = 'defi-commandes';
    var go = document.createElement('button'); go.type = 'button'; go.className = 'defi-go'; go.textContent = 'Démarrer le défi';
    var etat = document.createElement('span'); etat.className = 'defi-etat';
    cmd.appendChild(go); cmd.appendChild(etat);
    el.appendChild(scene); el.appendChild(barre); el.appendChild(cmd);

    var audio = null, audioOk = false;
    if (src) {
      audio = new Audio(); audio.preload = 'auto'; audio.src = src;
      audio.addEventListener('canplaythrough', function () { audioOk = true; majEtat(); });
      audio.addEventListener('error', function () { audio = null; majEtat(); });
    }
    function majEtat() {
      if (audioOk) { etat.textContent = 'Histoire entendue : enregistrement'; return; }
      var v = choisirVoix();
      etat.textContent = v ? 'Histoire entendue : voix « ' + v.name + ' »'
                           : 'Pas de voix française dans ce navigateur : l\'enseignant lit l\'histoire (notes).';
    }
    majEtat();
    if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', majEtat);

    var minuteurs = [], session = 0;
    el._arreter = function () {
      session++;
      minuteurs.forEach(clearTimeout); minuteurs = [];
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      if (audio) { audio.pause(); audio.currentTime = 0; }
      el.classList.remove('en-cours'); go.disabled = false;
    };

    function afficher(i) {
      scene.innerHTML = '';
      var p = document.createElement('p'); p.className = 'defi-phrase visible'; p.textContent = phrases[i];
      scene.appendChild(p);
      barre.firstChild.style.width = Math.round(100 * (i + 1) / phrases.length) + '%';
    }
    function terminer() {
      scene.innerHTML = '<p class="defi-phrase">Terminé&nbsp;! Combien de détails as-tu retenus&nbsp;?</p>';
      el.classList.remove('en-cours'); go.disabled = false; go.textContent = 'Recommencer';
      if (deck) {
        var s = document.createElement('button'); s.type = 'button'; s.className = 'defi-go suite-q'; s.textContent = 'Aux questions →';
        s.addEventListener('click', function () { deck.next(); });
        scene.appendChild(s); s.focus();
      }
    }

    go.addEventListener('click', function () {
      el._arreter();
      var ici = session;
      el.classList.add('en-cours'); go.disabled = true;
      var v = audioOk ? null : choisirVoix();
      if (suite) {
        // l'histoire écrite, puis l'histoire entendue
        phrases.forEach(function (_, i) { minuteurs.push(setTimeout(function () { if (ici === session) afficher(i); }, i * pas * 1000)); });
        minuteurs.push(setTimeout(function () {
          if (ici !== session) return;
          scene.innerHTML = '<p class="defi-phrase visible">Maintenant, écoute.</p>';
          var fin = function () { if (ici === session) minuteurs.push(setTimeout(terminer, 2500)); };
          if (audioOk) { audio.onended = fin; audio.play().catch(function () {}); }
          else if (v) orales.forEach(function (t, i) {
            var u = new SpeechSynthesisUtterance(t); u.voice = v; u.lang = v.lang; u.rate = .95;
            if (i === orales.length - 1) u.onend = fin;
            speechSynthesis.speak(u);
          });
          else minuteurs.push(setTimeout(terminer, orales.length * pas * 1000));
        }, phrases.length * pas * 1000));
        return;
      }
      var temps = (el.getAttribute('data-temps') || '').split(',').map(parseFloat);
      if (cadence && orales.length === phrases.length && (v || (audioOk && temps.length === phrases.length))) {
        // en même temps, au rythme de la manche « suite » : toutes les data-pas secondes,
        // une phrase écrite et la phrase entendue correspondante, puis un silence
        phrases.forEach(function (_, i) {
          minuteurs.push(setTimeout(function () {
            if (ici !== session) return;
            afficher(i);
            if (v) {
              var u = new SpeechSynthesisUtterance(orales[i]); u.voice = v; u.lang = v.lang; u.rate = .95;
              speechSynthesis.speak(u);
              return;
            }
            audio.currentTime = temps[i]; audio.play().catch(function () {});
            if (i < temps.length - 1) minuteurs.push(setTimeout(function () { audio.pause(); }, (temps[i + 1] - temps[i]) * 1000));
          }, i * pas * 1000));
        });
        minuteurs.push(setTimeout(function () { if (ici === session) terminer(); }, phrases.length * pas * 1000));
        return;
      }
      if (v && orales.length === phrases.length) {
        // synchronisé : la phrase écrite i apparaît au début de la phrase entendue i
        orales.forEach(function (t, i) {
          var u = new SpeechSynthesisUtterance(t); u.voice = v; u.lang = v.lang; u.rate = .95;
          u.onstart = function () { if (ici === session) afficher(i); };
          if (i === orales.length - 1) u.onend = function () {
            if (ici === session) minuteurs.push(setTimeout(terminer, 2500));
          };
          speechSynthesis.speak(u);
        });
        return;
      }
      if (audioOk && temps.length === phrases.length) {
        // enregistrement synchronisé : data-temps donne le début de chaque phrase entendue
        audio.onended = function () { if (ici === session) minuteurs.push(setTimeout(terminer, 2500)); };
        audio.play().then(function () {
          temps.forEach(function (t, i) {
            minuteurs.push(setTimeout(function () { if (ici === session) afficher(i); }, t * 1000));
          });
        }).catch(function () {});
        return;
      }
      if (audioOk) audio.play().catch(function () {});
      phrases.forEach(function (_, i) { minuteurs.push(setTimeout(function () { afficher(i); }, i * pas * 1000)); });
      minuteurs.push(setTimeout(terminer, phrases.length * pas * 1000 + 1500));
    });
  }

  /* ---------- Test « retenir des mots », avec puis sans musique
     <div class="memo" data-duree="60" data-musique="ID YouTube" data-debut="0:00">
       <ol class="memo-serie" data-avec-musique><li>mot</li>…</ol>   manche 1, avec musique
       <ol class="memo-serie"><li>mot</li>…</ol>                    manche 2, sans musique
     </div>
     Chaque manche : mémoriser (mots affichés), retenir (mots cachés), écrire, puis correction.
     La musique (data-musique) a son propre bouton, indépendant du test : on la lance,
     on attend qu'elle joue, puis on démarre la manche. Elle est préparée dès que la diapositive
     s'affiche, pour que la lecture parte tout de suite au clic. */
  function preparerMemo(el) {
    var series = Array.prototype.map.call(el.querySelectorAll('.memo-serie'), function (ol) {
      return {
        mots: Array.prototype.map.call(ol.querySelectorAll('li'), function (li) { return li.textContent.trim(); }),
        musique: ol.hasAttribute('data-avec-musique')
      };
    });
    var duree = parseFloat(el.getAttribute('data-duree')) || 60;
    var idMusique = el.getAttribute('data-musique'), debutMusique = secondes(el.getAttribute('data-debut')) || 0;
    var PHASES = ['Mémorise les mots', 'Garde-les en tête, sans rien écrire', 'Écris tous les mots dont tu te souviens'];
    el.querySelectorAll('.memo-serie').forEach(function (n) { n.hidden = true; });
    el.insertAdjacentHTML('beforeend',
      '<div class="memo-tete"><span class="memo-etape"></span><output class="memo-chrono"></output></div>' +
      '<div class="memo-scene"></div><div class="memo-bas"><div class="memo-commandes"></div><div class="memo-son"></div></div>');
    var etape = el.querySelector('.memo-etape'), chrono = el.querySelector('.memo-chrono');
    var scene = el.querySelector('.memo-scene'), cmd = el.querySelector('.memo-commandes');
    var manche = 0, minuteur = null;

    /* --- la musique, pilotée à part : le lecteur YouTube, son seul ;
       si YouTube refuse la lecture hors de son site (erreur 101 ou 150), le bouton ouvre la vidéo dans un nouvel onglet. */
    var mode = null, lecteur = null, pret = false, joue = false, demande = false, prepare = false;
    var bSon = null, cache = null;
    if (idMusique) {
      bSon = document.createElement('button'); bSon.type = 'button'; bSon.className = 'defi-go memo-bouton-son';
      el.querySelector('.memo-son').appendChild(bSon);
      cache = document.createElement('div'); cache.className = 'memo-lecteur-cache'; cache.setAttribute('aria-hidden', 'true');
      el.appendChild(cache);
      bSon.addEventListener('click', function () {
        if (joue) return couperMusique();
        if (mode === 'lien') return window.open(lienYouTube(idMusique, debutMusique), '_blank', 'noopener');
        demande = true;
        jouer();
        majSon();
      });
      majSon();
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) { if (e.some(function (x) { return x.isIntersecting; })) preparerMusique(); }).observe(el);
      }
    }
    function jouer() {
      if (mode === 'yt' && pret) lecteur.playVideo();
      else preparerMusique();
    }
    function majSon() {
      if (!bSon) return;
      if (mode === 'lien') bSon.textContent = '▶ Ouvrir la musique sur YouTube';
      else bSon.textContent = joue ? '⏸ Couper la musique' : (demande ? 'Musique en chargement…' : '▶ Lancer la musique');
      bSon.classList.toggle('actif', joue);
    }
    function etat(j) { joue = j; if (j) demande = false; majSon(); }
    function preparerMusique() {
      if (prepare) return;
      prepare = true;
      preparerYouTube();
    }
    function versLien() { mode = 'lien'; demande = false; majSon(); }
    function preparerYouTube() {
      if (!idMusique) { if (bSon) { bSon.textContent = 'Musique indisponible'; bSon.disabled = true; } return; }
      mode = 'yt';
      var hote = document.createElement('div'); cache.appendChild(hote);
      chargerApiYT().then(function (YT) {
        lecteur = new YT.Player(hote, {
          host: 'https://www.youtube-nocookie.com', videoId: idMusique, width: 200, height: 200,
          playerVars: { start: debutMusique, rel: 0, playsinline: 1, controls: 0 },
          events: {
            onReady: function () { pret = true; if (demande) lecteur.playVideo(); },
            onStateChange: function (e) { etat(e.data === YT.PlayerState.PLAYING); },
            onError: versLien
          }
        });
      }).catch(versLien);
    }
    function couperMusique() {
      demande = false;
      if (pret) { try { lecteur.pauseVideo(); } catch (e) {} }
      etat(false);
    }

    /* --- le test */
    function bouton(texte, action, classe) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'defi-go' + (classe ? ' ' + classe : '');
      b.textContent = texte; b.addEventListener('click', action); cmd.appendChild(b); return b;
    }
    function titreManche(m) { return 'Manche ' + (m + 1) + (series[m].musique ? ' · avec musique' : ' · sans musique'); }
    function grille(mots) {
      var ul = document.createElement('ul'); ul.className = 'memo-mots';
      mots.forEach(function (m) { var li = document.createElement('li'); li.textContent = m; ul.appendChild(li); });
      return ul;
    }
    function arreterMinuteur() { if (minuteur) { clearInterval(minuteur); minuteur = null; } }

    function accueil() {
      arreterMinuteur();
      etape.textContent = titreManche(manche); chrono.textContent = '';
      scene.innerHTML = '<p class="memo-consigne">Série ' + (manche + 1) + ' : ' + series[manche].mots.length + ' mots. ' +
        (series[manche].musique ? 'Lance d\'abord la musique, puis démarre la manche quand elle joue.' : 'Cette fois, sans musique.') + '</p>';
      cmd.innerHTML = '';
      bouton('▶ Démarrer la manche ' + (manche + 1), function () { phase(0); });
    }
    function phase(i) {
      arreterMinuteur();
      etape.textContent = titreManche(manche) + ' · ' + PHASES[i];
      scene.innerHTML = '';
      if (i === 0) scene.appendChild(grille(series[manche].mots));
      else scene.innerHTML = '<p class="memo-consigne grand">' + (i === 1 ? 'Retiens les mots.' : 'À toi : écris les mots sur ta feuille.') + '</p>';
      cmd.innerHTML = '';
      bouton('Étape suivante', function () { fin(i); }, 'discret');
      var reste = duree;
      function affiche() { chrono.textContent = Math.floor(reste / 60) + ':' + ('0' + (reste % 60)).slice(-2); }
      affiche();
      minuteur = setInterval(function () { reste--; affiche(); if (reste <= 0) fin(i); }, 1000);
    }
    function fin(i) {
      arreterMinuteur();
      if (i < 2) return phase(i + 1);
      etape.textContent = titreManche(manche) + ' · Correction'; chrono.textContent = '';
      scene.innerHTML = '';
      scene.appendChild(grille(series[manche].mots));
      scene.insertAdjacentHTML('beforeend', '<p class="memo-consigne">Compte tes mots justes : ……… / ' + series[manche].mots.length + '</p>');
      cmd.innerHTML = '';
      if (manche + 1 < series.length) bouton('Manche ' + (manche + 2) + ' →', function () { manche++; accueil(); });
      else scene.insertAdjacentHTML('beforeend', '<p class="memo-consigne"><strong>Avec ou sans musique : quand as-tu retenu le plus de mots&nbsp;?</strong></p>');
    }
    // en quittant la diapositive : musique coupée, test remis au début
    el._arreter = function () { couperMusique(); manche = 0; accueil(); };
    accueil();
  }

  function lienYouTube(id, debut) {
    return 'https://www.youtube.com/watch?v=' + id + (debut ? '&t=' + debut + 's' : '');
  }

  function lienDailymotion(id, debut) {
    return 'https://www.dailymotion.com/video/' + id + (debut ? '?start=' + debut : '');
  }

  function preparerExtrait(el) {
    var id = (el.getAttribute('data-yt') || '').trim();
    var dm = (el.getAttribute('data-dm') || '').trim();
    var debut = secondes(el.getAttribute('data-debut'));
    var fin = secondes(el.getAttribute('data-fin'));
    var titre = el.getAttribute('data-titre') || 'Extrait vidéo';
    var credit = el.getAttribute('data-credit') || '';
    var duree = (debut != null && fin != null) ? horloge(fin - debut) : '';
    var borne = (debut != null && fin != null) ? 'de ' + horloge(debut) + ' à ' + horloge(fin) : '';

    el.innerHTML = '';
    var ecran = document.createElement('div'); ecran.className = 'ecran';
    var bouton = document.createElement('button'); bouton.type = 'button'; bouton.className = 'lancer';
    bouton.innerHTML = '<span class="rond" aria-hidden="true"></span><span class="titre"></span><span class="duree"></span>';
    bouton.querySelector('.titre').textContent = titre;
    ecran.appendChild(bouton);
    el.appendChild(ecran);

    var infos = document.createElement('div'); infos.className = 'infos';
    el.appendChild(infos);

    if (!id && !dm) {
      el.classList.add('manquante');
      bouton.disabled = true;
      bouton.querySelector('.duree').textContent = 'Vidéo montrée en classe';
      if (credit) infos.textContent = credit;
      return;
    }
    bouton.querySelector('.duree').textContent = duree ? 'Extrait de ' + duree : '';
    bouton.setAttribute('aria-label', 'Lancer la vidéo : ' + titre);
    if (credit) { var c = document.createElement('span'); c.textContent = credit; infos.appendChild(c); }
    if (id || dm) {
      var a = document.createElement('a');
      a.href = id ? lienYouTube(id, debut) : lienDailymotion(dm, debut); a.target = '_blank'; a.rel = 'noopener';
      a.textContent = (id ? 'Voir sur YouTube' : 'Voir sur Dailymotion') + (borne ? ' (' + borne + ')' : '');
      infos.appendChild(a);
    }

    bouton.addEventListener('click', function () {
      // une seule vidéo à la fois
      document.querySelectorAll('.extrait').forEach(function (o) { if (o !== el) retirerVideo(o); });
      el._lance = true;
      if (id) return lancerYouTube(el, ecran, bouton, id, debut, fin);
      lancerDailymotion(el, ecran, bouton, dm, debut, fin);
    });
  }

  /* Dailymotion : lecteur intégré avec point de départ ; arrêt à la fin de l'extrait
     grâce aux messages du lecteur quand ils sont disponibles. */
  function lancerDailymotion(el, ecran, bouton, dm, debut, fin) {
    var f = document.createElement('iframe');
    f.src = 'https://www.dailymotion.com/embed/video/' + dm + '?autoplay=1&queue-enable=false&ui-start-screen-info=false' +
      (debut != null ? '&start=' + debut : '') + '&api=postMessage&id=' + encodeURIComponent(dm);
    f.allow = 'autoplay; fullscreen; picture-in-picture'; f.allowFullscreen = true;
    f.title = el.getAttribute('data-titre') || 'Vidéo';
    bouton.remove(); ecran.appendChild(f);
    el._lecteur = { pauseVideo: function () { try { f.contentWindow.postMessage('pause', '*'); } catch (e) {} } };
    if (fin == null) return;
    var fini = false;
    window.addEventListener('message', function ecoute(e) {
      if (fini || e.source !== f.contentWindow || typeof e.data !== 'string') return;
      var m = /event=timeupdate.*?time=([\d.]+)/.exec(e.data);
      if (m && parseFloat(m[1]) >= fin) {
        fini = true; window.removeEventListener('message', ecoute);
        el._lecteur.pauseVideo(); finExtrait(el);
      }
    });
  }

  function lancerYouTube(el, ecran, bouton, id, debut, fin) {
    var hote = document.createElement('div');
    bouton.remove(); ecran.appendChild(hote);
    chargerApiYT().then(function (YT) {
      var pv = { rel: 0, modestbranding: 1, playsinline: 1, autoplay: 1 };
      if (debut != null) pv.start = debut;
      if (fin != null) pv.end = fin;
      el._lecteur = new YT.Player(hote, {
        host: 'https://www.youtube-nocookie.com', videoId: id, playerVars: pv,
        events: {
          onStateChange: function (e) { if (e.data === YT.PlayerState.ENDED) finExtrait(el); },
          onError: function () { ecran.innerHTML = ''; repli(el, ecran, id, debut); }
        }
      });
    }).catch(function () {
      // API inaccessible : lecteur simple avec bornes, sans détection de fin
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0&autoplay=1' +
        (debut != null ? '&start=' + debut : '') + (fin != null ? '&end=' + fin : '');
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true; f.title = el.getAttribute('data-titre') || 'Vidéo';
      hote.replaceWith(f);
    });
  }

  function repli(el, ecran, id, debut) {
    var a = document.createElement('a');
    a.className = 'lancer'; a.href = lienYouTube(id, debut); a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML = '<span class="rond" aria-hidden="true"></span><span class="titre">Lecture impossible ici : ouvrir sur YouTube</span>';
    ecran.appendChild(a);
  }

  /* ---------- Chronomètre projeté (test multitâche) : <div class="chrono"></div> */
  function preparerChrono(el) {
    el.innerHTML = '<output class="affichage" aria-live="off">0:00.0</output>' +
      '<div class="boutons"><button type="button" data-a="go">Départ</button>' +
      '<button type="button" data-a="stop">Stop</button><button type="button" data-a="zero">Remise à zéro</button></div>';
    var aff = el.querySelector('.affichage'), t0 = 0, cumul = 0, boucle = null;
    function dessiner() {
      var ms = cumul + (boucle ? performance.now() - t0 : 0);
      var s = ms / 1000, m = Math.floor(s / 60), r = s - m * 60;
      aff.textContent = m + ':' + (r < 10 ? '0' : '') + r.toFixed(1);
      if (boucle) boucle = requestAnimationFrame(dessiner);
    }
    el.addEventListener('click', function (e) {
      var a = e.target.getAttribute && e.target.getAttribute('data-a');
      if (a === 'go' && !boucle) { t0 = performance.now(); boucle = requestAnimationFrame(dessiner); }
      if (a === 'stop' && boucle) { cancelAnimationFrame(boucle); cumul += performance.now() - t0; boucle = null; dessiner(); }
      if (a === 'zero') { if (boucle) cancelAnimationFrame(boucle); boucle = null; cumul = 0; dessiner(); }
    });
  }

  /* ---------- Vidéo de la diapositive courante (touche K) : lancer, puis pause / reprise */
  function basculerVideo() {
    var el = deck && deck.getCurrentSlide().querySelector('.extrait');
    if (!el) return;
    var b = el.querySelector('button.lancer:not([disabled])');
    if (b) return b.click();
    var v = el.querySelector('video');
    if (v) return v.paused ? v.play() : v.pause();
    var l = el._lecteur;
    if (l && l.getPlayerState) return l.getPlayerState() === 1 ? l.pauseVideo() : l.playVideo();
  }

  /* ---------- Fenêtres « Plan » et « Raccourcis » (<dialog>) */
  var RACCOURCIS = [
    ['→ ou Espace', 'diapositive suivante (ou élément suivant)'],
    ['←', 'diapositive précédente'],
    ['Début, Fin', 'première, dernière diapositive'],
    ['numéro en bas à gauche', 'taper un numéro puis Entrée pour aller à cette diapositive (pour reprendre une séance)'],
    ['P', 'plan des diapositives, pour y aller directement'],
    ['O ou Échap', 'vue d\'ensemble des diapositives (flèches puis Entrée)'],
    ['F', 'plein écran'],
    ['K', 'lancer la vidéo de la diapositive, puis pause / reprise'],
    ['N', 'notes du présentateur sous la diapositive (même touche pour les cacher)'],
    ['S', 'notes du présentateur dans une nouvelle fenêtre (à placer sur l\'écran de l\'ordinateur, le vidéoprojecteur en écran étendu)'],
    ['B ou .', 'écran noir (même touche pour revenir)'],
    ['?', 'cette aide']
  ];

  function fenetre(titre) {
    var d = document.createElement('dialog'); d.className = 'fenetre';
    d.innerHTML = '<div class="tete"><h2></h2><button type="button" class="fermer" aria-label="Fermer">×</button></div><div class="corps"></div>';
    d.querySelector('h2').textContent = titre;
    d.querySelector('.fermer').addEventListener('click', function () { d.close(); });
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    // reveal.js ne doit pas réagir au clavier tant que la fenêtre est ouverte
    d.addEventListener('close', function () { if (deck) deck.configure({ keyboard: CLAVIER }); });
    document.body.appendChild(d);
    return d;
  }
  function ouvrir(d) {
    if (d.open) return d.close();
    if (deck) deck.configure({ keyboard: false });
    d.showModal();
  }

  function titreDiapo(s) {
    var h = s.querySelector('h1, h2');
    var titre = h ? h.textContent.replace(/\s+/g, ' ').trim() : 'Diapositive';
    // ouverture de partie : « Partie 3 · L'attention à l'heure des écrans »
    var num = s.classList.contains('partie') && s.querySelector('.num');
    return num ? num.textContent.trim() + ' · ' + titre : titre;
  }

  function fenetrePlan(diapos) {
    var d = fenetre('Plan'), liste = document.createElement('ol'); liste.className = 'plan';
    diapos.forEach(function (s, i) {
      var li = document.createElement('li'), a = document.createElement('a');
      if (s.classList.contains('partie')) li.className = 'partie';
      if (!s.id) s.id = 'diapo-' + (i + 1);
      a.href = '#' + s.id;
      a.innerHTML = '<span class="n"></span> ';
      a.querySelector('.n').textContent = i + 1;
      a.appendChild(document.createTextNode(titreDiapo(s)));
      a.addEventListener('click', function (e) {
        e.preventDefault(); d.close();
        if (deck) deck.slide(i); else s.scrollIntoView();
      });
      li.appendChild(a); liste.appendChild(li);
    });
    d.querySelector('.corps').appendChild(liste);
    d.addEventListener('toggle', function () {
      if (!d.open || !deck) return;
      var cour = liste.querySelector('.courante'); if (cour) cour.classList.remove('courante');
      var li = liste.children[deck.getIndices().h];
      if (li) { li.classList.add('courante'); li.scrollIntoView({ block: 'center' }); }
    });
    return d;
  }

  function fenetreRaccourcis() {
    var d = fenetre('Raccourcis clavier'), t = document.createElement('table'); t.className = 'raccourcis';
    RACCOURCIS.forEach(function (r) {
      var tr = t.insertRow(), k = tr.insertCell(), x = tr.insertCell();
      r[0].split(/( ou |, )/).forEach(function (m) {
        if (m === ' ou ' || m === ', ' || /^numéro/.test(m)) k.appendChild(document.createTextNode(m));
        else { var kbd = document.createElement('kbd'); kbd.textContent = m; k.appendChild(kbd); }
      });
      x.textContent = r[1];
    });
    d.querySelector('.corps').appendChild(t);
    var p = document.createElement('p'); p.className = 'aide';
    p.textContent = 'Une télécommande de présentation fonctionne comme les flèches.';
    d.querySelector('.corps').appendChild(p);
    return d;
  }

  /* ---------- Panneau des notes du présentateur, sous la diapositive courante.
     Non modal : les flèches continuent de faire avancer, et le panneau suit. */
  var panneauNotes = null;
  function preparerNotes() {
    var p = document.createElement('aside'); p.className = 'panneau-notes'; p.hidden = true;
    p.setAttribute('aria-label', 'Notes du présentateur');
    p.innerHTML = '<div class="tete"><h2>Notes</h2><button type="button" class="fermer" aria-label="Fermer les notes">×</button></div><div class="corps"></div>';
    p.querySelector('.fermer').addEventListener('click', basculerNotes);
    document.body.appendChild(p);
    panneauNotes = p;
    deck.on('slidechanged', majNotes);
  }
  function majNotes() {
    if (!panneauNotes || panneauNotes.hidden) return;
    var corps = panneauNotes.querySelector('.corps'), n = deck.getCurrentSlide().querySelector('aside.notes');
    corps.innerHTML = '';
    var lignes = n ? n.textContent.split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean) : [];
    if (!lignes.length) lignes = ['Pas de note pour cette diapositive.'];
    lignes.forEach(function (l) { var q = document.createElement('p'); q.textContent = l; corps.appendChild(q); });
    corps.scrollTop = 0;
  }
  function basculerNotes() {
    if (!panneauNotes) return;
    panneauNotes.hidden = !panneauNotes.hidden;
    document.documentElement.classList.toggle('avec-notes', !panneauNotes.hidden);
    deck.layout();
    majNotes();
  }

  /* ---------- Numéro de la diapositive, modifiable : taper 35 puis Entrée */
  function numeroDiapo(total) {
    var bloc = document.createElement('form'); bloc.className = 'numero';
    bloc.innerHTML = '<label><span class="visuellement-cache">Aller à la diapositive</span>' +
      '<input type="number" min="1" inputmode="numeric"></label><span class="total"></span>';
    var champ = bloc.querySelector('input');
    champ.max = total; bloc.querySelector('.total').textContent = '/ ' + total;
    function maj() { champ.value = deck.getIndices().h + 1; }
    bloc.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = Math.min(total, Math.max(1, parseInt(champ.value, 10) || 1));
      deck.slide(n - 1); champ.blur(); maj();
    });
    champ.addEventListener('focus', function () { champ.select(); });
    champ.addEventListener('blur', maj);
    champ.addEventListener('keydown', function (e) { if (e.key === 'Escape') champ.blur(); });
    deck.on('slidechanged', maj); maj();
    document.body.appendChild(bloc);
  }

  /* ---------- Bascule de mode */
  function barreOutils() {
    var barre = document.createElement('nav'); barre.className = 'outils'; barre.setAttribute('aria-label', 'Affichage');
    var retour = document.body.getAttribute('data-retour');
    if (retour) {
      var r = document.createElement('a'); r.href = retour; r.textContent = '← Sommaire'; barre.appendChild(r);
    }
    var diapos = Array.prototype.slice.call(document.querySelectorAll('.reveal .slides > section'));
    var plan = fenetrePlan(diapos);
    barre.appendChild(boutonOutil('Plan', function () { ouvrir(plan); }));
    if (!modeLecture) {
      var aide = fenetreRaccourcis();
      barre.appendChild(boutonOutil('Notes', basculerNotes));
      barre.appendChild(boutonOutil('Raccourcis', function () { ouvrir(aide); }));
      outils = { plan: plan, aide: aide };
    }
    var bascule = document.createElement('a');
    var u = new URL(location.href);
    u.searchParams.delete('lecture'); u.searchParams.delete('diaporama');
    u.searchParams.set(modeLecture ? 'diaporama' : 'lecture', '');
    bascule.href = u.toString().replace(/=(&|$)/g, '$1');
    bascule.textContent = modeLecture ? 'Mode diaporama' : 'Mode lecture';
    barre.appendChild(bascule);
    document.body.appendChild(barre);
  }

  function boutonOutil(texte, action) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = texte;
    b.addEventListener('click', function () { b.blur(); action(); });
    return b;
  }
  var outils = null;
  // Touches ajoutées à celles de reveal.js (« ? » est traitée à part : sa touche dépend du clavier)
  var CLAVIER = {
    75: basculerVideo,                                // K
    78: basculerNotes,                                // N (remplace « suivante », déjà sur → et Espace)
    80: function () { ouvrir(outils.plan); }          // P
  };
  document.addEventListener('keydown', function (e) {
    if (e.key !== '?' || !outils || /input|textarea/i.test(e.target.tagName) || document.querySelector('dialog[open]')) return;
    e.preventDefault(); ouvrir(outils.aide);
  });

  function demarrer() {
    document.querySelectorAll('.extrait').forEach(preparerExtrait);
    document.querySelectorAll('.chrono').forEach(preparerChrono);
    document.querySelectorAll('.defi').forEach(preparerDefi);
    document.querySelectorAll('.memo').forEach(preparerMemo);
    var illus = chargerIllustrations();
    barreOutils();

    if (modeLecture) {
      document.documentElement.classList.add('mode-lecture');
      surveillerVideos();
      return;
    }
    illus.then(function () {
      deck = new Reveal({
        width: 1280, height: 720, margin: 0.03,
        hash: window.self === window.top, slideNumber: 'c/t', showSlideNumber: 'print',
        transition: 'slide', backgroundTransition: 'none',
        center: false, controlsTutorial: false, pdfSeparateFragments: false, help: false,
        keyboard: CLAVIER,
        plugins: window.RevealNotes ? [window.RevealNotes] : []
      });
      window.formationDeck = deck;
      deck.initialize().then(function () {
        deck.on('slidechanged', arreterTout);
        if (!deck.isPrintView()) { numeroDiapo(deck.getTotalSlides()); preparerNotes(); }
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
