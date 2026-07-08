import { $ } from "./config";
import { loadDepartaments, renderDepartaments } from "./departament";
import { loadCicles, renderCicles } from "./cicle";
import { loadCursos, renderCursos } from "./curs";
import { loadGrups, renderGrups } from "./grup";
import { renderModuls } from "./modul";

export function resetSelect(sel: HTMLSelectElement) {
    sel.innerHTML = `<option value="">-- Selecciona --</option>`;
    sel.value = "";
}

export async function inicioJerarquia() {
    const pizarra = $("pizarra") as HTMLDivElement;
    pizarra.innerHTML = `
        <div id="inicioJerarquia">
            <div class="filtros">
                <div class="campo">
                    <label for="departament">Departament</label>
                    <select id="departament"></select>
                </div>
                <div class="campo">
                    <label for="cicle">Cicle</label>
                    <select id="cicle"></select>
                </div>
                <div class="campo">
                    <label for="curs">Curs</label>
                    <select id="curs"></select>
                </div>
                <div class="campo" style="visibility: hidden;">
                    <label for="grup">Grup</label>
                    <select id="grup"></select>
                </div>
            </div>
            

            <div id="insertarJerarquias" class="jerarquia-grid">
                <div id="jerarquiaForm" class="jerarquia-col"></div>
                <div id="jerarquiaList" class="jerarquia-col"></div>
            </div>
        </div>
    `;

    const selDep = $("departament") as HTMLSelectElement;
    const selCic = $("cicle") as HTMLSelectElement;
    const selCur = $("curs") as HTMLSelectElement;
    const selGru = $("grup") as HTMLSelectElement;

    const formDiv = $("jerarquiaForm") as HTMLDivElement;
    const listDiv = $("jerarquiaList") as HTMLDivElement;

    // placeholders iniciales
    resetSelect(selDep);
    resetSelect(selCic);
    resetSelect(selCur);
    resetSelect(selGru);

    // 1) cargar departamentos + pintar UI de departamentos
    await loadDepartaments(selDep);
    await renderDepartaments(formDiv, listDiv, selDep, async () => {
        resetSelect(selCic);
        resetSelect(selCur);
        resetSelect(selGru);
    });

    // 2) onchange departamento
    selDep.addEventListener("change", async () => {
        const depId = selDep.value;

        resetSelect(selCic);
        resetSelect(selCur);
        resetSelect(selGru);

        if (!depId) {
            await renderDepartaments(formDiv, listDiv, selDep, async () => {
            resetSelect(selCic);
            resetSelect(selCur);
            resetSelect(selGru);
            });
            return;
        }
        // 3) cargar ciclos + pintar UI de ciclos
        await loadCicles(selCic, depId);
        await renderCicles(formDiv, listDiv, selCic, depId, async () => {
            resetSelect(selCur);
            resetSelect(selGru);
        });
    });

    // 4) onchange ciclo
    selCic.addEventListener("change", async () => {
        const cicleId = selCic.value;

        resetSelect(selCur);
        resetSelect(selGru);

        if (!cicleId){
            const depId = selDep.value;
            await renderCicles(formDiv, listDiv, selCic, depId, async () => {
                resetSelect(selCur);
                resetSelect(selGru);
            });
            return;
        } 
        // 5) cargar cursos + pintar UI de cursos
        await loadCursos(selCur, cicleId);
        await renderCursos(formDiv, listDiv, selCur, cicleId, async () => {
            resetSelect(selGru);
        });
    });

    // 6) onchange curso
    selCur.addEventListener("change", async () => {
        const cursId = selCur.value;

        resetSelect(selGru);
        if (!cursId){
            const cicleId = selCic.value;
            await renderCursos(formDiv, listDiv, selCur, cicleId, async () => {
                resetSelect(selGru);
            });
            return;
        }
        // 7) cargar grupos + pintar UI de grupos
        await loadGrups(selGru, cursId);
        //Como hay dos entidades, pintamos un menú para elegir qué gestionar
        formDiv.innerHTML = `
            <h3>Gestionar Curs: ${cursId}</h3>
            <div style="display:flex; gap:10px; margin-bottom: 20px;">
                <button id="btnGestionarGrups" class="btn-tab active">Gestionar Grups</button>
                <button id="btnGestionarModuls" class="btn-tab">Gestionar Mòduls</button>
            </div>
            <div id="subFormArea"></div>
        `;
        listDiv.innerHTML = `<div id="subListArea"></div>`;

        const subFormArea = $("subFormArea") as HTMLDivElement;
        const subListArea = $("subListArea") as HTMLDivElement;
        const btnGrups = $("btnGestionarGrups") as HTMLButtonElement;
        const btnModuls = $("btnGestionarModuls") as HTMLButtonElement;

        //por defecto mostramos grupos
        await renderGrups(subFormArea, subListArea, selGru, cursId, async () => { });

        // Lógica al hacer clic en Grupos
        btnGrups.addEventListener("click", async (e) => {
            e.preventDefault();
            // Cambiamos el estilo visual para indicar que está activo
            btnGrups.classList.add("active");
            btnModuls.classList.remove("active");
            await renderGrups(subFormArea, subListArea, selGru, cursId, async () => { });
        });

        // Lógica al hacer clic en Módulos
        btnModuls.addEventListener("click", async (e) => {
            e.preventDefault();
            // Cambiamos el estilo visual para indicar que está activo
            btnModuls.classList.add("active");
            btnGrups.classList.remove("active");
            await renderModuls(subFormArea, subListArea, cursId, async () => { });
        });
    });
}

export function setOptions(
    select: HTMLSelectElement,
    items: Array<{ value: string; label: string }>,
    placeholder = "-- Selecciona --"
    ) {
    select.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = placeholder;
    select.appendChild(opt0);
    for (const it of items) {
        const opt = document.createElement("option");
        opt.value = it.value;
        opt.textContent = it.label;
        select.appendChild(opt);
    }
}