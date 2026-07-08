// frontend/ts/modul.ts
import { API_BASE, api, $ } from "./config";
import { setOptions } from "./crearJerarquia";

type Modul = { id_modul: string; nom_modul: string; hores_setmana: number; color: string; curs_id: string };

export async function loadModuls(sel: HTMLSelectElement, cursId: string) {
    if (!cursId) return setOptions(sel, []);
    const moduls = await api<Modul[]>(`${API_BASE}/moduls/curs/${encodeURIComponent(cursId)}`);
    setOptions(sel, moduls.map((m) => ({ value: m.id_modul, label: m.nom_modul })));
}

//función para editar el módulo
async function openEditModulModal(
    current: Modul,
    onSave: (updated: { newId: string; newName: string; newHores: number; newColor: string; newCursId: string }) => Promise<void>
) {
    // 1. Pedimos todos los cursos al backend para rellenar el desplegable
    const cursos = await api<Array<{id_curs: string, nivell: number, cicle_id: string}>>(`${API_BASE}/cursos`);
    
    // 2. Generamos las opciones del select
    const opcionesCursos = cursos.map(c => 
        `<option value="${c.id_curs}" ${c.id_curs === current.curs_id ? 'selected' : ''}>
            ${c.id_curs} (Nivell ${c.nivell} - ${c.cicle_id})
        </option>`
    ).join("");

    document.getElementById("modalOverlay")?.remove();

    const overlay = document.createElement("div");
    overlay.id = "modalOverlay";
    overlay.innerHTML = `
        <div id="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
            <h3>Editar mòdul</h3>
            <button type="button" id="modalClose" aria-label="Cerrar">✕</button>
        </div>

        <form id="modalModulForm" class="modal-body">
            <label style="display:grid;gap:6px">
            <span>ID mòdul</span>
            <input id="modalModulId" value="${current.id_modul}" />
            </label>

            <label style="display:grid;gap:6px">
            <span>Nom mòdul</span>
            <input id="modalModulNom" value="${current.nom_modul}" />
            </label>

            <label style="display:grid;gap:6px">
            <span>Hores Setmana</span>
            <input id="modalModulHores" type="number" value="${current.hores_setmana}" />
            </label>

            <label style="display:grid;gap:6px">
                <span>Color</span>
                <input id="modalModulColor" type="color" value="${current.color}" />
            </label>

            <label style="display:grid;gap:6px">
            <span>Curs al que pertany</span>
            <select id="modalModulCurs" style="padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                ${opcionesCursos}
            </select>
            </label>

            <div class="modal-actions">
            <button type="button" id="modalCancel">Cancel·lar</button>
            <button type="submit" id="modalSave">Guardar</button>
            </div>
        </form>
        </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    (document.getElementById("modalClose") as HTMLButtonElement).addEventListener("click", close);
    (document.getElementById("modalCancel") as HTMLButtonElement).addEventListener("click", close);

    const form = document.getElementById("modalModulForm") as HTMLFormElement;
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const newId = (document.getElementById("modalModulId") as HTMLInputElement).value.trim();
        const newName = (document.getElementById("modalModulNom") as HTMLInputElement).value.trim();
        const newHores = parseInt((document.getElementById("modalModulHores") as HTMLInputElement).value.trim(), 10);
        const newColor = (document.getElementById("modalModulColor") as HTMLInputElement).value.trim();
        const newCursId = (document.getElementById("modalModulCurs") as HTMLSelectElement).value.trim();

        if (!newId || !newName || isNaN(newHores) || !newColor || !newCursId) return alert("Falten dades o hores no vàlides");

        await onSave({ newId, newName, newHores, newColor, newCursId });
        close();
    });

    (document.getElementById("modalModulNom") as HTMLInputElement).focus();
}

export async function renderModuls(
    form: HTMLDivElement,
    list: HTMLDivElement,
    cursId: string,
    onAfterChange: (keepSelected?: string) => Promise<void>
) {
    form.innerHTML = `
        <form id="modulForm" style="margin-top:12px;display:grid;gap:10px">
        <input id="modulId" placeholder="id_modul (ej: M01)" />
        <input id="modulNom" placeholder="nom_modul" />
        <input id="modulHores" type="number" placeholder="Hores setmana" />
        <input id="modulColor" type="color" value="#3498db" />
        <button type="submit">Crear mòdul</button>
        </form>
    `;

    list.innerHTML = `<h3>Llistat de Mòduls</h3><div id="modulList" style="margin-top:12px"></div>`;

    async function refresh(keepSelected?: string) {
        const moduls = await api<Modul[]>(`${API_BASE}/moduls/curs/${encodeURIComponent(cursId)}`);
        const container = $("modulList") as HTMLDivElement;

        container.innerHTML = moduls
            .map(
                (m) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border:1px solid #e0e0e0;border-radius:10px;margin-bottom:8px">
                    <div style="display:flex;align-items:center;gap:10px">
                        <div style="width:18px;height:18px;border-radius:50%;background:${m.color};border:1px solid #ccc"></div>
                        <div>
                            <div style="font-weight:700">${m.nom_modul}</div>
                            <div style="color:#666;font-size:12px">${m.id_modul} · ${m.hores_setmana}h/setmana · ${m.color}</div>
                        </div>
                    </div>
                    <div style="display:flex;gap:8px">
                        <button data-upd="${m.id_modul}">Editar</button>
                        <button data-del="${m.id_modul}">Eliminar</button>
                    </div>
                </div>
            `).join("");


        await onAfterChange(keepSelected);

        // Evento Eliminar
        container.querySelectorAll("button[data-del]").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const id = (btn as HTMLButtonElement).dataset.del!;
                if (!confirm(`Eliminar mòdul "${id}"?`)) return;
                await api(`${API_BASE}/moduls/${encodeURIComponent(id)}`, { method: "DELETE" });
            });
        });

        // Evento Editar
        container.querySelectorAll("button[data-upd]").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const id = (btn as HTMLButtonElement).dataset.upd!;
                const current = moduls.find((m) => m.id_modul === id);
                if (!current) return;

                await openEditModulModal(current, async ({ newId, newName, newHores,newColor, newCursId }) => {
                    await api(`${API_BASE}/moduls/${encodeURIComponent(id)}`, {
                        method: "PUT",
                        body: JSON.stringify({
                            id_modul: newId,
                            nom_modul: newName,
                            hores_setmana: newHores,
                            color: newColor,
                            curs_id: newCursId,
                        }),
                    });

                    //Si se ha cambiado el curso, no debería seleccionarse en la vista actual
                    const keep = newCursId === cursId ? newId : undefined;
                    await refresh(keep);
                });
            });
        });
    }

    // Evento Crear
    const modulForm = $("modulForm") as HTMLFormElement;
    modulForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = ($("modulId") as HTMLInputElement).value.trim();
        const nom = ($("modulNom") as HTMLInputElement).value.trim();
        const hores = parseInt(($("modulHores") as HTMLInputElement).value.trim(), 10);
        const color = ($("modulColor") as HTMLInputElement).value.trim();
        
        if (!id || !nom || isNaN(hores)) return alert("Falten dades o les hores no són vàlides");

        await api(`${API_BASE}/moduls`, {
            method: "POST",
            body: JSON.stringify({ id_modul: id, nom_modul: nom, hores_setmana: hores, color, curs_id: cursId }),
        });

        ($("modulId") as HTMLInputElement).value = "";
        ($("modulNom") as HTMLInputElement).value = "";
        ($("modulHores") as HTMLInputElement).value = "";
        ($("modulColor") as HTMLInputElement).value = "#3498db";
        await refresh(id);
    });

    await refresh();
}