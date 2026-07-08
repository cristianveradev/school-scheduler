import { API_BASE, api, $, getPermis, showMessage } from "./config";


export type UsuariType = {
    id_usuari: number;
    usuari: string;
    permisos: string;
    avatar?: string | null;
    message?: string;
};

export function initUsuaris() {
    const btnCrearUsuari = $("btnCrearUsuari");
    btnCrearUsuari?.addEventListener("click", (e) => {
        e.preventDefault();
        openUsuariPopup();
    });
}

async function openUsuariPopup() {
    
    const pizarra = $("pizarra") as HTMLDivElement;
    pizarra.innerHTML = "";
    pizarra.innerHTML = `
        <div id="insertarJerarquias" class="jerarquia-grid">
            <div id="jerarquiaForm" class="jerarquia-col"></div>
            <div id="jerarquiaList" class="jerarquia-col"></div>
        </div>
    `;

    const usuariForm= $("jerarquiaForm") as HTMLDivElement;
    const usuariList= $("jerarquiaList") as HTMLDivElement;
    await renderCrearUsuari(usuariForm);
    await renderEditarUsuaris(usuariList);
    
}

//Crear usuari
function renderCrearUsuari(container: HTMLDivElement) {
    container.innerHTML = `
        <div style="flex:1;padding:20px;background-color:white;border-radius:10px;">
            <h3>Crear usuari</h3>
            <form id="crearUsuariForm" style="display:grid;gap:10px;">
                <input id="usuariNom" placeholder="Usuari" required />
                <input id="usuariPass" type="password" placeholder="Password" required />

                <select id="usuariPermisos">
                    <option value="admin">admin</option>
                    <option value="ver">solo ver</option>
                </select>

                <input type="file" id="usuariAvatar" accept="image/*" />

                <button type="submit">Crear</button>
            </form>
        </div>
    `;

    const form = $("crearUsuariForm") as HTMLFormElement;

    form.addEventListener("submit", async e => {
        e.preventDefault();

        const usuari = ($("usuariNom") as HTMLInputElement).value.trim();
        const password = ($("usuariPass") as HTMLInputElement).value.trim();
        const permisos = ($("usuariPermisos") as HTMLSelectElement).value;
        const avatar = ($("usuariAvatar") as HTMLInputElement).files?.[0];

        if(!usuari || !password) return alert("Falten dades");

        const formData = new FormData();
        formData.append("usuari", usuari);
        formData.append("password", password);
        formData.append("permisos", permisos);

        if (avatar) {
            formData.append("avatar", avatar);
        }

        try {
            await api(`${API_BASE}/registre`, {
                method: "POST",
                body: formData
            });

            showMessage("Usuari creat", "success");
            await openUsuariPopup();
        } catch (err: unknown) {
                console.error(err);
                if (err instanceof Error) {
                    showMessage(err.message, "error");
                } else {
                    showMessage("Error inesperat", "error");
                }
            }
    });
}

//Editar usuari
async function renderEditarUsuaris(container: HTMLDivElement) {
    container.innerHTML = `
        <div style="flex:1;padding:20px;background-color:white;border-radius:10px;">
            <h3>Llistat usuaris</h3>
            <div id="usuariList" style="display:flex;flex-direction:column;gap:10px;"></div>
        </div>
    `;

    const list = $("usuariList") as HTMLDivElement;

    async function refresh() {
        const rol = getPermis();
        console.log("ROL ACTUAL:", rol);
        const usuaris = await api<UsuariType[]>(`${API_BASE}/usuari/all`);

        list.innerHTML = usuaris.map(u => {
            const avatar = u.avatar
                ? `<img 
                    src="http://localhost:3100/uploads/uploadsUsuaris/${u.avatar}"
                    style="width:40px;height:40px;border-radius:50%;object-fit:cover"
                />`
                : `<div style="
                    width:40px;
                    height:40px;
                    border-radius:50%;
                    background:#6A0001;
                    color:white;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-weight:bold;
                ">
                    ${u.usuari.substring(0,2).toUpperCase()}
                </div>`;

            const canEdit =
                (rol === "superadmin" && u.permisos !=="superadmin") ||
                (rol === "admin" && u.permisos === "ver");

            return `
                <div style="display:flex;justify-content:space-between;align-items:center;border:1px solid #ddd;padding:10px">
                    
                    <div style="display:flex;gap:10px;align-items:center">
                        ${avatar}
                        <div>
                            <div style="font-weight:600">${u.usuari}</div>
                            <div style="font-size:12px;color:#666">
                                ${u.id_usuari} - ${u.permisos}
                            </div>
                        </div>
                    </div>

                    <div style="display:flex;gap:5px">
                        ${canEdit ? `<button data-edit="${u.id_usuari}">Editar</button>` : ""}
                        ${canEdit ? `<button data-del="${u.id_usuari}">Eliminar</button>` : ""}
                    </div>

                </div>
            `;
        }).join("");

        //Eliminar
        list.querySelectorAll("button[data-del]").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = (btn as HTMLButtonElement).dataset.del!;
                if(!confirm("Eliminar usuari?")) return;

                try{
                    const data = await api<UsuariType>(`${API_BASE}/registre/${id}`, {
                        method: "DELETE"
                    });

                    if(data.message && data.message !== "Usuari eliminat"){
                        showMessage(data.message, "error");
                    }else{
                        showMessage("Usuari eliminat correctament!", "success");
                        await refresh();
                    }
                } catch (err: unknown) {
                    console.error(err);
                    if (err instanceof Error) {
                        showMessage(err.message, "error");
                    } else {
                        showMessage("Error inesperat", "error");
                    }
                }
            });
        });

        //Editar
        list.querySelectorAll("button[data-edit]").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = (btn as HTMLButtonElement).dataset.edit!;
                const usuari = usuaris.find(u => u.id_usuari.toString() === id);
                if(!usuari) return;

                openEditUsuari(usuari, refresh);
            });
        });
    }

    await refresh();
}

//Editar popup
function openEditUsuari(usuari: UsuariType, refresh: () => Promise<void>) {
    const currentRole = getPermis(); //Rol del usuari logueat
    if(!currentRole || currentRole === "ver") {
        return alert("No tens permisos per editar aquest usuari");
    }

    //Validar permisos segons el rol del usuari logueat
    if(currentRole === "admin" && usuari.permisos !== "ver") {
        return alert("No tens permisos per editar aquest usuari");
    }

    //Eliminar overlay anterior si existix
    document.getElementById("usuariEditOverlay")?.remove();

    const overlay = document.createElement("div");
    overlay.id = "usuariEditOverlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0,0,0,0.5)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "9999";

    const popup = document.createElement("div");
    popup.style.backgroundColor = "#fff";
    popup.style.padding = "20px";
    popup.style.borderRadius = "10px";
    popup.style.minWidth = "250px";
    popup.style.display = "flex";
    popup.style.flexDirection = "column";
    popup.style.gap = "12px";

    //Selecció de permisos nomes per superadmin
    const permisosSelectHTML = currentRole === "superadmin" ? `
        <select id="editUsuariPermisos">
            <option value="admin" ${usuari.permisos === "admin" ? "selected" : ""}>admin</option>
            <option value="ver" ${usuari.permisos === "ver" ? "selected" : ""}>ver</option>
        </select>
    ` : `<input type="text" disabled value="${usuari.permisos}" />`;

    popup.innerHTML = `
        <h3>Editar usuari</h3>

        <input id="editUsuariNom" value="${usuari.usuari}" />

        <input type="file" id="editUsuariAvatar" accept="image/*" />

        ${permisosSelectHTML}

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px">
            <button id="saveUsuariBtn">Guardar</button>
            <button id="cancelUsuariBtn">Cancelar</button>
        </div>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.addEventListener("click", (e) => { if(e.target === overlay) close(); });
    ($("cancelUsuariBtn") as HTMLButtonElement).addEventListener("click", close);

    ($("saveUsuariBtn") as HTMLButtonElement).addEventListener("click", async() => {
        const nom = ($("editUsuariNom") as HTMLInputElement).value.trim();
        const avatar = ($("editUsuariAvatar") as HTMLInputElement).files?.[0];

        let permisos = usuari.permisos;

        if(currentRole === "superadmin") {
            permisos = ($("editUsuariPermisos") as HTMLSelectElement).value;
        }

        if(!nom) return alert("Falten dades");

        const formData = new FormData();
        formData.append("usuari", nom);
        formData.append("permisos", permisos);

        if(avatar) {
            formData.append("avatar", avatar);
        }

        try {
            const resposta = await fetch(`${API_BASE}/registre/${usuari.id_usuari}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: formData
            });

            const data = await resposta.json();
            close();
            if(data.message){
                showMessage(data.message, "error");
            }else{
                showMessage("Usuari editat correctament!", "success");
                await refresh();
            }
        } catch (err: unknown) {
                console.error(err);
                if (err instanceof Error) {
                    showMessage(err.message, "error");
                } else {
                    showMessage("Error inesperat", "error");
                }
            }
    });
}

export async function initPermisUsuaris() {
    try{
        const usuari = await api<UsuariType>(`${API_BASE}/usuari`);

        const userArea = $("userArea") as HTMLDivElement;
        const userName = userArea.querySelector(".user-name") as HTMLSpanElement;
        const icon = userArea.querySelector(".user-icon");

        const newUsuari = `
            <div>
                <div style="font-weight:600">${usuari.usuari}</div>
                <div style="font-size:12px;color:#666">
                    ${usuari.permisos}
                </div>
            </div>`
        // crear avatar HTML
        const avatar = usuari.avatar
            ? `<img 
                src="http://localhost:3100/uploads/uploadsUsuaris/${usuari.avatar}"
                style="width:40px;height:40px;border-radius:50%;object-fit:cover"
            />`
            : `<div style="
                width:40px;
                height:40px;
                border-radius:50%;
                background:#6A0001;
                color:white;
                display:flex;
                align-items:center;
                justify-content:center;
                font-weight:bold;
            ">
                ${usuari.usuari.substring(0,2).toUpperCase()}
            </div>`;

        if (userName) {
            userName.outerHTML = newUsuari;
        }
        if (icon) {
            icon.outerHTML = avatar;
        }

    }catch (err: unknown) {
                console.error(err);
                alert("Error inesperat");
            }
}

export function initPermisUsuarisVisio() {
    try{
        const permisUsuari = getPermis();

        if(permisUsuari === "superadmin"){ 
            return;
        }else{
            const soloSuper = [ "btnJerarquia", "btnFranges", "btnDocent", "btnImparteix"];
            soloSuper.forEach(ss => {
                const eliminar =$(ss) as HTMLLIElement;
                eliminar.remove();
            });
        }
        if(permisUsuari === "ver"){ 
            const calendari = $("btnCalendari") as HTMLLIElement;
            calendari.remove();
            const crearUsuari = $("btnCrearUsuari") as HTMLLIElement;
            crearUsuari.remove();
        }
    }catch (err: unknown) {
                console.error(err);
                alert("Error inesperat");
            }

}