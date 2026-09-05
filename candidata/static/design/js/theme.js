/* IL SISTEMA DI TEMA — il lato client, ed e' volutamente piccolo.
 *
 * La shell dichiara un contratto e non lo implementa: `[data-ares-theme-toggle]`
 * emette `ares:theme-toggle` sul documento con `{ current }`. Questo file
 * e' l'unico ascoltatore. Non ne affianca un secondo, non aggiunge un
 * proprio gestore di click sul bottone, non legge i colori: cambia un
 * attributo e scrive un cookie.
 *
 * PERCHE' IL COOKIE E NON `localStorage`
 * --------------------------------------
 * Perche' il tema deve essere gia' giusto nel primo byte di HTML. Con
 * `localStorage` il server non sa nulla, manda la pagina scura, il
 * browser dipinge, poi questo file corregge: il lampo. Il cookie viaggia
 * con la richiesta e `ares_theme()` lo legge durante il rendering. Qui
 * il cookie si scrive soltanto; a leggerlo e' il server.
 *
 * PERCHE' NESSUNA NAVIGAZIONE
 * ---------------------------
 * L'attributo cambia sul posto. Nessun `location.reload()`, nessun POST,
 * nessun form: un modulo a meta' compilazione resta compilato, e il
 * workspace To-Do non perde la scheda aperta. Il ricaricamento
 * successivo trova lo stesso valore nel cookie e rende la stessa cosa,
 * quindi le due strade non possono divergere: partono dallo stesso nome.
 */
(function () {
  "use strict";

  var COOKIE = "ares_theme";
  var DARK = "dark";
  var LIGHT = "light";
  var root = document.documentElement;

  function normalise(value) {
    return value === LIGHT ? LIGHT : DARK;
  }

  function persist(theme) {
    try {
      document.cookie =
        COOKIE + "=" + theme + ";path=/;max-age=31536000;SameSite=Lax";
    } catch (error) {
      /* Un browser che rifiuta i cookie non deve impedire il cambio tema
       * per la sessione corrente: l'attributo e' gia' cambiato, si perde
       * solo la memoria fra un caricamento e l'altro. */
    }
  }

  /* LE QUATTRO STRINGHE STANNO QUI E BASTA.
   *
   * `app_base.html` le rende sul server perche' il primo byte sia gia'
   * giusto, e questo file le riscrive quando il tema cambia senza
   * ricaricare. Sono gli stessi testi, e tenerli in una tabella sola e'
   * la ragione per cui non possono divergere — divergere e' esattamente
   * cio' che era gia' successo: il foglio cercava `.shell-nav-label` e il
   * template offriva uno `<span>` nudo, quindi l'etichetta non cambiava
   * MAI e il comando restava generico in entrambi i temi.
   *
   * `stato` e' cio' che si sta guardando, `azione` e' cio' che il click
   * fara'. Sono due frasi diverse di proposito: una sola delle due
   * lascia sempre in dubbio se «Tema chiaro» descriva il presente o la
   * destinazione. */
  /* IL SIMBOLO E' UN DISEGNO, NON PIU' UN CARATTERE.
   *
   * `simbolo` conteneva `\uD83C\uDF19` e `\u2600\uFE0F` — la luna e il sole
   * come emoji — e `vesti()` le scriveva con `textContent`. Da quando l'icona
   * e' un `<svg><use>`, `textContent` NON avrebbe fatto apparire un'altra
   * icona: avrebbe CANCELLATO l'`<use>` e lasciato uno spazio vuoto, senza
   * alcun errore in console. Il commutatore avrebbe funzionato — il tema
   * cambia davvero — e avrebbe perso la propria icona al primo click.
   * Ora si scambia il bersaglio del riferimento, che e' l'unica cosa da
   * cambiare. */
  var TESTI = {};
  TESTI[DARK]  = { stato: "Tema scuro",  azione: "Passa a chiaro",
                   simbolo: "#i-luna", titolo: "Passa al tema chiaro" };
  TESTI[LIGHT] = { stato: "Tema chiaro", azione: "Passa a scuro",
                   simbolo: "#i-sole", titolo: "Passa al tema scuro" };

  function vesti(toggle, theme) {
    var t = TESTI[theme];
    toggle.setAttribute("data-ares-theme-current", theme);
    toggle.setAttribute("aria-pressed", theme === LIGHT ? "true" : "false");
    toggle.setAttribute("title", t.titolo);
    var label = toggle.querySelector(".shell-nav-label");
    if (label) label.textContent = t.stato;
    var azione = toggle.querySelector("[data-ares-theme-action]");
    if (azione) azione.textContent = t.azione;
    var simbolo = toggle.querySelector("[data-ares-theme-icon]");
    if (simbolo) {
      var uso = simbolo.querySelector("use");
      /* `setAttribute` su `href` e non sulla proprieta': dentro SVG l'attributo
       * e' quello che conta, e la proprieta' omonima non esiste su tutti i
       * motori. */
      if (uso) uso.setAttribute("href", t.simbolo);
    }
  }

  function apply(theme) {
    root.setAttribute("data-ares-theme", theme);
    var toggles = document.querySelectorAll("[data-ares-theme-toggle]");
    for (var i = 0; i < toggles.length; i++) {
      vesti(toggles[i], theme);
    }
    /* Chi ha bisogno di reagire al cambio — un grafico che ricalcola i
     * propri colori — ascolta questo, non fruga nel cookie. */
    document.dispatchEvent(
      new CustomEvent("ares:theme-changed", { detail: { theme: theme } })
    );
  }

  document.addEventListener("ares:theme-toggle", function (event) {
    var current = normalise(
      (event && event.detail && event.detail.current) ||
        root.getAttribute("data-ares-theme")
    );
    var next = current === LIGHT ? DARK : LIGHT;
    apply(next);
    persist(next);
  });

  /* Allineamento all'avvio: l'attributo lo ha gia' scritto il server, qui
   * si sistemano solo le etichette del commutatore. Non si tocca
   * l'attributo, altrimenti si reintrodurrebbe la seconda pittura che
   * tutto questo esiste per togliere. */
  apply(normalise(root.getAttribute("data-ares-theme")));
})();
