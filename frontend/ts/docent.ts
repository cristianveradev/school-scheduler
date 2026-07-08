import { API_BASE, api, $ } from "./config";

export type DocentType = { id_docent: number; nom_sense: string; avatar?: string | null };

export async function renderDocents(container: HTMLDivElement) {
    container.innerHTML = `
        <div style="display:flex;gap:20px;align-items:flex-start;">
            <div style="flex:1;padding:20px;background-color:white;border-radius:10px">
                <h3>Crear Docent</h3>
                <form id="docentForm" style="display:grid;gap:10px;margin-top:10px">
                    <input id="docentNom" placeholder="Nom de docent" required />
                    <input id="docentAvatar" type="file" accept="image/*" />
                    <button type="submit">Crear Docent</button>
                </form>
            </div>

            <div style="flex:1;padding:20px;background-color:white;border-radius:10px";>
                <h3>Llistat de docents</h3>
                <div id="docentList" style="display:flex;flex-direction:column;gap:10px"></div>
            </div>
        </div>
    `;

    const formEl = $("docentForm") as HTMLFormElement;
    const listDiv = $("docentList") as HTMLDivElement;

    function getInitials(name: string) {
        return name
            .split(" ")
            .map(p => p[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    }

    async function refresh() {
        try {
            //Llamada al endpoint que retorna tots els docents
            const docents = await api<DocentType[]>(`${API_BASE}/docents`);

            listDiv.innerHTML = docents.map(d => {
                const avatarUrl = d.avatar
                    ? `${API_BASE.replace("/api", "")}/uploads/uploadsDocents/${d.avatar}`
                    : null;

                return `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border:1px solid #ddd;">
                        <div style="display:flex;align-items:center;gap:10px">
                            
                            ${
                                avatarUrl
                                ? `<img src="${avatarUrl}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" />`
                                : `<div style="
                                    width: 40px;
                                    height: 40px;
                                    border-radius: 50%;
                                    background: #6A0001;
                                    color: white;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-weight: bold;
                                ">
                                    ${getInitials(d.nom_sense)}
                                </div>`
                            }

                            <div>
                                <div style="font-weight:600">${d.nom_sense}</div>
                                <div style="font-size:12px;color:#666">ID: ${d.id_docent}</div>
                            </div>
                        </div>

                        <div style="display:flex;gap:5px">
                            <button data-upd="${d.id_docent}">Editar</button>
                            <button data-del="${d.id_docent}">Eliminar</button>
                        </div>
                    </div>
                `;
            }).join("");

            //Esborrar
            listDiv.querySelectorAll("button[data-del]").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const id = (btn as HTMLButtonElement).dataset.del!;
                    if(!confirm(`Eliminar docent "${id}"?`)) return;
                    try {
                        const token = localStorage.getItem("token");
                        await fetch(`${API_BASE}/docents/${id}`, {
                            method: "DELETE",
                            headers: {
                                Authorization: `Bearer ${token || ""}`
                            }
                        });
                        await refresh();
                    } catch(err) {
                        alert("No s'ha pogut eliminar el docent");
                        console.error(err);
                    }
                });
            });

            //Editar
            listDiv.querySelectorAll("button[data-upd]").forEach(btn => {
                btn.addEventListener("click", () => {
                    const id = (btn as HTMLButtonElement).dataset.upd!;
                    const docent = docents.find(d => d.id_docent.toString() === id);
                    if(!docent) return;
                    openEditDocent(docent, refresh);
                });
            });
        } catch(err) {
            console.error("Error carregant docents:", err);
            listDiv.innerHTML = `<div style="color:red">No s'han pogut carregar els docents</div>`;
        }
    }

    formEl.addEventListener("submit", async e => {
        e.preventDefault();

        const nom = ($("docentNom") as HTMLInputElement).value.trim();

        if(!nom) return alert("Falten dades");

        const formData = new FormData();
        formData.append("nom_sense", nom);

        const fileInput = $("docentAvatar") as HTMLInputElement;

        if(fileInput.files?.[0]) {
            formData.append("avatar", fileInput.files[0]);
        }

        const token = localStorage.getItem("token");

        await fetch(`${API_BASE}/docents`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token || ""}`
                //NO content-type
            },
            body: formData
        });

        ($("docentNom") as HTMLInputElement).value = "";
        ($("docentAvatar") as HTMLInputElement).value = "";
        await refresh();
    });

    await refresh();
}

//Funció inline per editar
function openEditDocent(docent: DocentType, refresh: () => Promise<void>) {
    const container = $("docentList") as HTMLDivElement;
    const div = container.querySelector(`button[data-upd="${docent.id_docent}"]`)?.parentElement?.parentElement;
    if(!div) return;

    div.innerHTML = `
        <div style="display:flex;gap:5px;align-items:center">
            <input type="text" id="editDocentNom" value="${docent.nom_sense}" />
            <input type="file" id="editDocentAvatar" />
            <button id="saveDocentBtn">Guardar</button>
            <button id="cancelDocentBtn">Cancelar</button>
        </div>
    `;

    ($("saveDocentBtn") as HTMLButtonElement).addEventListener("click", async () => {
        const newNom = ($("editDocentNom") as HTMLInputElement).value.trim();
        const fileInput = $("editDocentAvatar") as HTMLInputElement;

        if(!newNom) return alert("Falten dades");

        const formData = new FormData();
        formData.append("nom_sense", newNom);

        if(fileInput.files?.[0]) {
            formData.append("avatar", fileInput.files[0]);
        }

        const token = localStorage.getItem("token");

        await fetch(`${API_BASE}/docents/${docent.id_docent}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token || ""}`
            },
            body: formData
        });

        await renderDocents(container);
    });

    ($("cancelDocentBtn") as HTMLButtonElement).addEventListener("click", async () => {
        await refresh(); //Recarrega llista
    });
}