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
    var riga = document.querySelector(
      '[data-tv3-riga][data-tv3-todo="' + id + '"] .todo-v3-nome'
    );
    if (riga) {
      riga.focus();
    }
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

    /* Anche il clic sul comando visibile segna il fuoco: la tastiera e
     * il mouse devono lasciare la stessa pagina nello stesso stato. */
    var chiudi = chiusuraDelDrawer();
    if (chiudi) {
      chiudi.addEventListener("click", function () {
        segnaFuoco(chiudi.getAttribute("data-tv3-chiudi"));
      });
    }

    riportaIlFuoco();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", collega);
  } else {
    collega();
  }
})();
