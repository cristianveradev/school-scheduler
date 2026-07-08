import { API_BASE, api } from "./config";
import { $ } from "./config";
import { loadDepartaments } from "./departament";
import { loadCicles } from "./cicle";
import { loadCursos } from "./curs";
import { loadGrups } from "./grup";
import { resetSelect } from "./crearJerarquia";

interface Assignacio {
    docent_id: string | number;
    modul_id: string | number;
    grup_id: string | number;
    docent?: { nom_sense: string };
}

export async function renderImparteix() {
    const pizarra = $("pizarra") as HTMLDivElement;

    pizarra.innerHTML = `
        <div class="imparteix-container">
            <h2 class="imparteix-title">
                <i class="fas fa-user-tie"></i> Assignació de Docents
            </h2>
            
            <div class="imparteix-card">
                <h3>Nova Assignació</h3>
                <form id="formImparteix" class="imparteix-form">
                    
                    <fieldset class="imparteix-fieldset">
                        <legend class="imparteix-legend">1. Selecciona el Grup i Mòdul</legend>
                        <div class="filtros imparteix-filtros">
                            <div class="campo">
                                <label for="departament">Departament</label>
                                <select id="departament" required></select>
                            </div>
                            <div class="campo">
                                <label for="cicle">Cicle</label>
                                <select id="cicle" required></select>
                            </div>
                            <div class="campo">
                                <label for="curs">Curs</label>
                                <select id="curs" required></select>
                            </div>
                            <div class="campo">
                                <label for="grup">Grup</label>
                                <select id="grup" required></select>
                            </div>
                            <div class="campo">
                                <label for="selModul">Mòdul</label>
                                <select id="selModul" required></select>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset class="imparteix-fieldset">
                        <legend class="imparteix-legend">2. Selecciona el Docent</legend>
                        <div class="filtros imparteix-filtros">
                            <div class="campo">
                                <label for="selDocent">Docent</label>
                                <select id="selDocent" required>
                                    <option value="">Carregant...</option>
                                </select>
                            </div>
                        </div>
                    </fieldset>

                    <button type="submit" class="btn-submit imparteix-btn-submit">
                        <i class="fas fa-plus"></i> Assignar
                    </button>
                </form>
            </div>

            <div class="imparteix-card">
                <div class="imparteix-table-header">
                    <h3 class="imparteix-table-title">Llistat d'Assignacions</h3>
                    <input type="text" id="buscadorTaula" placeholder="Buscar a la taula..." class="input-filtre-taula" autocomplete="off">
                </div>
                <div class="imparteix-table-container">
                    <table class="imparteix-table">
                        <thead>
                            <tr>
                                <th>Docent</th>
                                <th>Mòdul</th>
                                <th>Grup</th>
                                <th>Accions</th>
                            </tr>
                        </thead>
                        <tbody id="taulaImparteixBody">
                            <tr><td colspan="4" class="text-center">Carregant dades...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // 2. Capturamos los selects
    const selDep = $("departament") as HTMLSelectElement;
    const selCic = $("cicle") as HTMLSelectElement;
    const selCur = $("curs") as HTMLSelectElement;
    const selGru = $("grup") as HTMLSelectElement;
    const selModul = $("selModul") as HTMLSelectElement;

    // 3. Reseteos iniciales
    resetSelect(selDep);
    resetSelect(selCic);
    resetSelect(selCur);
    resetSelect(selGru);
    resetSelect(selModul);

    await loadDepartaments(selDep);

    // --- LÓGICA DE CASCADA ---
    selDep.addEventListener("change", async () => {
        const depId = selDep.value;
        resetSelect(selCic);
        resetSelect(selCur);
        resetSelect(selGru);
        resetSelect(selModul);
        if (!depId) return;
        await loadCicles(selCic, depId);
    });

    selCic.addEventListener("change", async () => {
        const cicleId = selCic.value;
        resetSelect(selCur);
        resetSelect(selGru);
        resetSelect(selModul);
        if (!cicleId) return;
        await loadCursos(selCur, cicleId);
    });

    selCur.addEventListener("change", async () => {
        const cursId = selCur.value;
        resetSelect(selGru);
        resetSelect(selModul);
        if (!cursId) return;
        await loadGrups(selGru, cursId);
        
        await cargarModulsFiltrats(selModul, selCic.value, cursId);
    });

    selGru.addEventListener("change", async () => {});

    // 4. Cargamos solo los Docentes y la Tabla
    await cargarDocents();
    await refrescarTaula();
    configurarFiltreTaula();

    // 5. Lógica de creación
    const form = $("formImparteix") as HTMLFormElement;
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const docent_id = ($("selDocent") as HTMLSelectElement).value;
        const modul_id = selModul.value;
        const grup_id = selGru.value;

        try {
            // CORRECCIÓN: Añadido "/imparteix/new"
            await api(`${API_BASE}/imparteix/new`, {
                method: "POST",
                body: JSON.stringify({ docent_id, modul_id, grup_id, hores_asignades: 0 })
            });

            form.reset();
            resetSelect(selCic);
            resetSelect(selCur);
            resetSelect(selGru);
            resetSelect(selModul);
            
            await refrescarTaula();
            
            // CORRECCIÓN: Disparamos el buscador por si había algo escrito
            $("buscadorTaula")?.dispatchEvent(new Event('input'));

            alert("Assignació creada correctament!");
            console.log(`Assignació creada: Docent ${docent_id} - Mòdul ${modul_id} - Grup ${grup_id}`);
        } catch (error: any) {
            alert(error.message || "Error al crear l'assignació.");
        }
    });
}

async function cargarModulsFiltrats(selModul: HTMLSelectElement, cicleId: string, cursId: string) {
    selModul.innerHTML = `<option value="">Carregant...</option>`;
    selModul.disabled = true;

    try {
        const res = await api(`${API_BASE}/moduls`);
        let moduls = Array.isArray(res) ? res : (res.data || []);
        
        moduls = moduls.filter((m: any) => m.cicle_id == cicleId || m.curs_id == cursId);

        if (moduls.length === 0) {
            selModul.innerHTML = `<option value="">Cap mòdul trobat</option>`;
            return;
        }

        selModul.innerHTML = `<option value="">Selecciona Mòdul...</option>` + 
            moduls.map((m: any) => `<option value="${m.id_modul}">${m.id_modul} - ${m.nom_modul}</option>`).join("");
        selModul.disabled = false;
    } catch (error) {
        console.error("Error carregant mòduls filtrats:", error);
        selModul.innerHTML = `<option value="">Error</option>`;
    }
}

async function cargarDocents() {
    try {
        const res = await api(`${API_BASE}/docents`);
        const docents = Array.isArray(res) ? res : (res.data || []);

        const selDocent = $("selDocent") as HTMLSelectElement;
        selDocent.innerHTML = `<option value="">Selecciona un docent...</option>` + 
            docents.map((d: any) => `<option value="${d.id_docent}">${d.nom_sense}</option>`).join("");
    } catch (error) {
        console.error("Error carregant docents:", error);
    }
}

function configurarFiltreTaula() {
    const buscador = $("buscadorTaula") as HTMLInputElement;
    buscador.addEventListener("input", (e) => {
        const term = (e.target as HTMLInputElement).value.toLowerCase();
        const rows = document.querySelectorAll("#taulaImparteixBody tr");
        
        rows.forEach(row => {
            if (row.querySelector(".empty-message")) return; 
            const text = row.textContent?.toLowerCase() || "";
            (row as HTMLElement).style.display = text.includes(term) ? "" : "none";
        });
    });
}

async function refrescarTaula() {
    try {
        const res = await api(`${API_BASE}/imparteix`);
        // CORRECCIÓN: Nos aseguramos de que sea un Array siempre
        const assignacions = (Array.isArray(res) ? res : res.data || []) as Assignacio[];
        
        const tbody = $("taulaImparteixBody") as HTMLTableSectionElement;
        tbody.innerHTML = "";

        if (assignacions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center empty-message">No hi ha assignacions creades.</td></tr>`;
            return;
        }

        assignacions.forEach(a => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${a.docent?.nom_sense || a.docent_id}</td>
                <td>${a.modul_id}</td>
                <td>${a.grup_id}</td>
                <td class="table-actions">
                    <button class="btn-icon btn-delete" title="Eliminar">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);

            const btnDelete = tr.querySelector(".btn-delete") as HTMLButtonElement;
            btnDelete.addEventListener("click", async () => {
                if (confirm(`Estàs segur d'eliminar aquesta assignació?`)) {
                    try {
                        await api(`${API_BASE}/imparteix/${a.docent_id}/${a.modul_id}/${a.grup_id}`, { method: "DELETE" });
                        await refrescarTaula();
                        $("buscadorTaula")?.dispatchEvent(new Event('input'));
                    } catch (error) {
                        alert("Error a l'eliminar.");
                    }
                }
            });
        });
    } catch (error) {
        console.error("Error carregant la taula:", error);
    }
}