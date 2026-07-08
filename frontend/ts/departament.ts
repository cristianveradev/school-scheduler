import { API_BASE, api, $ } from "./config";
import { setOptions } from "./crearJerarquia";

type Departament = { id_departament: string; nom_departament: string };

export async function loadDepartaments(sel: HTMLSelectElement) {
    const deps = await api<Departament[]>(`${API_BASE}/departaments`);
    setOptions(sel, deps.map(d => ({ value: d.id_departament, label: d.nom_departament })));
}

function openEditDepartamentModal(
    current: Departament,
    onSave: (updated: { newId: string; newName: string }) => Promise<void>
    ) {
    // si ya existe, bórralo
    document.getElementById("modalOverlay")?.remove();

    const overlay = document.createElement("div");
    overlay.id = "modalOverlay";
    overlay.innerHTML = `
        <div id="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
            <h3>Editar departamento</h3>
            <button type="button" id="modalClose" aria-label="Cerrar">✕</button>
        </div>

        <form id="modalDepForm" class="modal-body">
            <label style="display:grid;gap:6px">
            <span>ID</span>
            <input id="modalDepId" value="${current.id_departament}" />
            </label>

            <label style="display:grid;gap:6px">
            <span>Nombre</span>
            <input id="modalDepNom" value="${current.nom_departament}" />
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

    // cerrar al click fuera
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
    });

    // botones
    ($("modalClose") as HTMLButtonElement).addEventListener("click", close);
    ($("modalCancel") as HTMLButtonElement).addEventListener("click", close);

    // submit
    const form = $("modalDepForm") as HTMLFormElement;
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const newId = ($("modalDepId") as HTMLInputElement).value.trim();
        const newName = ($("modalDepNom") as HTMLInputElement).value.trim();

        if (!newId || !newName) return alert("Falten dades");

        await onSave({ newId, newName });
        close();
    });

    // focus
    ($("modalDepNom") as HTMLInputElement).focus();
}

export async function renderDepartaments( form: HTMLDivElement, list: HTMLDivElement, select: HTMLSelectElement, onAfterChange: (keepSelected?: string) => Promise<void> ) {
    form.innerHTML = `
        <h3>Departamentos</h3>
        <form id="depForm" style="margin-top:12px;display:grid;gap:10px">
        <input id="depId" placeholder="id_departament (ej: info)" />
        <input id="depNom" placeholder="nom_departament" />
        <button type="submit">Crear departamento</button>
        </form>
    `;

    list.innerHTML = `<h3>Listado</h3><div id="depList" style="margin-top:12px"></div>`;

    async function refresh(keepSelected?: string) {
        const deps = await api<Departament[]>(`${API_BASE}/departaments`);
        const container = $("depList") as HTMLDivElement;

        container.innerHTML = deps
        .map(
            (d) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border:1px solid #e0e0e0;border-radius:10px;margin-bottom:8px">
            <div>
                <div style="font-weight:700">${d.nom_departament}</div>
                <div style="color:#666;font-size:12px">${d.id_departament}</div>
            </div>
            <div style="display:flex;gap:8px">
                <button data-upd="${d.id_departament}">Editar</button>
                <button data-del="${d.id_departament}">Eliminar</button>
            </div>
            </div>
        `
        )
        .join("");

        // recargar select
        setOptions(select, deps.map((d) => ({ value: d.id_departament, label: d.nom_departament })));
        if (keepSelected) select.value = keepSelected;

        // 🔥 avisa a crearJerarquia.ts para que limpie selects dependientes
        await onAfterChange(keepSelected);

        // DELETE
        container.querySelectorAll("button[data-del]").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const id = (btn as HTMLButtonElement).dataset.del!;
                if (!confirm(`Eliminar departamento "${id}"?`)) return;
                await api(`${API_BASE}/departaments/${encodeURIComponent(id)}`, { method: "DELETE" });
                await refresh(select.value || undefined);
            });
        });
        // edit (modal)
        container.querySelectorAll("button[data-upd]").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const id = (btn as HTMLButtonElement).dataset.upd!;
                const current = deps.find((d) => d.id_departament === id);
                if (!current) return;

                openEditDepartamentModal(current, async ({ newId, newName }) => {
                await api(`${API_BASE}/departaments/${encodeURIComponent(id)}`, {
                    method: "PUT",
                    body: JSON.stringify({ id_departament: newId, nom_departament: newName }),
                });

                await refresh(newId);
                });
            });
        });
    }

    // submit create
    const depForm = $("depForm") as HTMLFormElement;
    depForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = ($("depId") as HTMLInputElement).value.trim();
        const nom = ($("depNom") as HTMLInputElement).value.trim();
        if (!id || !nom) return alert("Falten dades");

        await api(`${API_BASE}/departaments`, {
        method: "POST",
        body: JSON.stringify({ id_departament: id, nom_departament: nom }),
        });

        ($("depId") as HTMLInputElement).value = "";
        ($("depNom") as HTMLInputElement).value = "";
        await refresh(id);
    });

    await refresh();
}
