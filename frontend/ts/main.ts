import "./config";
import "./inici";
import "./calendario";
import "./crearJerarquia";
import "./franjas";
import "./imparteix";
import "./docent";
import "./usuari"

import { $ } from "./config";
import { mostrarJerarquia } from "./calendario";
import { inicioJerarquia } from "./crearJerarquia";
import { inicioFranjas } from "./franjas";
import { renderImparteix } from "./imparteix";
import { initUsuaris, initPermisUsuaris, initPermisUsuarisVisio } from "./usuari";
import { renderDocents } from "./docent";

document.addEventListener("DOMContentLoaded", () => {

    const btnCalendari = $("btnCalendari");
    const btnJerarquia = $("btnJerarquia");
    const btnFranges = $("btnFranges");
    const btnImparteix = $("btnImparteix");
    const btnCrearDocent = $("btnDocent");

    initPermisUsuaris();
    initPermisUsuarisVisio();

    btnCalendari?.addEventListener("click", (e) => {
        e.preventDefault(); // evita que el <a href="#"> recargue
        mostrarJerarquia();
    });

    btnJerarquia?.addEventListener("click", (e) => {
        e.preventDefault();
        inicioJerarquia();
    });

    btnFranges?.addEventListener("click", (e) => {
        e.preventDefault();
        inicioFranjas();
    });

    btnImparteix?.addEventListener("click", async (e) => {
        renderImparteix();
        e.preventDefault();
    })

    btnCrearDocent?.addEventListener("click", async (e) => {
        e.preventDefault();
        const mainContainer = $("pizarra") as HTMLDivElement;
        mainContainer.innerHTML = ''; //Neteja el contingut actual
        await renderDocents(mainContainer);
    });

    initUsuaris();
});