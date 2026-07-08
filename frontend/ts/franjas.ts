// frontend/ts/franjas.ts
import { API_BASE, api } from "./config";

interface Franja {
    id_franja: number;
    hora_inici: string;
    hora_fi: string;
    torn_franja: "mati" | "tarda";
}

// Función auxiliar para pasar de "HH:MM" a minutos (ej: "08:00" -> 480)
function timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours * 60) + minutes;
}

export async function inicioFranjas() {
    const pizarra = document.getElementById("pizarra") as HTMLDivElement;

    // 1. Pintamos la estructura de la pantalla
    pizarra.innerHTML = `
        <div class="franjas-container">
            <h2 class="franjas-title">Configuració de Franges Horàries</h2>
            
            <div class="franjas-grid">
                <div class="franjas-form-card">
                    <h3>Nova Franja</h3>
                    <form id="formFranja" class="franjas-form">
                        
                        <label>
                            <span>ID Franja (Número)</span>
                            <input type="number" id="f_id" required min="1" placeholder="Ej: 1">
                        </label>

                        <label>
                            <span>Hora Inici</span>
                            <input type="time" id="f_inici" required>
                        </label>

                        <label>
                            <span>Hora Fi</span>
                            <input type="time" id="f_fi" required>
                        </label>

                        <label>
                            <span>Torn</span>
                            <select id="f_torn" required>
                                <option value="mati">Matí</option>
                                <option value="tarda">Tarda</option>
                            </select>
                        </label>

                        <button type="submit" class="btn-submit">
                            <i class="fas fa-plus"></i> Crear Franja
                        </button>
                    </form>
                </div>

                <div class="franjas-list-section">
                    <h3>Franges Existents</h3>
                    <div class="franjas-list-grid">
                        <div>
                            <h4 class="title-mati"> Matí</h4>
                            <ul id="llistaMati" class="franjas-list"></ul>
                        </div>
                        <div>
                            <h4 class="title-tarda"> Tarda</h4>
                            <ul id="llistaTarda" class="franjas-list"></ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 2. Cargamos los datos iniciales
    await refrescarListas();

    // 3. Lógica del formulario
    const form = document.getElementById("formFranja") as HTMLFormElement;
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const id_franja = parseInt((document.getElementById("f_id") as HTMLInputElement).value, 10);
        const hora_inici = (document.getElementById("f_inici") as HTMLInputElement).value;
        const hora_fi = (document.getElementById("f_fi") as HTMLInputElement).value;
        const torn_franja = (document.getElementById("f_torn") as HTMLSelectElement).value;

        const hora_inici_min = timeToMinutes(hora_inici);
        const hora_fi_min = timeToMinutes(hora_fi);

        if (hora_inici_min >= hora_fi_min) {
            alert("L'hora d'inici no pot ser igual o superior a l'hora de fi.");
            return;
        }

        try {
            await api(`${API_BASE}/franges/new`, {
                method: "POST",
                body: JSON.stringify({
                    id_franja,
                    hora_inici,
                    hora_fi,
                    hora_inici_min,
                    hora_fi_min,
                    torn_franja
                })
            });

            form.reset();
            await refrescarListas();
        } catch (error: any) {
            // Aquí capturamos tu mensaje de "solapamiento" o "id duplicado"
            alert(error.message || "Error al crear la franja.");
        }
    });
}

// Función para pedir al backend las franjas y pintarlas
async function refrescarListas() {
    try {
        const franjas: Franja[] = await api(`${API_BASE}/franges/creadas`);
        
        const llistaMati = document.getElementById("llistaMati") as HTMLUListElement;
        const llistaTarda = document.getElementById("llistaTarda") as HTMLUListElement;

        llistaMati.innerHTML = "";
        llistaTarda.innerHTML = "";

        franjas.forEach(f => {
            const li = document.createElement("li");
            li.className = "franja-item";
            // Añadimos la sección de los botones
            li.innerHTML = `
                <span><b>${f.hora_inici} - ${f.hora_fi}</b> <small style="color:#666;">(ID: ${f.id_franja})</small></span>
                <div class="franja-actions">
                    <button class="btn-icon btn-edit" title="Editar" data-id="${f.id_franja}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" title="Eliminar" data-id="${f.id_franja}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;

            if (f.torn_franja === "mati") {
                llistaMati.appendChild(li);
            } else {
                llistaTarda.appendChild(li);
            }

            // --- Lógica del botón Eliminar ---
            const btnDelete = li.querySelector(".btn-delete") as HTMLButtonElement;
            btnDelete.addEventListener("click", async () => {
                if (confirm(`Estàs segur d'eliminar la franja ${f.id_franja}?`)) {
                    try {
                        await api(`${API_BASE}/franges/${f.id_franja}`, { method: "DELETE" });
                        await refrescarListas();
                    } catch (error) {
                        alert("Error a l'eliminar la franja.");
                    }
                }
            });

            // --- Lógica del botón Editar ---
            const btnEdit = li.querySelector(".btn-edit") as HTMLButtonElement;
            btnEdit.addEventListener("click", () => {
                openEditFranjaModal(f, async ({ hora_inici, hora_fi, torn_franja }) => {
                    const hora_inici_min = timeToMinutes(hora_inici);
                    const hora_fi_min = timeToMinutes(hora_fi);

                    if (hora_inici_min >= hora_fi_min) {
                        alert("L'hora d'inici no pot ser igual o superior a l'hora de fi.");
                        return;
                    }

                    try {
                        await api(`${API_BASE}/franges/${f.id_franja}`, {
                            method: "PUT",
                            body: JSON.stringify({
                                hora_inici,
                                hora_fi,
                                hora_inici_min,
                                hora_fi_min,
                                torn_franja
                            })
                        });
                        await refrescarListas();
                    } catch (error: any) {
                        alert(error.message || "Error al actualitzar la franja. Potser es solapa?");
                    }
                });
            });
        });

    } catch (error) {
        console.error("Error carregant franges:", error);
    }
}

// Función para abrir el Modal de Edición de Franjas
function openEditFranjaModal(
    current: Franja,
    onSave: (updated: { hora_inici: string; hora_fi: string; torn_franja: string }) => Promise<void>
) {
    document.getElementById("modalOverlay")?.remove();

    const overlay = document.createElement("div");
    overlay.id = "modalOverlay";
    overlay.className = "modal-overlay";

    overlay.innerHTML = `
        <div id="modal" class="modal-content" role="dialog" aria-modal="true">
            <div class="modal-header">
                <h3>Editar Franja ${current.id_franja}</h3>
                <button type="button" id="modalClose" class="btn-close-modal" aria-label="Cerrar">✕</button>
            </div>

            <form id="modalFranjaForm" class="modal-body">
                <label>
                    <span>Hora Inici</span>
                    <input type="time" id="modalFInici" value="${current.hora_inici}" required />
                </label>

                <label>
                    <span>Hora Fi</span>
                    <input type="time" id="modalFFi" value="${current.hora_fi}" required />
                </label>

                <label>
                    <span>Torn</span>
                    <select id="modalFTorn" required>
                        <option value="mati" ${current.torn_franja === 'mati' ? 'selected' : ''}>Matí</option>
                        <option value="tarda" ${current.torn_franja === 'tarda' ? 'selected' : ''}>Tarda</option>
                    </select>
                </label>

                <div class="modal-actions">
                    <button type="button" id="modalCancel" class="btn-cancel">Cancel·lar</button>
                    <button type="submit" id="modalSave" class="btn-save">Guardar</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    (document.getElementById("modalClose") as HTMLButtonElement).addEventListener("click", close);
    (document.getElementById("modalCancel") as HTMLButtonElement).addEventListener("click", close);

    const form = document.getElementById("modalFranjaForm") as HTMLFormElement;
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const hora_inici = (document.getElementById("modalFInici") as HTMLInputElement).value;
        const hora_fi = (document.getElementById("modalFFi") as HTMLInputElement).value;
        const torn_franja = (document.getElementById("modalFTorn") as HTMLSelectElement).value;

        await onSave({ hora_inici, hora_fi, torn_franja });
        close();
    });
}