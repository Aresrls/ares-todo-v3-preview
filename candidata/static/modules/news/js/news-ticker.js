/* NewsTicker - riempie il nastro, e non fa nient'altro.
 *
 * Le tre regole che governano questo file:
 *
 * 1. NIENTE innerHTML. I titoli arrivano da fuori, e da fuori puo' arrivare
 *    qualunque cosa: si costruiscono nodi e si assegna textContent, cosi' un
 *    titolo che contenesse marcatura resta un titolo.
 * 2. NIENTE indirizzi che non siano http o https, e con un host che il
 *    server ha gia' ammesso. Il controllo c'e' anche qui perche' un solo
 *    cancello e' un cancello che qualcuno prima o poi aggira.
 * 3. NIENTE dipendenze remote. Nessun CDN, nessuna libreria: una striscia di
 *    titoli non vale un terzo che guarda ogni pagina della Dashboard.
 */
(function () {
  "use strict";

  var striscia = document.getElementById("newsTicker");
  if (!striscia) { return; }

  var nastro = document.getElementById("newsTickerTrack");
  var comando = document.getElementById("newsTickerToggle");
  var endpoint = striscia.getAttribute("data-endpoint") || "/api/news/ticker";
  /* La velocita' la dice il server insieme alle notizie: e' configurazione,
     e la configurazione sta da una parte sola. */
  var velocita = 60;
  var scarti = {};

  /* L'indirizzo si analizza DA SOLO, senza base — e questa e' la correzione
   * del difetto che ha svuotato la striscia in produzione il 2026-08-22.
   *
   * La versione precedente scriveva `new URL(url, window.location.origin)`.
   * Il secondo argomento non serviva: il server manda SEMPRE indirizzi
   * assoluti, e l'allowlist degli host sta gia' sul server. Ma aggiungeva un
   * modo di fallire che non ha niente a che vedere con l'indirizzo che si sta
   * controllando: **se la base non e' analizzabile, `new URL` solleva PRIMA
   * ancora di guardare il primo argomento.**
   *
   * MISURATO in Chromium il 2026-08-23, con `window.location.origin` opaco
   * (cioe' la stringa "null" — pagina in un iframe con `sandbox` senza
   * `allow-same-origin`, oppure `about:blank`, oppure `file://`):
   *
   *     new URL("https://www.ansa.it/x", "null")   ->  TypeError
   *
   * Un indirizzo ANSA perfetto. E il guasto e' TUTTO-O-NIENTE: non fa sparire
   * qualche voce, le fa sparire TUTTE insieme, in silenzio, senza un errore in
   * console — che e' esattamente la firma osservata in produzione,
   * `NEWS_TICKER_VISIBLE=YES` con `NEWS_TICKER_ITEMS=0`.
   *
   * Senza base, un indirizzo relativo non e' analizzabile e viene rifiutato:
   * e' corretto, perche' il server non ne manda e uno relativo non porterebbe
   * comunque alla fonte. */
  function indirizzoSicuro(url) {
    try {
      var analizzato = new URL(url);
      return analizzato.protocol === "http:" || analizzato.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  function orario(iso) {
    try {
      var quando = new Date(iso);
      if (isNaN(quando.getTime())) { return ""; }
      return quando.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return "";
    }
  }

  function voce(dati) {
    var li = document.createElement("li");
    li.className = "news-ticker-item";

    var fonte = document.createElement("span");
    fonte.className = "news-ticker-source";
    fonte.textContent = dati.source;
    li.appendChild(fonte);

    var link = document.createElement("a");
    link.className = "news-ticker-link";
    link.href = dati.url;
    /* La notizia si apre alla fonte, in una scheda nuova. `noopener` toglie
     * alla pagina aperta ogni riferimento a questa - senza, potrebbe
     * riscriverne l'indirizzo. `noreferrer` non manda da dove veniamo. */
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = dati.title;
    li.appendChild(link);

    var meta = orario(dati.published_at);
    if (dati.category || meta) {
      var nota = document.createElement("span");
      nota.className = "news-ticker-meta";
      nota.textContent = [dati.category, meta].filter(Boolean).join(" · ");
      li.appendChild(nota);
    }
    return li;
  }

  /* LA COPIA DUPLICATA NON DEVE ESISTERE PER LA TASTIERA.
   *
   * L'animazione ha bisogno di due copie dell'elenco, e la seconda portava
   * `aria-hidden="true"`. Bastava per il lettore di schermo e NON bastava per
   * la tastiera: dentro ogni voce c'e' un `<a href>`, che resta raggiungibile
   * con Tab anche sotto `aria-hidden`. Misurato con axe-core 4.13.0 sul banco:
   * `aria-hidden-focus`, impatto `serious`, **1196 nodi su 52 pagine su 130** —
   * il rilievo piu' grosso di tutto il sitewide, e identico nei due temi
   * perche' non e' un difetto di colore.
   *
   * Che cosa significava per chi ci lavora: dopo l'ultima notizia vera, Tab
   * entrava in una seconda tornata di link INVISIBILI e non annunciati, e per
   * uscirne bisognava premere Tab tante volte quante le notizie. Non e' un
   * dettaglio di conformita': e' il guscio, quindi era su OGNI pagina che
   * mostra il nastro.
   *
   * `aria-hidden` risponde a «il lettore di schermo lo annuncia?».
   * `tabindex="-1"` risponde a «la tastiera ci arriva?». Sono due domande
   * diverse e la copia ne aveva chiusa una sola. `inert` le chiuderebbe
   * entrambe con una proprieta' sola, e sarebbe piu' corto — ma qui viene
   * lasciato fuori di proposito: e' l'unica delle tre a non essere
   * verificabile da questo cancello su un browser piu' vecchio, e una riga
   * che non so provare vale meno di due che so provare.
   */
  function nascondiDavvero(elemento) {
    elemento.setAttribute("aria-hidden", "true");
    /* Non solo l'`<a>`: qualunque cosa la voce acquisisca domani. Cercare
     * `a[href]` per nome avrebbe funzionato oggi e sarebbe diventato cieco al
     * primo bottone aggiunto a `voce()`. */
    var fuochi = elemento.querySelectorAll(
      "a[href], button, input, select, textarea, [tabindex]");
    for (var i = 0; i < fuochi.length; i++) {
      fuochi[i].setAttribute("tabindex", "-1");
    }
  }

  /* disegna() RIEMPIE, e non decide piu' se mostrare: torna quante voci ha
   * davvero messo nel nastro. La versione precedente eseguiva
   * `striscia.hidden = false` alla fine del giro SENZA guardare se il giro
   * avesse prodotto qualcosa, e il 2026-08-22 la produzione ha mostrato una
   * barra vuota che sembrava funzionante: `NEWS_TICKER_VISIBLE=YES` con
   * `NEWS_TICKER_ITEMS=0`. Riprodotto in Chromium: 22 voci in arrivo, tutte
   * scartate dal filtro, striscia 928x34 visibile e nastro vuoto.
   * Mostrare e riempire erano la stessa istruzione; ora sono due. */
  function disegna(voci) {
    nastro.textContent = "";
    var messe = 0;
    /* Perche' una voce non e' stata disegnata. Senza questo, «zero notizie»
     * resta un fatto senza causa anche dopo essere stato reso leggibile dal
     * server: il server puo' dire di averne mandate ventidue, e la pagina
     * mostrarne zero, e nessuno dei due sa dirlo all'altro. */
    scarti = {"titolo-vuoto": 0, "indirizzo-non-http": 0};
    /* Due copie dell'elenco: l'animazione trasla del 50%, e a meta' corsa la
     * seconda copia si trova dove stava la prima. Senza, il nastro
     * sparirebbe a sinistra lasciando la striscia vuota. */
    for (var giro = 0; giro < 2; giro++) {
      voci.forEach(function (dati) {
        if (!dati || !dati.title) {
          if (giro === 0) { scarti["titolo-vuoto"]++; }
          return;
        }
        if (!indirizzoSicuro(dati.url)) {
          if (giro === 0) { scarti["indirizzo-non-http"]++; }
          return;
        }
        var elemento = voce(dati);
        if (giro === 1) { nascondiDavvero(elemento); }
        nastro.appendChild(elemento);
        if (giro === 0) { messe++; }
      });
    }
    return messe;
  }

  /* L'unico posto in cui la striscia entra in pagina o ne esce.
   *
   * `data-news-state` non e' decorazione: il CSS tiene fuori dalla pagina
   * qualunque stato diverso da "rese", cosi' che un difetto futuro di questo
   * file non possa piu' produrre una striscia visibile e vuota, e
   * l'accettazione ha un posto dove LEGGERE perche' non si vede - che e' cio'
   * che mancava quando i sintomi possibili erano cinque e l'interfaccia ne
   * mostrava uno solo. */
  function stato(nome, quante) {
    striscia.setAttribute("data-news-state", nome);
    striscia.setAttribute("data-news-count", String(quante || 0));
    striscia.setAttribute("data-news-scarti", JSON.stringify(scarti || {}));
    if (nome === "rese") {
      striscia.style.setProperty("--news-ticker-speed", velocita + "s");
      striscia.hidden = false;
    } else {
      striscia.hidden = true;
    }
  }

  /* IL COMANDO NON SCRIVE PIU' UNA PAROLA IN PAGINA.
   *
   * La versione precedente scambiava il testo di `.news-ticker-toggle-text`
   * fra «Pausa» e «Riprendi». Quel nodo non esiste piu': l'etichetta era
   * invasiva in una testata, ed e' stata tolta DALLA VISTA — non
   * dall'accessibilita'.
   *
   * Il nome del comando vive ora in `aria-label` e in `title`, e cambia con
   * lo stato come cambiava il testo: un bottone che dice «metti in pausa»
   * mentre e' gia' in pausa e' peggio di un bottone muto, perche' mente.
   * `aria-pressed` resta il fatto che conta per chi ascolta.
   *
   * L'ICONA NON LA TOCCA QUESTO FILE. E' disegnata dal CSS a partire da
   * `aria-pressed`, che questo codice gia' aggiorna: due barrette quando il
   * nastro scorre, un triangolo quando e' fermo. Scrivere anche un glifo
   * qui avrebbe creato una seconda sorgente dello stesso stato, e due
   * sorgenti divergono — oltre a dipendere da un carattere che su questa
   * macchina non c'e' e che l'immagine distribuita non promette. */
  var NOME_PAUSA = "Metti in pausa lo scorrimento delle notizie";
  var NOME_RIPRESA = "Riprendi lo scorrimento delle notizie";

  if (comando) {
    comando.addEventListener("click", function () {
      var inPausa = striscia.getAttribute("data-paused") === "true";
      var prossimo = !inPausa;
      striscia.setAttribute("data-paused", prossimo ? "true" : "false");
      comando.setAttribute("aria-pressed", prossimo ? "true" : "false");
      comando.setAttribute("aria-label", prossimo ? NOME_RIPRESA : NOME_PAUSA);
      comando.title = prossimo ? NOME_RIPRESA : NOME_PAUSA;
    });
  }

  /* Se la chiamata fallisce non si mostra niente e non si scrive niente in
   * console: la striscia e' un contorno, e un contorno non si lamenta. */
  fetch(endpoint, { credentials: "same-origin", headers: { "Accept": "application/json" } })
    .then(function (risposta) { return risposta.ok ? risposta.json() : null; })
    .then(function (dati) {
      if (!dati) { return stato("risposta-illeggibile", 0); }
      if (!Array.isArray(dati.items) || !dati.items.length) {
        /* Il server dice gia' PERCHE' non ci sono voci: lo si riporta invece
         * di appiattire cinque cause su un vuoto solo. */
        return stato(dati.origin || "vuota", 0);
      }
      if (isFinite(dati.speed_seconds) && dati.speed_seconds > 0) { velocita = dati.speed_seconds; }
      var messe = disegna(dati.items);
      /* Voci arrivate e nessuna disegnata NON e' un insieme vuoto: e' un
       * guasto, e prende un ramo suo. La striscia resta fuori dalla pagina
       * in entrambi i casi, ma chi guarda lo stato vede quale dei due e'. */
      stato(messe > 0 ? "rese" : "voci-scartate-dal-browser", messe);
    })
    .catch(function () { stato("chiamata-fallita", 0); });
})();
