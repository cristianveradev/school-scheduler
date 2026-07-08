import { API_BASE, api, $ } from "./config";
import { setOptions } from "./crearJerarquia";

type Cicle = { id_cicle: string; nom_cicle: string; departament_id: string };

export async function loadCicles(sel: HTMLSelectElement, departamentId: string) {
    if (!departamentId) return setOptions(sel, []);
    const cicles = await api<Cicle[]>(`${API_BASE}/cicles/departament/${encodeURIComponent(departamentId)}`);
    setOptions(sel, cicles.map((c) => ({ value: c.id_cicle, label: c.nom_cicle })));
}

function openEditCicleModal(
    current: Cicle,
    onSave: (updated: { newId: string; newName: string; newDepartamentId: string }) => Promise<void>
    ) {
    // si ya existe, bórralo
    document.getElementById("modalOverlay")?.remove();

    const overlay = document.createElement("div");
    overlay.id = "modalOverlay";
    overlay.innerHTML = `
        <div id="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
            <h3>Editar cicle</h3>
            <button type="button" id="modalClose" aria-label="Cerrar">✕</button>
        </div>

        <form id="modalCicleForm" class="modal-body">
            <label style="display:grid;gap:6px">
            <span>ID cicle</span>
            <input id="modalCicleId" value="${current.id_cicle}" />
            </label>

            <label style="display:grid;gap:6px">
            <span>Nom cicle</span>
            <input id="modalCicleNom" value="${current.nom_cicle}" />
            </label>

            <label style="display:grid;gap:6px">
            <span>Departament ID</span>
            <input id="modalCicleDep" value="${current.departament_id}" />
            </label>

            <div class="modal-actions">
            <button type="button" id="modalCancel">Cancelar</button>
            <button type="submit" id="modalSave">Guardar</button>
            </div>
        </form>
        </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
        overlay.remove();
    };

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
    });

    ($("modalClose") as HTMLButtonElement).addEventListener("click", close);
    ($("modalCancel") as HTMLButtonElement).addEventListener("click", close);

    const form = document.getElementById("modalCicleForm") as HTMLFormElement;
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const newId = ($("modalCicleId") as HTMLInputElement).value.trim();
        const newName = ($("modalCicleNom") as HTMLInputElement).value.trim();
        const newDepartamentId = ($("modalCicleDep") as HTMLInputElement).value.trim();

        if (!newId || !newName || !newDepartamentId) return alert("Falten dades");

        await onSave({ newId, newName, newDepartamentId });
        close();
    });

    ($("modalCicleNom") as HTMLInputElement).focus();
}

export async function renderCicles(
    form: HTMLDivElement,
    list: HTMLDivElement,
    select: HTMLSelectElement,
    departamentId: string,
    onAfterChange: (keepSelected?: string) => Promise<void>
    ) {
    form.innerHTML = `
        <h3>Cicles (${departamentId})</h3>
        <form id="cicleForm" style="margin-top:12px;display:grid;gap:10px">
        <input id="cicleId" placeholder="id_cicle (ej: DAW)" />
        <input id="cicleNom" placeholder="nom_cicle" />
        <button type="submit">Crear cicle</button>
        </form>
    `;

    list.innerHTML = `<h3>Listado</h3><div id="cicleList" style="margin-top:12px"></div>`;

    async function refresh(keepSelected?: string) {
        const cicles = await api<Cicle[]>(`${API_BASE}/cicles/departament/${encodeURIComponent(departamentId)}`);
        const container = $("cicleList") as HTMLDivElement;

        container.innerHTML = cicles
        .map(
            (c) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border:1px solid #e0e0e0;border-radius:10px;margin-bottom:8px">
            <div>
                <div style="font-weight:700">${c.nom_cicle}</div>
                <div style="color:#666;font-size:12px">${c.id_cicle} · dep: ${c.departament_id}</div>
            </div>
            <div style="display:flex;gap:8px">
                <button data-upd="${c.id_cicle}">Editar</button>
                <button data-del="${c.id_cicle}">Eliminar</button>
            </div>
            </div>
        `
        )
        .join("");

        setOptions(select, cicles.map((c) => ({ value: c.id_cicle, label: c.nom_cicle })));
        if (keepSelected) select.value = keepSelected;

        await onAfterChange(keepSelected);

        // delete
        container.querySelectorAll("button[data-del]").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const id = (btn as HTMLButtonElement).dataset.del!;
                if (!confirm(`Eliminar cicle "${id}"?`)) return;
                await api(`${API_BASE}/cicles/${encodeURIComponent(id)}`, { method: "DELETE" });
                await refresh(select.value || undefined);
            });
        });

        // edit
        container.querySelectorAll("button[data-upd]").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const id = (btn as HTMLButtonElement).dataset.upd!;
                const current = cicles.find((c) => c.id_cicle === id);
                if (!current) return;

                openEditCicleModal(current, async ({ newId, newName, newDepartamentId }) => {
                    await api(`${API_BASE}/cicles/${encodeURIComponent(id)}`, {
                        method: "PUT",
                        body: JSON.stringify({
                        id_cicle: newId,
                        nom_cicle: newName,
                        departament_id: newDepartamentId,
                        }),
                    });

                    // si lo moviste a otro departament, no se puede mantener seleccionado aquí
                    const keep = newDepartamentId === departamentId ? newId : undefined;
                    await refresh(keep);
                });
            });
        });
    }

  // create
    const cicleForm = $("cicleForm") as HTMLFormElement;
    cicleForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = ($("cicleId") as HTMLInputElement).value.trim();
        const nom = ($("cicleNom") as HTMLInputElement).value.trim();
        if (!id || !nom) return alert("Falten dades");

        await api(`${API_BASE}/cicles`, {
            method: "POST",
            body: JSON.stringify({ id_cicle: id, nom_cicle: nom, departament_id: departamentId }),
        });

        ($("cicleId") as HTMLInputElement).value = "";
        ($("cicleNom") as HTMLInputElement).value = "";
        await refresh(id);
    });

    await refresh();
}
