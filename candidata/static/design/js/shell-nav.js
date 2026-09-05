/* ===========================================================================
 * LA NAVIGAZIONE ORIZZONTALE — comportamento dei pannelli e del menu compatto
 * ===========================================================================
 * Un pannello a discesa che si apre solo al passaggio del puntatore non e'
 * raggiungibile da chi usa la tastiera, e uno che si apre senza dichiarare
 * `aria-expanded` non e' annunciato a chi usa un lettore di schermo. Qui i
 * comandi sono `button` veri e lo stato e' dichiarato sul comando.
 *
 * QUATTRO PROPRIETA' CHE VANNO PROVATE PREMENDO TASTI, non leggendo:
 *   - `Freccia giu'` apre ED ENTRA: aprire lasciando il fuoco fuori
 *     costringe a un secondo `Tab` per arrivare dove si e' appena chiesto
 *     di andare;
 *   - `Escape` chiude E RIPORTA IL FUOCO sul comando: senza, il fuoco resta
 *     su un nodo appena nascosto e il tasto successivo riparte dall'inizio
 *     della pagina;
 *   - `Tab` dentro il pannello lo CHIUDE e lascia proseguire il fuoco: un
 *     pannello aperto e non visibile e' una trappola;
 *   - `Freccia sinistra/destra` percorre i gruppi: il primo livello e' una
 *     barra di menu, e si attraversa in orizzontale.
 *
 * Nessuna dipendenza, nessuna chiamata di rete, nessuno stato persistito.
 * ======================================================================== */
(function () {
  "use strict";

  var doc = document;

  /* IL BURGER E' DENTRO QUESTO ELENCO, NON ACCANTO.
   * Porta `aria-controls` e `aria-expanded` come i gruppi, quindi e' gia'
   * governato da queste righe. Dargli un gestore PROPRIO significherebbe due
   * gestori sullo stesso clic — uno apre, l'altro richiude — e il menu non si
   * aprirebbe mai. E' successo nel prototipo, e nessun cancello lo diceva:
   * l'ha trovato uno scatto che mostrava una barra senza menu. */
  var comandi = Array.prototype.slice.call(
    doc.querySelectorAll(".shell-topnav [aria-controls][aria-expanded], .shell-menu-toggle")
  );
  if (!comandi.length) { return; }

  function pannelloDi(c) { return doc.getElementById(c.getAttribute("aria-controls")); }

  function voci(pan) {
    return Array.prototype.slice.call(
      pan.querySelectorAll('a[href], button:not([disabled])')
    );
  }

  function chiudi(c, tornaAlComando) {
    var pan = pannelloDi(c);
    if (!pan || pan.hidden) { return; }
    pan.hidden = true;
    c.setAttribute("aria-expanded", "false");
    if (tornaAlComando) { c.focus(); }
  }

  function chiudiTutti(tranne) {
    comandi.forEach(function (c) { if (c !== tranne) { chiudi(c, false); } });
  }

  function apri(c) {
    var pan = pannelloDi(c);
    if (!pan) { return; }
    chiudiTutti(c);
    pan.hidden = false;
    c.setAttribute("aria-expanded", "true");
  }

  comandi.forEach(function (c) {
    var pan = pannelloDi(c);
    if (!pan) { return; }

    c.addEventListener("click", function () {
      if (pan.hidden) { apri(c); } else { chiudi(c, false); }
    });

    c.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        apri(c);
        var v = voci(pan);
        if (v.length) { v[0].focus(); }
      } else if (ev.key === "Escape") {
        chiudi(c, true);
      }
    });

    pan.addEventListener("keydown", function (ev) {
      var v = voci(pan);
      var i = v.indexOf(doc.activeElement);
      if (ev.key === "Escape") {
        ev.preventDefault();
        chiudi(c, true);
      } else if (ev.key === "ArrowDown") {
        ev.preventDefault();
        v[(i + 1) % v.length].focus();
      } else if (ev.key === "ArrowUp") {
        ev.preventDefault();
        v[(i - 1 + v.length) % v.length].focus();
      } else if (ev.key === "Tab") {
        /* Non si intrappola il fuoco: si chiude e lo si lascia proseguire
         * dove sarebbe andato comunque. */
        chiudi(c, false);
      }
    });
  });

  var gruppi = Array.prototype.slice.call(doc.querySelectorAll(".shell-topnav-voce"));
  gruppi.forEach(function (g) {
    g.addEventListener("keydown", function (ev) {
      var i = gruppi.indexOf(g);
      if (ev.key === "ArrowRight") {
        ev.preventDefault();
        gruppi[(i + 1) % gruppi.length].focus();
      } else if (ev.key === "ArrowLeft") {
        ev.preventDefault();
        gruppi[(i - 1 + gruppi.length) % gruppi.length].focus();
      }
    });
  });

  doc.addEventListener("click", function (ev) {
    var dentro = ev.target.closest(
      ".shell-topnav [aria-controls][aria-expanded], .shell-menu-toggle," +
      " .shell-sub, .shell-menu-compatto"
    );
    if (!dentro) { chiudiTutti(null); }
  });

  doc.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") { chiudiTutti(null); }
  });
})();
