import { API_BASE, api, $ } from "./config";
import { setOptions } from "./crearJerarquia";

type Grup = { id_grup: string; grup: string; aula: string; torn_horari: string; curs_id: string };

export async function loadGrups(sel: HTMLSelectElement, cursId: string) {
    if (!cursId) return setOptions(sel, []);
    const grups = await api<Grup[]>(`${API_BASE}/grups/curs/${encodeURIComponent(cursId)}`);
    setOptions(sel, grups.map(g => ({ value: g.id_grup, label: `${g.grup} (${g.aula} - ${g.torn_horari})` })));
}

function openEditGrupModal(
    current: Grup,
    onSave: (updated: { newId: string; newGrup: string; newAula: string; newTornHorari: string; newCursId: string }) => Promise<void>
    ) {
    document.getElementById("modalOverlay")?.remove();

    const overlay = document.createElement("div");
    overlay.id = "modalOverlay";
    overlay.innerHTML = `
        <div id="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
            <h3>Editar grup</h3>
            <button type="button" id="modalClose" aria-label="Cerrar">✕</button>
        </div>

        <form id="modalGrupForm" class="modal-body">
            <label style="display:grid;gap:6px">
            <span>ID grup</span>
            <input id="modalGrupId" value="${current.id_grup}" />
            </label>

            <label style="display:grid;gap:6px">
            <span>Grup (A/B/C...)</span>
            <input id="modalGrupNom" value="${current.grup}" />
            </label>

            <label style="display:grid;gap:6px">
            <span>Aula</span>
            <input id="modalGrupAula" value="${current.aula}" />
            </label>

            <label style="display:grid;gap:6px">
            <span>Curs ID</span>
            <input id="modalGrupCurs" value="${current.curs_id}" />
            </label>

            <select id="grupTorn" selected="${current.torn_horari}">
                <option value="mati">Mati</option>
                <option value="tarda">Tarda</option>
            </select>

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

    const form = document.getElementById("modalGrupForm") as HTMLFormElement;
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const newId = ($("modalGrupId") as HTMLInputElement).value.trim();
        const newGrup = ($("modalGrupNom") as HTMLInputElement).value.trim();
        const newAula = ($("modalGrupAula") as HTMLInputElement).value.trim();
        const newTornHorari = ($("grupTorn") as HTMLSelectElement).value;
        const newCursId = ($("modalGrupCurs") as HTMLInputElement).value.trim();

        if (!newId || !newGrup || !newAula || !newTornHorari || !newCursId) return alert("Falten dades");

        await onSave({ newId, newGrup, newAula, newTornHorari, newCursId });
        close();
    });

    ($("modalGrupNom") as HTMLInputElement).focus();
}

export async function renderGrups(
    form: HTMLDivElement,
    list: HTMLDivElement,
    select: HTMLSelectElement,
    cursId: string,
    onAfterChange: (keepSelected?: string) => Promise<void>
    ) {
    form.innerHTML = `
        <h3>Grups (${cursId})</h3>
        <form id="grupForm" style="margin-top:12px;display:grid;gap:10px">
        <input id="grupId" placeholder="id_grup (ej: DAW1B)" />
        <input id="grupNom" placeholder="grup (A/B/C)" />
        <input id="grupAula" placeholder="aula (ej: 256)" />
        <select id="grupTorn">
            <option value="mati">Mati</option>
            <option value="tarda">Tarda</option>
        </select>
        <button type="submit">Crear grup</button>
        </form>
    `;

    list.innerHTML = `<h3>Listado</h3><div id="grupList" style="margin-top:12px"></div>`;

    async function refresh(keepSelected?: string) {
        const grups = await api<Grup[]>(`${API_BASE}/grups/curs/${encodeURIComponent(cursId)}`);
        const container = $("grupList") as HTMLDivElement;

        container.innerHTML = grups
        .map(
            (g) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border:1px solid #e0e0e0;border-radius:10px;margin-bottom:8px">
            <div>
                <div style="font-weight:700">Grup ${g.grup}</div>
                <div style="color:#666;font-size:12px">${g.id_grup} · aula: ${g.aula}  · torn: ${g.torn_horari} · curs: ${g.curs_id}</div>
            </div>
            <div style="display:flex;gap:8px">
                <button data-upd="${g.id_grup}">Editar</button>
                <button data-del="${g.id_grup}">Eliminar</button>
            </div>
            </div>
        `
        )
        .join("");

        setOptions(select, grups.map((g) => ({ value: g.id_grup, label: `${g.grup} (${g.aula} - ${g.torn_horari})` })));
        if (keepSelected) select.value = keepSelected;

        await onAfterChange(keepSelected);

        // delete
        container.querySelectorAll("button[data-del]").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const id = (btn as HTMLButtonElement).dataset.del!;
                if (!confirm(`Eliminar grup "${id}"?`)) return;
                await api(`${API_BASE}/grups/${encodeURIComponent(id)}`, { method: "DELETE" });
                await refresh(select.value || undefined);
            });
        });

        // edit
        container.querySelectorAll("button[data-upd]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const id = (btn as HTMLButtonElement).dataset.upd!;
            const current = grups.find((g) => g.id_grup === id);
            if (!current) return;

            openEditGrupModal(current, async ({ newId, newGrup, newAula, newTornHorari, newCursId }) => {
            await api(`${API_BASE}/grups/${encodeURIComponent(id)}`, {
                method: "PUT",
                body: JSON.stringify({
                    id_grup: newId,
                    grup: newGrup,
                    aula: newAula,
                    torn_horari: newTornHorari,
                    curs_id: newCursId,
                }),
            });

            const keep = newCursId === cursId ? newId : undefined;
            await refresh(keep);
            });
        });
        });
    }

    // create
    const grupForm = $("grupForm") as HTMLFormElement;
    grupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = ($("grupId") as HTMLInputElement).value.trim();
        const grup = ($("grupNom") as HTMLInputElement).value.trim();
        const aula = ($("grupAula") as HTMLInputElement).value.trim();
        const tornHorari = ($("grupTorn") as HTMLSelectElement).value;
        if (!id || !grup || !aula || !tornHorari) return alert("Falten dades");

        await api(`${API_BASE}/grups`, {
        method: "POST",
        body: JSON.stringify({ id_grup: id, grup, aula, torn_horari: tornHorari, curs_id: cursId }),
        });

        ($("grupId") as HTMLInputElement).value = "";
        ($("grupNom") as HTMLInputElement).value = "";
        ($("grupAula") as HTMLInputElement).value = "";
        ($("grupTorn") as HTMLSelectElement).value = "mati";
        await refresh(id);
    });

    await refresh();
}
