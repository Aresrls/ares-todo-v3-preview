/* ARES To-Do V3 — la tastiera del drawer e del pannello di creazione.
 *
 * TRE REGOLE, E NESSUNA INVENTA UNA FUNZIONE.
 *
 * 1. `Escape` chiude cio' che e' aperto. Non simula una chiusura: segue
 *    lo STESSO indirizzo del comando di chiusura visibile, quindi la
 *    pagina che ne esce e' identica a quella del clic. Un percorso
 *    diverso per la tastiera sarebbe una seconda implementazione della
 *    stessa cosa, e le due divergerebbero.
 *
 * 2. IL FUOCO TORNA AL TRIGGER. Qui la navigazione e' del SERVER: chi
 *    chiude il drawer riceve una pagina nuova, e l'elemento che aveva
 *    aperto il drawer non esiste piu' come oggetto — esiste come RIGA
 *    con lo stesso identificativo. Si segna quale riga rimettere a
 *    fuoco, e la si mette a fuoco DOPO il caricamento successivo. Il
 *    segno vale una volta sola: senza consumarlo, ogni ricaricamento
 *    successivo sposterebbe il fuoco da solo, che e' esattamente il
 *    difetto che questa regola esiste per evitare.
 *
 * 3. AL CARICAMENTO IL FUOCO NON SI MUOVE. Il proprietario lo ha chiesto
 *    per esteso: nessun elemento del drawer davanti al salto al
 *    contenuto. Quindi il fuoco si sposta SOLO quando questa pagina e'
 *    il ritorno da una chiusura fatta poco fa — mai su un ingresso.
 *
 * SENZA QUESTO FILE IL GUSCIO RESTA USABILE: chiusura, apertura e
 * creazione sono link e moduli, e funzionano senza JavaScript. Qui si
 * aggiunge la tastiera, non la funzione.
 */
(function () {
  "use strict";

  var CHIAVE = "ares.todo-v3.fuoco";
  var CHIAVE_APERTURA = "ares.todo-v3.apertura";
  var VITA_MS = 15000;

  function radice() {
    return document.querySelector("[data-todo-v3]");
  }

  /* L'indirizzo di chiusura si LEGGE dal comando visibile, non si
   * ricompone: due composizioni della stessa query divergono alla prima
   * aggiunta di un parametro, ed e' gia' successo in questo modulo. */
  function chiusuraDelDrawer() {
    return document.querySelector("[data-tv3-chiudi]");
  }

  function chiusuraDellaCreazione() {
    return document.querySelector("[data-tv3-annulla-crea]");
  }

  function segnaFuoco(idTodo) {
    if (!idTodo) {
      return;
    }
    try {
      window.sessionStorage.setItem(
        CHIAVE,
        JSON.stringify({ id: String(idTodo), t: Date.now() })
      );
    } catch (e) {
      /* Archiviazione negata (finestra privata, cookie di terze parti
       * bloccati): il fuoco non torna e tutto il resto funziona. Una
       * comodita' che fallisce non deve fermare una chiusura. */
    }
  }

  function leggiFuocoUnaVolta() {
    var grezzo = null;
    try {
      grezzo = window.sessionStorage.getItem(CHIAVE);
      window.sessionStorage.removeItem(CHIAVE);
    } catch (e) {
      return null;
    }
    if (!grezzo) {
      return null;
    }
    var dato = null;
    try {
      dato = JSON.parse(grezzo);
    } catch (e) {
      return null;
    }
    if (!dato || !dato.id || typeof dato.t !== "number") {
      return null;
    }
    /* Un segno vecchio non e' un ritorno: e' una scheda lasciata aperta
     * e ripresa domani. Rimettere il fuoco li' sarebbe uno spostamento
     * che nessuno ha chiesto. */
    if (Date.now() - dato.t > VITA_MS) {
      return null;
    }
    return dato.id;
  }

  function riportaIlFuoco() {
    var id = leggiFuocoUnaVolta();
    if (!id) {
      return;
    }
    /* Se il drawer e' di nuovo aperto non e' una chiusura: non si tocca
     * niente. */
    if (document.querySelector("[data-tv3-drawer]")) {
      return;
    }
    /* L'identificativo si legge sull'ANCORA, che e' l'elemento che
     * prende il fuoco: cosi' chi misura puo' verificare che il fuoco sia
     * tornato su QUELLA riga e non su una qualunque. */
    var bersaglio = document.querySelector(
      'a.todo-v3-nome[data-tv3-todo="' + id + '"]'
    );
    if (bersaglio) {
      bersaglio.focus();
    }
  }

  function segnaApertura(idTodo) {
    if (!idTodo) {
      return;
    }
    try {
      window.sessionStorage.setItem(
        CHIAVE_APERTURA,
        JSON.stringify({ id: String(idTodo), t: Date.now() })
      );
    } catch (e) {
      /* Archiviazione negata: il fuoco non entra, e il drawer resta
       * raggiungibile con la tastiera come qualunque altro contenuto. */
    }
  }

  function leggiAperturaUnaVolta() {
    var grezzo = null;
    try {
      grezzo = window.sessionStorage.getItem(CHIAVE_APERTURA);
      window.sessionStorage.removeItem(CHIAVE_APERTURA);
    } catch (e) {
      return null;
    }
    if (!grezzo) {
      return null;
    }
    var dato = null;
    try {
      dato = JSON.parse(grezzo);
    } catch (e) {
      return null;
    }
    if (!dato || !dato.id || typeof dato.t !== "number") {
      return null;
    }
    if (Date.now() - dato.t > VITA_MS) {
      return null;
    }
    return dato.id;
  }

  function entraNelDrawer() {
    var id = leggiAperturaUnaVolta();
    if (!id) {
      return false;
    }
    var chiudi = chiusuraDelDrawer();
    /* Il drawer aperto dev'essere QUELLO che si e' chiesto di aprire: se
     * il server ne ha reso un altro — la To-Do non e' piu' leggibile e
     * l'elenco ha ripiegato — spostare il fuoco la' dentro porterebbe
     * l'operatore su una cosa che non ha scelto. */
    if (!chiudi || chiudi.getAttribute("data-tv3-chiudi") !== String(id)) {
      return false;
    }
    chiudi.focus();
    return true;
  }

  function suTasto(evento) {
    if (evento.key !== "Escape" || evento.defaultPrevented) {
      return;
    }

    var annulla = chiusuraDellaCreazione();
    if (annulla) {
      evento.preventDefault();
      window.location.assign(annulla.getAttribute("href"));
      return;
    }

    var chiudi = chiusuraDelDrawer();
    if (chiudi) {
      evento.preventDefault();
      segnaFuoco(chiudi.getAttribute("data-tv3-chiudi"));
      window.location.assign(chiudi.getAttribute("href"));
    }
  }

  function collega() {
    if (!radice()) {
      return;
    }

    document.addEventListener("keydown", suTasto);

    /* Anche il clic segna il fuoco, e su TUTTE le chiusure: il comando
     * visibile e il velo portano lo stesso indirizzo, quindi devono
     * lasciare la pagina nello stesso stato. Agganciarne una sola
     * produce un ritorno del fuoco che funziona a volte, ed e' peggio di
     * uno che non funziona mai: sembra un comportamento del browser. */
    var chiusure = document.querySelectorAll("[data-tv3-chiudi]");
    Array.prototype.forEach.call(chiusure, function (nodo) {
      nodo.addEventListener("click", function () {
        segnaFuoco(nodo.getAttribute("data-tv3-chiudi"));
      });
    });

    /* Le righe segnano l'APERTURA: e' il verso opposto del segno di
     * chiusura, e i due non si incontrano mai — uno si scrive dove il
     * drawer non c'e', l'altro dove c'e'. */
    var aperture = document.querySelectorAll("[data-tv3-riga] .todo-v3-nome");
    Array.prototype.forEach.call(aperture, function (nodo) {
      nodo.addEventListener("click", function () {
        segnaApertura(nodo.getAttribute("data-tv3-todo"));
      });
    });

    /* Prima si prova a ENTRARE, e solo se non c'e' un'apertura da
     * onorare si prova a TORNARE: i due segni sono distinti, ma leggerli
     * nell'ordine sbagliato consumerebbe quello sbagliato. */
    if (!entraNelDrawer()) {
      riportaIlFuoco();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", collega);
  } else {
    collega();
  }
})();
