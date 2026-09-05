/* SCRIPT DELL'ANTEPRIMA — piccolo di proposito.
 *
 * NON e' il meccanismo che rende inerte la scrittura: quello e' la
 * costruzione, che ha tolto l'elemento `form` e l'attributo `href`.
 * Con JavaScript spento la pagina resta ugualmente inerte e ugualmente
 * dichiarata, perche' la barra e la nota sono HTML e CSS. Questo file
 * aggiunge soltanto il distintivo persistente e un rifiuto esplicito al
 * clic, che spiega invece di non fare nulla.
 */
(function () {
  "use strict";

  var distintivo = document.createElement("div");
  distintivo.className = "anteprima-distintivo";
  distintivo.textContent = "ANTEPRIMA · DATI FITTIZI";
  document.addEventListener("DOMContentLoaded", function () {
    document.body.appendChild(distintivo);
  });

  /* Un clic su un comando di scrittura non deve sembrare un guasto
   * dell'interfaccia: deve dire perche' non succede niente. */
  document.addEventListener("click", function (evento) {
    var inerte = evento.target.closest
      ? evento.target.closest("[data-anteprima-modulo] button,"
          + " [data-anteprima-modulo] input[type=submit],"
          + " [data-anteprima-morto]")
      : null;
    if (!inerte) { return; }
    evento.preventDefault();
    var nota = inerte.closest("[data-anteprima-modulo]")
      ? "Questa e' una scrittura: l'anteprima statica non ha un server."
      : "Questa pagina non e' inclusa nell'anteprima.";
    inerte.setAttribute("title", nota);
  }, true);
})();
