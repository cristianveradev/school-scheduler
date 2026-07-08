import { API_BASE, api, $ } from "./config";
import { setOptions } from "./crearJerarquia";

type Curs = { id_curs: string; nivell: number; cicle_id: string };

export async function loadCursos(sel: HTMLSelectElement, cicleId: string) {
    if (!cicleId) return setOptions(sel, []);
    const cursos = await api<Curs[]>(`${API_BASE}/cursos/cicle/${encodeURIComponent(cicleId)}`);
    setOptions(sel, cursos.map(c => ({ value: c.id_curs, label: `${c.nivell}º (${c.id_curs})` })));
}

function openEditCursModal(
    current: Curs,
    onSave: (updated: { newId: string; newNivell: number; newCicleId: string }) => Promise<void>
    ) {
    document.getElementById("modalOverlay")?.remove();

    const overlay = document.createElement("div");
    overlay.id = "modalOverlay";
    overlay.innerHTML = `
        <div id="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
            <h3>Editar curs</h3>
            <button type="button" id="modalClose" aria-label="Cerrar">✕</button>
        </div>

        <form id="modalCursForm" class="modal-body">
            <label style="display:grid;gap:6px">
            <span>ID curs</span>
            <input id="modalCursId" value="${current.id_curs}" />
            </label>

            <label style="display:grid;gap:6px">
            <span>Nivell</span>
            <input id="modalCursNivell" type="number" min="0" value="${current.nivell}" />
            </label>

            <label style="display:grid;gap:6px">
            <span>Cicle ID</span>
            <input id="modalCursCicle" value="${current.cicle_id}" />
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

    const form = $("modalCursForm") as HTMLFormElement;
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const newId = ($("modalCursId") as HTMLInputElement).value.trim();
        const newNivell = Number(($("modalCursNivell") as HTMLInputElement).value);
        const newCicleId = ($("modalCursCicle") as HTMLInputElement).value.trim();

        if (!newId || !Number.isFinite(newNivell) || !newCicleId) return alert("Falten dades");

        await onSave({ newId, newNivell, newCicleId });
        close();
    });

    ($("modalCursNivell") as HTMLInputElement).focus();
}

export async function renderCursos(
    form: HTMLDivElement,
    list: HTMLDivElement,
    select: HTMLSelectElement,
    cicleId: string,
    onAfterChange: (keepSelected?: string) => Promise<void>
    ) {
    form.innerHTML = `
        <h3>Cursos (${cicleId})</h3>
        <form id="cursForm" style="margin-top:12px;display:grid;gap:10px">
        <input id="cursId" placeholder="id_curs (ej: DAW1)" />
        <input id="cursNivell" type="number" min="0" placeholder="nivell" />
        <button type="submit">Crear curs</button>
        </form>
    `;

    list.innerHTML = `<h3>Listado</h3><div id="cursList" style="margin-top:12px"></div>`;

    async function refresh(keepSelected?: string) {
        const cursos = await api<Curs[]>(`${API_BASE}/cursos/cicle/${encodeURIComponent(cicleId)}`);
        const container = $("cursList") as HTMLDivElement;

        container.innerHTML = cursos
        .map(
            (c) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border:1px solid #e0e0e0;border-radius:10px;margin-bottom:8px">
            <div>
                <div style="font-weight:700">Nivell ${c.nivell}</div>
                <div style="color:#666;font-size:12px">${c.id_curs} · cicle: ${c.cicle_id}</div>
            </div>
            <div style="display:flex;gap:8px">
                <button data-upd="${c.id_curs}">Editar</button>
                <button data-del="${c.id_curs}">Eliminar</button>
            </div>
            </div>
        `
        )
        .join("");

        setOptions(select, cursos.map((c) => ({ value: c.id_curs, label: `${c.nivell}º (${c.id_curs})` })));
        if (keepSelected) select.value = keepSelected;

        await onAfterChange(keepSelected);

        // delete
        container.querySelectorAll("button[data-del]").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const id = (btn as HTMLButtonElement).dataset.del!;
                if (!confirm(`Eliminar curs "${id}"?`)) return;
                await api(`${API_BASE}/cursos/${encodeURIComponent(id)}`, { method: "DELETE" });
                await refresh(select.value || undefined);
            });
        });

        // edit
        container.querySelectorAll("button[data-upd]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const id = (btn as HTMLButtonElement).dataset.upd!;
            const current = cursos.find((c) => c.id_curs === id);
            if (!current) return;

            openEditCursModal(current, async ({ newId, newNivell, newCicleId }) => {
            await api(`${API_BASE}/cursos/${encodeURIComponent(id)}`, {
                method: "PUT",
                    body: JSON.stringify({
                    id_curs: newId,
                    nivell: newNivell,
                    cicle_id: newCicleId,
                }),
            });

            const keep = newCicleId === cicleId ? newId : undefined;
            await refresh(keep);
            });
        });
        });
    }

    // create
    const cursForm = $("cursForm") as HTMLFormElement;
    cursForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = ($("cursId") as HTMLInputElement).value.trim();
        const nivell = Number(($("cursNivell") as HTMLInputElement).value);
        if (!id || !Number.isFinite(nivell)) return alert("Falten dades");

        await api(`${API_BASE}/cursos`, {
            method: "POST",
            body: JSON.stringify({ id_curs: id, nivell, cicle_id: cicleId }),
        });

        ($("cursId") as HTMLInputElement).value = "";
        ($("cursNivell") as HTMLInputElement).value = "";
        await refresh(id);
    });

    await refresh();
}