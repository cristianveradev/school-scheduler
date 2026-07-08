// Aquí ponemos las variables fijas que seran igual en todos los archivos,
// asi si luego hay que cambiarla, es solo desde aqui y no en todos
export const API_BASE = "http://localhost:3100/api";

// Funcion simple para buscar el elemento por id y comprobar que existe
export function $(id: string) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`No existe #${id}`);
    return el;
}
// Función para conseguir el token
export function getToken(): string {
    const t = localStorage.getItem("token");
    if (!t) throw new Error("No token");
    return t;
}
// Función para conseguir el permiso
export function getPermis(): string | null {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const payloadBase64 = token.split(".")[1];
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);

    return payload.permisos ?? null;
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
    const isFormData = init?.body instanceof FormData;

    const headers: Record<string, string> = {
        Authorization: `Bearer ${getToken()}`,
        ...(init?.headers as Record<string, string> || {}),
    };

    if (!isFormData) {
        headers["Content-Type"] = "application/json";
    }

    const r = await fetch(url, {
        ...init,
        headers,
    });

    const contentType = r.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    const body = isJson ? await r.json() : await r.text();

    if (!r.ok) {
        const message =
            isJson &&
            body &&
            typeof body === "object" &&
            "message" in body
                ? String(body.message)
                : typeof body === "string"
                ? body
                : `Error ${r.status}`;

        throw new Error(message);
    }

    return body as T;
}
// Función simple para convertir “HH:MM” a minutos
export function hhmmToMinutes(hhmm: string): number {
    const [hStr, mStr] = hhmm.split(":");
    const h = Number(hStr);
    const m = Number(mStr);

    if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) {
        throw new Error("Hora inválida, formato esperado HH:MM");
    }
    return h * 60 + m;
}

export function showMessage(text: string, type: "success" | "error" = "success") {
    const msgAnt = document.getElementById("msgPopup") as HTMLDivElement;
    if(msgAnt)msgAnt.remove();
    
    const msg = document.createElement("div");
    msg.setAttribute('id', 'msgPopup');
    msg.textContent = text;

    msg.style.position = "fixed";
    msg.style.top = "25vh";
    msg.style.right = "48vw";
    msg.style.background = type === "success" ? "#28a745" : "#dc3545";
    msg.style.color = "#fff";
    msg.style.padding = "10px 15px";
    msg.style.borderRadius = "6px";
    msg.style.opacity = "0";
    msg.style.transition = "opacity 0.3s";

    document.body.appendChild(msg);

    setTimeout(() => msg.style.opacity = "1", 10);
    setTimeout(() => {
        msg.style.opacity = "0";
        setTimeout(() => msg.remove(), 300);
    }, 3000);
}