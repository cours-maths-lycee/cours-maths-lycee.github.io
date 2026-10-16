/* Animation du bonus (mode élève) : la nuit tombe ; un point scintillant apparaît et
   trace une courbe célèbre tirée au hasard, en laissant une traînée qui scintille ; la
   courbe se consume tout entière en pluie d'étincelles ; « BONUS N°k » scintille et
   se consume à son tour ; le jour revient. Tout en SVG, sans dépendance.
     FDM_BONUS.jouer({numero: 1, courbe: 'cardioide', vitesse: 1, nom: true, reduit: false})
   renvoie une promesse résolue à la fin ; un clic, une touche Échap passent l'animation.
   courbe : identifiant de FDM_BONUS.courbes (sinon au hasard, jamais deux fois la même
   de suite) ; reduit : version sans mouvement (par défaut, le réglage « réduire les
   animations » de l'appareil) ; nom : nom de la courbe sous le tracé.
   FDM_BONUS.dessin(id, taille) : tracés « d » de la courbe dans un carré (vignettes).
   Page d'essai : scripts/site/bonus_test.html. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', PI = Math.PI, TAU = 2 * PI, PHI = (1 + Math.sqrt(5)) / 2;
  var cos = Math.cos, sin = Math.sin, sqrt = Math.sqrt;

  // ---------- courbes : sous-chemins [[x, y], …] dans un repère mathématique ----------
  function param(f, a, b, n) {
    var p = [];
    for (var i = 0; i <= n; i++) p.push(f(a + (b - a) * i / n));
    return p;
  }
  function polaire(r, a, b, n) {
    return param(function (t) { var q = r(t); return [q * cos(t), q * sin(t)]; }, a, b, n);
  }
  function auHasard(l) { return l[Math.floor(Math.random() * l.length)]; }

  // fonction de Bolzano, continue et dérivable nulle part : chaque segment est
  // remplacé par quatre, passant par les fractions (3/8 ; 5/8), (1/2 ; 1/2), (7/8 ; 9/8)
  function bolzano(n) {
    var p = [[0, 0], [1, 1]];
    for (var k = 0; k < n; k++) {
      var q = [p[0]];
      for (var i = 1; i < p.length; i++) {
        var a = p[i - 1], b = p[i], dx = b[0] - a[0], dy = b[1] - a[1];
        q.push([a[0] + 3 / 8 * dx, a[1] + 5 / 8 * dy], [a[0] + dx / 2, a[1] + dy / 2],
               [a[0] + 7 / 8 * dx, a[1] + 9 / 8 * dy], b);
      }
      p = q;
    }
    return p;
  }
  // clothoïde : x = ∫ cos(πs²/2) ds, y = ∫ sin(πs²/2) ds, pour s de -5 à 5
  function cornu() {
    var p = [], x = 0, y = 0, n = 3000, h = 10 / n;
    for (var i = 0; i <= n; i++) {
      p.push([x, y]);
      var m = -5 + (i + 0.5) * h;
      x += cos(PI * m * m / 2) * h;
      y += sin(PI * m * m / 2) * h;
    }
    return p;
  }
  // triangles rectangles d'hypoténuses √2, √3… √17 : côté extérieur, puis rayon aller-retour
  function pythagore(n) {
    var O = [0, 0], P = [1, 0], p = [O, P];
    for (var k = 1; k < n; k++) {
      var r = sqrt(P[0] * P[0] + P[1] * P[1]);
      P = [P[0] - P[1] / r, P[1] + P[0] / r];
      p.push(P, O, P);
    }
    return p;
  }
  // carrés de côtés 1, 1, 2, 3, 5… et quart de cercle dans chacun
  function fibonacci() {
    var F = [1, 1, 2, 3, 5, 8, 13, 21, 34], c = [0, 0], p = [];
    for (var k = 0; k < F.length; k++) {
      var t = k * PI / 2, f = F[k], a = [cos(t), sin(t)], b = [cos(t + PI / 2), sin(t + PI / 2)];
      var P = [c[0] + f * a[0], c[1] + f * a[1]], Q = [c[0] + f * b[0], c[1] + f * b[1]];
      p.push(P, [Q[0] + f * a[0], Q[1] + f * a[1]], Q, c, P);
      for (var i = 1; i <= 40; i++) {
        var s = t + i / 40 * PI / 2;
        p.push([c[0] + f * cos(s), c[1] + f * sin(s)]);
      }
      if (k + 1 < F.length) { var e = f - F[k + 1]; c = [c[0] + e * b[0], c[1] + e * b[1]]; }
    }
    return p;
  }
  function cruciforme() {
    var b = param(function (t) { return [1 / cos(t), 1 / sin(t)]; }, Math.asin(0.25), Math.acos(0.25), 400);
    return [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(function (s) {
      return b.map(function (q) { return [s[0] * q[0], s[1] * q[1]]; });
    });
  }
  // x = 3t/(1+t³), y = 3t²/(1+t³) : les deux branches se rejoignent à l'origine
  function folium() {
    var f = function (t) { var d = 1 + t * t * t; return [3 * t / d, 3 * t * t / d]; };
    return param(f, -0.62, 3, 1000).concat(param(f, 3, 40, 300), param(f, -40, -1.62, 400));
  }
  function cassini() {
    return [1.02, 1.15, 1.4].map(function (b) {
      return polaire(function (t) { var s = sin(2 * t); return sqrt(cos(2 * t) + sqrt(b * b * b * b - s * s)); }, 0, TAU, 900);
    });
  }
  // r = ±√θ : un bras, l'origine, puis l'autre bras
  function fermat() {
    var n = 1200, m = 10 * PI, p = [], i, t, r;
    for (i = n; i >= 0; i--) { t = m * i / n; r = -sqrt(t); p.push([r * cos(t), r * sin(t)]); }
    for (i = 1; i <= n; i++) { t = m * i / n; r = sqrt(t); p.push([r * cos(t), r * sin(t)]); }
    return p;
  }

  var COURBES = [
    {id: 'cardioide', nom: 'Cardioïde', f: function () {
      return [param(function (t) { return [2 * sin(t) - sin(2 * t), 2 * cos(t) - cos(2 * t)]; }, 0, TAU, 900)]; }},
    {id: 'rosace', nom: 'Rosace', f: function () {
      var k = auHasard([3, 4, 5, 7]);
      return [polaire(function (t) { return cos(k * t); }, 0, k % 2 ? PI : TAU, 1400)]; }},
    {id: 'archimede', nom: "Spirale d'Archimède", f: function () {
      return [polaire(function (t) { return t; }, 0, 6 * PI, 1500)]; }},
    {id: 'lemniscate', nom: 'Lemniscate de Bernoulli', f: function () {
      return [param(function (t) { var d = 1 + sin(t) * sin(t); return [cos(t) / d, sin(t) * cos(t) / d]; }, 0, TAU, 900)]; }},
    {id: 'cycloide', nom: 'Cycloïde', f: function () {
      return [param(function (t) { return [t - sin(t), 1 - cos(t)]; }, 0, 4 * PI, 900)]; }},
    {id: 'lissajous', nom: 'Courbe de Lissajous', f: function () {
      var c = auHasard([[3, 2], [5, 4], [3, 4], [5, 6]]);
      return [param(function (t) { return [cos(c[0] * t), sin(c[1] * t)]; }, 0, TAU, 1600)]; }},
    {id: 'papillon', nom: 'Papillon de Temple H. Fay', duree: 10000, f: function () {
      return [polaire(function (t) {
        return Math.exp(sin(t)) - 2 * cos(4 * t) + Math.pow(sin((2 * t - PI) / 24), 5); }, 0, 24 * PI, 8000)]; }},
    {id: 'strophoide', nom: 'Strophoïde droite', f: function () {
      return [param(function (t) { var d = t * t + 1; return [(t * t - 1) / d, t * (t * t - 1) / d]; }, -2.4, 2.4, 900)]; }},
    {id: 'cornu', nom: 'Spirale de Cornu', duree: 7500, f: function () { return [cornu()]; }},
    {id: 'bolzano', nom: 'Courbe de Bolzano', duree: 7000, f: function () { return [bolzano(6)]; }},
    {id: 'ellipse', nom: 'Ellipse', duree: 4500, f: function () {
      return [param(function (t) { return [1.6 * cos(t), sin(t)]; }, 0, TAU, 600)]; }},
    {id: 'cruciforme', nom: 'Courbe cruciforme', f: cruciforme},
    {id: 'epicycloide', nom: 'Épicycloïde', f: function () {
      var k = auHasard([3, 4, 5]);
      return [param(function (t) { return [(k + 1) * cos(t) - cos((k + 1) * t), (k + 1) * sin(t) - sin((k + 1) * t)]; }, 0, TAU, 1200)]; }},
    {id: 'pythagore', nom: 'Escargot de Pythagore', duree: 8000, f: function () { return [pythagore(17)]; }},
    {id: 'folium', nom: 'Folium de Descartes', f: function () { return [folium()]; }},
    {id: 'hypocycloide', nom: 'Hypocycloïde', f: function () {
      var k = auHasard([3, 5, 6]);
      return [param(function (t) { return [(k - 1) * cos(t) + cos((k - 1) * t), (k - 1) * sin(t) - sin((k - 1) * t)]; }, 0, TAU, 1200)]; }},
    {id: 'astroide', nom: 'Astroïde', f: function () {
      return [param(function (t) { return [Math.pow(cos(t), 3), Math.pow(sin(t), 3)]; }, 0, TAU, 900)]; }},
    {id: 'nephroide', nom: 'Néphroïde', f: function () {
      return [param(function (t) { return [3 * cos(t) - cos(3 * t), 3 * sin(t) - sin(3 * t)]; }, 0, TAU, 900)]; }},
    {id: 'cassini', nom: 'Ovales de Cassini', duree: 7500, f: cassini},
    {id: 'piriforme', nom: 'Quartique piriforme', f: function () {
      return [param(function (t) { var s = 1 + sin(t); return [1.4 * s * cos(t) / 4, -s / 2]; }, 0, TAU, 900)]; }},
    {id: 'or', nom: "Spirale d'or", f: function () {
      return [polaire(function (t) { return Math.pow(PHI, 2 * t / PI); }, -3 * PI, 3.5 * PI, 1500)]; }},
    {id: 'fermat', nom: 'Spirale de Fermat', duree: 7500, f: function () { return [fermat()]; }},
    {id: 'fibonacci', nom: 'Spirale de Fibonacci', duree: 8000, f: function () { return [fibonacci()]; }}
  ];
  function trouver(id) {
    for (var i = 0; i < COURBES.length; i++) if (COURBES[i].id === id) return COURBES[i];
    return null;
  }

  // mise à l'échelle dans le rectangle de centre (cx ; cy), ordonnées vers le bas
  function ajuster(sous, cx, cy, W, H) {
    var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    sous.forEach(function (s) { s.forEach(function (p) {
      if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
    }); });
    var k = Math.min(W / (x1 - x0 || 1), H / (y1 - y0 || 1)), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    return sous.map(function (s) { return s.map(function (p) { return [cx + (p[0] - mx) * k, cy - (p[1] - my) * k]; }); });
  }
  function versD(pts) {
    var d = '';
    for (var i = 0; i < pts.length; i++) d += (i ? 'L' : 'M') + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1);
    return d;
  }
  // longueurs cumulées, pour placer le point à une abscisse curviligne donnée
  function mesurer(sous) {
    var chemins = [], total = 0;
    sous.forEach(function (pts) {
      var cum = [0];
      for (var i = 1; i < pts.length; i++)
        cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      var L = cum[cum.length - 1];
      chemins.push({pts: pts, cum: cum, L: L, debut: total});
      total += L;
    });
    return {chemins: chemins, total: total};
  }
  function situer(g, s) {
    var c = g.chemins[g.chemins.length - 1];
    for (var j = 0; j < g.chemins.length; j++)
      if (s <= g.chemins[j].debut + g.chemins[j].L) { c = g.chemins[j]; break; }
    var u = Math.max(0, Math.min(c.L, s - c.debut)), lo = 0, hi = c.cum.length - 1;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (c.cum[m] <= u) lo = m; else hi = m; }
    var a = c.pts[lo], b = c.pts[hi], d = c.cum[hi] - c.cum[lo], k = d ? (u - c.cum[lo]) / d : 0;
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  }

  // ---------- outils ----------
  function el(nom, attrs, parent) {
    var e = document.createElementNS(NS, nom);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function hasard(a, b) { return a + Math.random() * (b - a); }
  function lisse(p) { return p * p * (3 - 2 * p); }
  function nombre(taux, dt) { return Math.floor(taux * dt + Math.random()); }
  // couleur du feu selon l'âge de l'étincelle (0 : blanche, puis or, orange, rouge)
  var FEU = [[0, 255, 251, 232], [0.15, 255, 214, 107], [0.45, 255, 154, 60], [0.75, 232, 69, 44], [1, 110, 20, 20]];
  function feu(f) {
    for (var i = 1; i < FEU.length - 1 && f > FEU[i][0]; i++);
    var a = FEU[i - 1], b = FEU[i], u = Math.min(1, Math.max(0, (f - a[0]) / (b[0] - a[0])));
    return 'rgb(' + Math.round(a[1] + (b[1] - a[1]) * u) + ',' + Math.round(a[2] + (b[2] - a[2]) * u) +
      ',' + Math.round(a[3] + (b[3] - a[3]) * u) + ')';
  }
  var POLICE = '"Palatino Linotype","Book Antiqua",Palatino,Georgia,serif';
  var CSS = '.fdm-bonus{position:fixed;inset:0;z-index:2147483000;cursor:pointer;' +
    '-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}' +
    '.fdm-bonus-nuit{position:absolute;inset:0;opacity:0;' +
    'background:radial-gradient(ellipse at 50% 42%,#0d1433 0%,#04061a 55%,#010208 100%)}' +
    '.fdm-bonus svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}' +
    '.fdm-bonus-passer{position:absolute;left:0;right:0;bottom:max(14px,env(safe-area-inset-bottom));' +
    'text-align:center;font:13px system-ui,-apple-system,"Segoe UI",sans-serif;color:#8d96b8;' +
    'opacity:0;transition:opacity 1.2s}' +
    '@keyframes fdm-scintille{0%,100%{opacity:.12}50%{opacity:.85}}';
  function styler() {
    if (document.getElementById('fdm-bonus-style')) return;
    var s = document.createElement('style');
    s.id = 'fdm-bonus-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // étincelles de feu : traits qui tombent (pesanteur), changent de couleur et s'éteignent
  function Feux(g, px) { this.g = g; this.px = px; this.l = []; }
  Feux.prototype.ajouter = function (x, y, vx, vy, vie, larg, grav) {
    this.l.push({e: el('line', {'stroke-linecap': 'round'}, this.g), x: x, y: y, vx: vx, vy: vy,
                 vie: vie, larg: larg * this.px, grav: grav, age: 0});
  };
  Feux.prototype.maj = function (dt) {
    var l = this.l, k = 0;
    for (var i = 0; i < l.length; i++) {
      var p = l[i];
      p.age += dt;
      if (p.age >= p.vie) { p.e.remove(); continue; }
      p.vy += p.grav * dt;
      p.vx *= 1 - 0.8 * dt;
      p.vy *= 1 - 0.25 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      var f = p.age / p.vie, e = p.e;
      e.setAttribute('x1', p.x.toFixed(1));
      e.setAttribute('y1', p.y.toFixed(1));
      e.setAttribute('x2', (p.x - p.vx * 0.05).toFixed(1));
      e.setAttribute('y2', (p.y - p.vy * 0.05).toFixed(1));
      e.setAttribute('stroke', feu(f));
      e.setAttribute('stroke-width', (p.larg * (1 - 0.6 * f)).toFixed(2));
      e.setAttribute('opacity', ((1 - f) * (0.65 + 0.35 * Math.random())).toFixed(2));
      l[k++] = p;
    }
    l.length = k;
  };
  // éclats : petites étoiles à quatre branches qui naissent, brillent et s'éteignent
  function Eclats(g, px) { this.g = g; this.px = px; this.l = []; }
  Eclats.prototype.ajouter = function (x, y, taille, vie) {
    this.l.push({e: el('use', {href: '#fdm-etoile'}, this.g), x: x, y: y, t: taille * this.px,
                 vie: vie, age: 0, r: hasard(0, 90), vr: hasard(-120, 120)});
  };
  Eclats.prototype.maj = function (dt) {
    var l = this.l, k = 0;
    for (var i = 0; i < l.length; i++) {
      var p = l[i];
      p.age += dt;
      if (p.age >= p.vie) { p.e.remove(); continue; }
      p.r += p.vr * dt;
      var s = p.t * sin(PI * p.age / p.vie);
      p.e.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') rotate(' +
        p.r.toFixed(0) + ') scale(' + s.toFixed(2) + ')');
      p.e.setAttribute('opacity', (0.6 + 0.4 * Math.random()).toFixed(2));
      l[k++] = p;
    }
    l.length = k;
  };

  // points à l'intérieur des lettres (pour la combustion du mot)
  function pointsTexte(texte, police, x, y, n) {
    var c = document.createElement('canvas');
    c.width = c.height = 1000;
    var ctx = c.getContext('2d');
    ctx.font = police;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(texte, x, y);
    var d = ctx.getImageData(0, 0, 1000, 1000).data, pts = [];
    for (var j = 0; j < 1000; j += 3)
      for (var i = 0; i < 1000; i += 3)
        if (d[(j * 1000 + i) * 4 + 3] > 128) pts.push([i + hasard(-1.5, 1.5), j + hasard(-1.5, 1.5)]);
    for (var k = pts.length - 1; k > 0; k--) { var m = Math.floor(Math.random() * (k + 1)), t = pts[k]; pts[k] = pts[m]; pts[m] = t; }
    return pts.slice(0, n);
  }

  // ---------- scène ----------
  function construire(texteAccessible) {
    styler();
    var racine = document.createElement('div');
    racine.className = 'fdm-bonus';
    racine.setAttribute('role', 'dialog');
    racine.setAttribute('aria-label', texteAccessible);
    var nuit = document.createElement('div');
    nuit.className = 'fdm-bonus-nuit';
    racine.appendChild(nuit);
    var svg = el('svg', {viewBox: '0 0 1000 1000', preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true'});
    racine.appendChild(svg);
    var passer = document.createElement('div');
    passer.className = 'fdm-bonus-passer';
    passer.textContent = 'Touchez pour passer';
    racine.appendChild(passer);

    // partie visible du repère 0…1000 (écran plus large ou plus haut que carré)
    var W = window.innerWidth || 1000, H = window.innerHeight || 1000, r = W / H;
    var vue = r >= 1 ? {x0: 500 - 500 * r, x1: 500 + 500 * r, y0: 0, y1: 1000}
                     : {x0: 0, x1: 1000, y0: 500 - 500 / r, y1: 500 + 500 / r};
    var px = 1000 / Math.min(W, H);           // unités du repère pour un pixel d'écran

    var defs = el('defs', {}, svg);
    defs.innerHTML =
      '<radialGradient id="fdm-halo"><stop offset="0" stop-color="#fff" stop-opacity="1"/>' +
      '<stop offset=".22" stop-color="#ffeab0" stop-opacity=".85"/>' +
      '<stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="fdm-or" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe6"/>' +
      '<stop offset=".5" stop-color="#ffd86b"/><stop offset="1" stop-color="#f2a43a"/></linearGradient>' +
      '<filter id="fdm-lueur" x="-20%" y="-60%" width="140%" height="220%">' +
      '<feGaussianBlur in="SourceGraphic" stdDeviation="8" result="f"/>' +
      '<feMerge><feMergeNode in="f"/><feMergeNode in="f"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<g id="fdm-etoile"><circle r="1" fill="url(#fdm-halo)" opacity=".7"/>' +
      '<path d="M0-1L.16-.16L1 0L.16.16L0 1L-.16.16L-1 0L-.16-.16Z" fill="#fffaf0"/></g>';
    // ciel étoilé, très discret
    var ciel = el('g', {opacity: 0}, svg);
    for (var i = 0; i < 90; i++)
      el('circle', {cx: hasard(vue.x0, vue.x1).toFixed(0), cy: hasard(vue.y0, vue.y1).toFixed(0),
                    r: (hasard(0.5, 1.4) * px).toFixed(2), fill: '#cfd8ff',
                    style: 'animation:fdm-scintille ' + hasard(1.8, 4.5).toFixed(1) + 's ease-in-out -' +
                           hasard(0, 4).toFixed(1) + 's infinite'}, ciel);

    var scene = el('g', {}, svg);
    var gCourbe = el('g', {fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'}, scene);
    var gTexte = el('g', {}, scene);
    var gNom = el('text', {x: 500, y: 865, 'text-anchor': 'middle', 'font-family': POLICE, 'font-style': 'italic',
                           'font-size': 38, fill: '#c9d2f5', opacity: 0}, scene);
    var gFeux = el('g', {}, scene), gEclats = el('g', {}, scene);
    var traceur = el('g', {opacity: 0}, scene);
    el('circle', {r: 30, fill: 'url(#fdm-halo)'}, traceur);
    var etoileT = el('path', {d: 'M0-1L.12-.12L1 0L.12.12L0 1L-.12.12L-1 0L-.12-.12Z', fill: '#fffaf0'}, traceur);
    el('circle', {r: 3.2, fill: '#fff'}, traceur);

    return {racine: racine, nuit: nuit, svg: svg, passer: passer, vue: vue, px: px, ciel: ciel,
            gCourbe: gCourbe, gTexte: gTexte, gNom: gNom, traceur: traceur, etoileT: etoileT,
            feux: new Feux(gFeux, px), eclats: new Eclats(gEclats, px)};
  }

  // ---------- déroulé ----------
  var enCours = null, derniere = null;

  function choisir(id) {
    var c = trouver(id);
    if (c) return c;
    var l = COURBES.filter(function (k) { return k.id !== derniere; });
    return auHasard(l);
  }

  function derouler(o) {
    var numero = o.numero || 1, vitesse = o.vitesse || 1, courbe = choisir(o.courbe);
    derniere = courbe.id;
    var reduit = o.reduit != null ? o.reduit
      : !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var S = construire('Bonus n°' + numero + ' obtenu'), vue = S.vue, px = S.px;
    document.body.appendChild(S.racine);

    // boucle d'animation : une liste de tâches appelées à chaque image
    var taches = [], passer = false, actif = true, avant = 0, temps = 0;
    function cadre(now) {
      if (!actif) return;
      var dt = Math.min(0.05, (now - avant) / 1000) * vitesse;
      avant = now;
      temps += dt;
      taches = taches.filter(function (f) { return !f(dt); });
      S.feux.maj(dt);
      S.eclats.maj(dt);
      requestAnimationFrame(cadre);
    }
    requestAnimationFrame(function (n) { avant = n; requestAnimationFrame(cadre); });
    // étape de ms millisecondes : fn(p, dt), p allant de 0 à 1 ; écourtée si l'on passe
    function etape(ms, fn, force) {
      return new Promise(function (res) {
        var t = 0;
        taches.push(function (dt) {
          if (passer && !force) { res(); return true; }
          t += dt * 1000;
          var p = Math.min(1, t / ms);
          if (fn) fn(p, dt);
          if (p >= 1) { res(); return true; }
          return false;
        });
      });
    }
    function surPasser() { passer = true; }
    function surTouche(e) { if (e.key === 'Escape') passer = true; }
    S.racine.addEventListener('click', surPasser);
    document.addEventListener('keydown', surTouche);

    function nuitTombe(ms) {
      return etape(ms, function (p) {
        var q = lisse(p);
        S.nuit.style.opacity = q;
        S.ciel.setAttribute('opacity', q.toFixed(3));
        if (p > 0.6) S.passer.style.opacity = 0.55;
      });
    }
    function finir() {
      var o0 = parseFloat(S.nuit.style.opacity) || 0;
      S.passer.style.opacity = 0;
      return etape(passer ? 700 : 1800, function (p) {
        var q = 1 - lisse(p);
        S.nuit.style.opacity = o0 * q;
        S.svg.style.opacity = q;
      }, true).then(function () {
        actif = false;
        S.racine.removeEventListener('click', surPasser);
        document.removeEventListener('keydown', surTouche);
        S.racine.remove();
      });
    }
    // tout le dessin se consume d'un coup : chaque point part en étincelle (départs
    // étalés sur le premier tiers) pendant que le dessin s'éteint en vacillant
    function bruler(ech, cible, ms) {
      var o0 = parseFloat(cible.getAttribute('opacity'));
      if (isNaN(o0)) o0 = 1;
      ech.forEach(function (q) { q[2] = Math.random() * Math.random() * 0.35; });
      ech.sort(function (a, b) { return a[2] - b[2]; });
      var j = 0;
      return etape(ms, function (p) {
        cible.setAttribute('opacity', (o0 * Math.pow(1 - Math.min(1, p / 0.4), 1.5) * (0.75 + 0.25 * Math.random())).toFixed(3));
        while (j < ech.length && ech[j][2] <= p) {
          var q = ech[j++];
          S.feux.ajouter(q[0], q[1], hasard(-35, 35), hasard(-75, 10), hasard(1.1, 2.3), hasard(1.4, 2.8), 240);
          if (Math.random() < 0.12) S.eclats.ajouter(q[0], q[1], hasard(5, 10), hasard(0.25, 0.6));
        }
      });
    }

    // ----- le mot BONUS N°k -----
    var texte = 'BONUS N°' + numero, mesure = document.createElement('canvas').getContext('2d');
    mesure.font = '700 150px ' + POLICE;
    var taille = Math.min(150, 150 * 880 / mesure.measureText(texte).width), yTexte = 500 + taille * 0.35;
    var mot = el('text', {x: 500, y: yTexte.toFixed(1), 'text-anchor': 'middle', 'font-family': POLICE,
                          'font-weight': 700, 'font-size': taille.toFixed(1), fill: 'url(#fdm-or)',
                          stroke: '#fff4cc', 'stroke-width': 1.2, filter: 'url(#fdm-lueur)', opacity: 0}, S.gTexte);
    mot.textContent = texte;
    var echT = pointsTexte(texte, '700 ' + taille.toFixed(1) + 'px ' + POLICE, 500, yTexte, reduit ? 0 : 900);

    function motScintille(ms, montee) {
      return etape(ms, function (p, dt) {
        var q = montee ? lisse(p) : 1, n = 0.86 + 0.09 * sin(temps * 17) * sin(temps * 7.3) + 0.05 * Math.random();
        mot.setAttribute('opacity', (q * n).toFixed(3));
        for (var i = nombre(55 * (montee ? 0.4 + p : 1), dt); i > 0 && echT.length; i--) {
          var c = auHasard(echT);
          S.eclats.ajouter(c[0], c[1], hasard(6, 14), hasard(0.35, 0.9));
        }
      });
    }

    async function principal() {
      // 1. la nuit tombe
      await nuitTombe(2000);
      if (passer) return finir();

      // 2. un point scintillant apparaît lentement
      var sous = ajuster(courbe.f(), 500, 450, 760, 640), geo = mesurer(sous);
      sous.forEach(function (pts, k) {
        var d = versD(pts), c = geo.chemins[k];
        c.traits = [
          el('path', {d: d, stroke: '#ffb347', 'stroke-width': (10 * px).toFixed(2), opacity: 0.16}, S.gCourbe),
          el('path', {d: d, stroke: '#ffd77a', 'stroke-width': (4.5 * px).toFixed(2), opacity: 0.45}, S.gCourbe),
          el('path', {d: d, stroke: '#fff8e1', 'stroke-width': (1.6 * px).toFixed(2)}, S.gCourbe)];
        c.Lr = c.traits[2].getTotalLength() || c.L;
        c.traits.forEach(function (t) {
          t.setAttribute('stroke-dasharray', c.Lr.toFixed(1) + ' ' + (c.Lr + 20).toFixed(1));
          t.setAttribute('visibility', 'hidden');
        });
      });
      if (o.nom !== false) S.gNom.textContent = courbe.nom;
      var pos = situer(geo, 0), echelleT = 0.2;
      function placer(op) {
        S.traceur.setAttribute('transform', 'translate(' + pos[0].toFixed(1) + ' ' + pos[1].toFixed(1) +
          ') scale(' + (echelleT * px).toFixed(3) + ')');
        S.etoileT.setAttribute('transform', 'rotate(' + (temps * 70 % 360).toFixed(0) + ') scale(' +
          (24 * (0.8 + 0.2 * sin(temps * 9))).toFixed(1) + ')');
        S.traceur.setAttribute('opacity', op.toFixed(3));
      }
      await etape(1800, function (p) {
        var q = lisse(p);
        echelleT = 0.2 + 0.8 * q;
        placer(q * (0.75 + 0.25 * Math.random()));
        if (Math.random() < p * 0.35)
          S.eclats.ajouter(pos[0] + hasard(-30, 30) * px, pos[1] + hasard(-30, 30) * px, hasard(3, 7), hasard(0.3, 0.7));
      });
      if (passer) return finir();

      // 3. le point trace la courbe ; la traînée reste et scintille
      var s = 0, scintille = true;
      taches.push(function (dt) {
        if (!scintille) return true;
        S.gCourbe.setAttribute('opacity', (0.88 + 0.07 * sin(temps * 13) + 0.05 * sin(temps * 31 + 1)).toFixed(3));
        for (var i = nombre(38, dt); i > 0 && s > 0; i--) {
          var q = situer(geo, Math.random() * s);
          S.eclats.ajouter(q[0], q[1], hasard(4, 10), hasard(0.4, 1));
        }
        return false;
      });
      function dessiner() {
        geo.chemins.forEach(function (c) {
          var u = Math.max(0, Math.min(1, (s - c.debut) / (c.L || 1)));
          c.traits.forEach(function (t) {
            t.setAttribute('visibility', u > 0 ? 'visible' : 'hidden');
            t.setAttribute('stroke-dashoffset', (c.Lr * (1 - u)).toFixed(1));
          });
        });
      }
      await etape(courbe.duree || 6500, function (p, dt) {
        s = geo.total * (0.5 - 0.5 * cos(PI * p));
        dessiner();
        pos = situer(geo, s);
        placer(0.9 + 0.1 * Math.random());
        for (var i = nombre(70, dt); i > 0; i--)
          S.feux.ajouter(pos[0], pos[1], hasard(-70, 70), hasard(-80, 40), hasard(0.25, 0.6), hasard(0.8, 1.6), 140);
        S.gNom.setAttribute('opacity', (Math.min(1, p * 3) * 0.75).toFixed(3));
      });
      if (passer) return finir();

      // le point s'éteint, la courbe reste un instant
      await etape(1100, function (p) {
        echelleT = 1 + 0.6 * p;
        placer(Math.max(0, 1 - p * 1.6) * (0.8 + 0.2 * Math.random()));
      });
      if (passer) return finir();

      // 4. la courbe se consume en tombant
      scintille = false;
      var ech = [], N = 650;
      for (var i = 0; i < N; i++) ech.push(situer(geo, geo.total * (i + Math.random()) / N));
      var nomO = parseFloat(S.gNom.getAttribute('opacity')) || 0;
      await Promise.all([bruler(ech, S.gCourbe, 1900),
                         etape(1900, function (p) { S.gNom.setAttribute('opacity', (nomO * (1 - p)).toFixed(3)); })]);
      if (passer) return finir();
      S.gCourbe.remove();
      await etape(900);
      if (passer) return finir();

      // 5. BONUS N°k scintille, puis se consume
      await motScintille(1600, true);
      if (passer) return finir();
      await motScintille(1300, false);
      if (passer) return finir();
      await bruler(echT, mot, 1700);
      if (passer) return finir();
      await etape(1500);

      // 6. le jour revient
      return finir();
    }

    async function sansMouvement() {
      await nuitTombe(700);
      if (passer) return finir();
      await etape(700, function (p) { mot.setAttribute('opacity', lisse(p).toFixed(3)); });
      if (passer) return finir();
      await etape(1800);
      return finir();
    }

    return reduit ? sansMouvement() : principal();
  }

  function jouer(o) {
    if (enCours) return enCours;
    enCours = derouler(o || {}).catch(function (e) {
      if (window.console) console.error(e);
      var r = document.querySelector('.fdm-bonus');
      if (r) r.remove();
    }).then(function () { enCours = null; });
    return enCours;
  }

  // vignettes : tracés de la courbe dans un carré de côté taille
  function dessin(id, taille) {
    var c = trouver(id), m = taille * 0.08;
    if (!c) return [];
    return ajuster(c.f(), taille / 2, taille / 2, taille - 2 * m, taille - 2 * m).map(versD);
  }

  window.FDM_BONUS = {
    jouer: jouer,
    dessin: dessin,
    courbes: COURBES.map(function (c) { return {id: c.id, nom: c.nom}; }),
    points: function (id) { var c = trouver(id); return c ? c.f() : null; }
  };
})();
