import { API_BASE, api, $, showMessage } from "./config";
import { loadDepartaments } from "./departament";
import { loadCicles } from "./cicle";
import { loadCursos } from "./curs";
import { loadGrups } from "./grup";
import { resetSelect } from "./crearJerarquia";

type DiaSetmana = "dilluns" | "dimarts" | "dimecres" | "dijous" | "divendres";

type Horari = {
    id_horari: number; dia: DiaSetmana; franja_id: number; grup_id: string; modul_id: string;
    modul: { id_modul: string; nom_modul: string; hores_setmana: number; color: string; curs_id: string; };
};

type Franja = { id_franja: number; hora_inici: string; hora_fi: string; hora_inici_min: number; hora_fi_min: number; torn_franja: string };

type Imparteix = { docent_id: number; modul_id: number; grup_id: string; hores_asignades:number;
    modul: { id_modul: string; nom_modul: string; hores_setmana: number; color: string; curs_id: string };
    docent: { id_docent: number; nom_sense: string; avatar: string | null };
};

type Grup = {
    id_grup: string;
    grup: string;
    aula: string;
    torn_horari: string;
    curs_id: string;
    imparteix: Imparteix[];
    franja: Franja[];
    horari: Horari[];
};

type ImparteixItem = { docent_id: number; hores_asignades: number;
    docent: { id_docent?: number; nom_sense: string };
    modul: { id_modul: string; nom_modul: string; hores_setmana: number; color?: string; curs_id: string; };
};

type ModulCardData = {
    modul: ImparteixItem["modul"];
    docents: string[];
    docentIds: number[];
    horesAsignades: number;
    horesSetmana: number;
    completat: boolean;
};

type SlotInfo = { dia: DiaSetmana; franja_id: number };

type ConflicteDocent = { id_docent: number; nom_docent: string; grup_id: string; };

type SlotNoValid = SlotInfo & {
    motiu: "grup_ocupat" | "docent_ocupat";
    conflicte_docents?: ConflicteDocent[];
};

type SlotResponse = {
    valids: SlotInfo[];
    noValids: SlotNoValid[];
};

type DragInfo = {
    modulId: string;
    grupId: string;
    docentIds: number[];
    source: "sidebar" | "calendar";
    horariId?: number;
};

let currentDrag: DragInfo | null = null;
let droppedInValidZone = false;

function agruparModuls(imparteix: ImparteixItem[]): ModulCardData[] {
    const map = new Map<string, ModulCardData>();

    for (const imp of imparteix) {
        const id = imp.modul.id_modul;

        if (!map.has(id)) {
            map.set(id, {
                modul: imp.modul,
                docents: [imp.docent.nom_sense],
                docentIds: [imp.docent_id],
                horesAsignades: imp.hores_asignades,
                horesSetmana: imp.modul.hores_setmana,
                completat: imp.hores_asignades >= imp.modul.hores_setmana,
            });
            continue;
        }

        const item = map.get(id)!;

        if (!item.docents.includes(imp.docent.nom_sense)) {
            item.docents.push(imp.docent.nom_sense);
        }

        if (!item.docentIds.includes(imp.docent_id)) {
            item.docentIds.push(imp.docent_id);
        }

        // Como el contador debería ir sincronizado para todos los profes de ese módulo,
        // usamos el mayor por seguridad.
        item.horesAsignades = Math.max(item.horesAsignades, imp.hores_asignades);
        item.completat = item.horesAsignades >= item.horesSetmana;
    }

    return Array.from(map.values());
}

function resetCalendari(){
    const calendari = $("mostrarCalendari") as HTMLDivElement;
    calendari.innerHTML = ""; // Limpia
}

export async function mostrarJerarquia() {
    const pizarra = $("pizarra") as HTMLDivElement;
    pizarra.innerHTML = `
        <div id="inicioJerarquia">
            <div class="filtros">
                <div class="campo">
                    <label for="departament">Departament</label>
                    <select id="departament"></select>
                </div>
                <div class="campo">
                    <label for="cicle">Cicle</label>
                    <select id="cicle"></select>
                </div>
                <div class="campo">
                    <label for="curs">Curs</label>
                    <select id="curs"></select>
                </div>
                <div class="campo">
                    <label for="grup">Grup</label>
                    <select id="grup"></select>
                </div>
            </div>

            <div id="mostrarCalendari"></div>
        </div>
    `;
    const selDep = $("departament") as HTMLSelectElement;
    const selCic = $("cicle") as HTMLSelectElement;
    const selCur = $("curs") as HTMLSelectElement;
    const selGru = $("grup") as HTMLSelectElement;

    // placeholders iniciales
    resetSelect(selDep);
    resetSelect(selCic);
    resetSelect(selCur);
    resetSelect(selGru);
    resetCalendari();

    // 1) cargar departamentos
    await loadDepartaments(selDep);
        resetSelect(selCic);
        resetSelect(selCur);
        resetSelect(selGru);
        resetCalendari();
    
    // 2) onchange departamento
        selDep.addEventListener("change", async () => {
            const depId = selDep.value;
    
            resetSelect(selCic);
            resetSelect(selCur);
            resetSelect(selGru);
            resetCalendari();
    
            if (!depId) {
                resetSelect(selCic);
                resetSelect(selCur);
                resetSelect(selGru);
                resetCalendari();
                return;
            }
            // 3) cargar ciclos 
            await loadCicles(selCic, depId);
            resetSelect(selCur);
            resetSelect(selGru);
            resetCalendari();
        });
    
        // 4) onchange ciclo
        selCic.addEventListener("change", async () => {
            const cicleId = selCic.value;
    
            resetSelect(selCur);
            resetSelect(selGru);
            resetCalendari();
    
            if (!cicleId) return;
            // 5) cargar cursos 
            await loadCursos(selCur, cicleId);
            resetSelect(selGru);
            resetCalendari();
        });
    
        // 6) onchange curso
        selCur.addEventListener("change", async () => {
            const cursId = selCur.value;
    
            resetSelect(selGru);
            resetCalendari();
            if (!cursId) return;
            // 7) cargar grupos 
            await loadGrups(selGru, cursId);
            resetCalendari();
        });

        // 8) onchange grupo
        selGru.addEventListener("change", async () => {
            const grupId = selGru.value;
    
            if (!grupId) return;
            // 7) cargar calendario
            await getCalendari(grupId);
        });
}

export async function getCalendari(grupId: string) {
    try {
        const grup = await api<Grup>(`${API_BASE}/calendari/${encodeURIComponent(grupId)}`);

        const modulsAgrupats = agruparModuls(grup.imparteix);
        
        let pizarra = $("mostrarCalendari") as HTMLDivElement;
        pizarra.innerHTML = ""; // Limpia antes de agregar
        let calendari = document.createElement('div');
            calendari.setAttribute('id', 'calendari');
            calendari.innerHTML = ''+
                '<section class="course-info">'+
                    '<h1>Horario: <span>'+grup.id_grup+' - Aula '+grup.aula+'</span></h1>'+
                    '<div class="course-actions">'+
                        '<button class="btn-action"><i class="fas fa-download"></i> Exportar</button>'+
                        '<button class="btn-action"><i class="fas fa-print"></i> Imprimir</button>'+
                    '</div>'+
                '</section>'+
                '<div class="workspace">'+
                    //<!-- SIDEBAR IZQUIERDA: Asignaturas para drag & drop -->'
                    '<aside class="sidebar-tools">'+
                        '<div class="sidebar-header">'+
                            '<h2><i class="fas fa-book-open"></i> Moduls</h2>'+
                            '<p class="subtitle">Arrastra al calendari</p>'+
                        '</div>'+
                        '<div class="subjects-list">'+
                        modulsAgrupats.map(
                            (ma) => `
                            <div class="subject-card ${ma.completat ? "subject-card-disabled" : ""}"
                                ${ma.completat ? "" : 'draggable="true"'}
                                data-modul-id="${ma.modul.id_modul}"
                                data-grup-id="${grup.id_grup}"
                                data-docent-ids="${ma.docentIds.join(",")}"
                                style="border-left-color: ${ma.modul.color};"
                            >
                                <div class="subject-color" style="background-color: ${ma.modul.color};"></div>
                                <div class="subject-details">
                                    <div class="subject-name"> ${ma.modul.id_modul.split("-")[1]} - ${ma.modul.nom_modul} </div>
                                    <div class="teacher-name"><i class="fas fa-user"></i> ${ma.docents.join(" / ")}</div>
                                    <div class="hours"><i class="fas fa-clock"></i> ${ma.modul.hores_setmana}h / setmana</div>
                                    <div class="subject-hours-badge">${ma.horesAsignades}/${ma.horesSetmana}</div>
                                </div>
                            </div>
                            `
                        ).join("")+
                        '</div>'+
                    '</aside>'+
                    //<!-- CALENDARIO DERECHO -->
                    '<section class="calendar-wrapper">'+
                        '<div class="calendar-grid">'+
                            '<div class="cal-header empty-cell"></div>'+
                            '<div class="cal-header">Dilluns</div>'+
                            '<div class="cal-header">Dimarts</div>'+
                            '<div class="cal-header">Dimecres</div>'+
                            '<div class="cal-header">Dijous</div>'+
                            '<div class="cal-header">Divendres</div>'+
                            grup.franja
                            .map(f => {
                                const span = Math.round((f.hora_fi_min - f.hora_inici_min) / 5);
                                if (f.hora_fi_min - f.hora_inici_min <= 30) {
                                return `
                                    <div class="time-slot break-time" style="grid-row: span ${span}">${f.hora_inici} - ${f.hora_fi}</div>
                                    <div class="break-slot" style="grid-row: span ${span}">PATIO</div>
                                    <div class="break-slot" style="grid-row: span ${span}">PATIO</div>
                                    <div class="break-slot" style="grid-row: span ${span}">PATIO</div>
                                    <div class="break-slot" style="grid-row: span ${span}">PATIO</div>
                                    <div class="break-slot" style="grid-row: span ${span}">PATIO</div>
                                `;
                                } else {
                                return `
                                    <div class="time-slot" style="grid-row: span ${span}">${f.hora_inici} - ${f.hora_fi}</div>
                                    <div class="day-slot" style="grid-row: span ${span}" data-day="dilluns" data-time="${f.id_franja}"></div>
                                    <div class="day-slot" style="grid-row: span ${span}" data-day="dimarts" data-time="${f.id_franja}"></div>
                                    <div class="day-slot" style="grid-row: span ${span}" data-day="dimecres" data-time="${f.id_franja}"></div>
                                    <div class="day-slot" style="grid-row: span ${span}" data-day="dijous" data-time="${f.id_franja}"></div>
                                    <div class="day-slot" style="grid-row: span ${span}" data-day="divendres" data-time="${f.id_franja}"></div>
                                `;
                                }
                            }).join("")+
                            
                        '</div>'+
                        '<div class="calendar-footer">'+
                            '<div class="legend">'+
                                '<div class="legend-item">'+
                                    '<span class="legend-color" style="background-color: #3498db;"></span>'+
                                    '<span>Desarrollo Web</span>'+
                                '</div>'+
                                '<div class="legend-item">'+
                                    '<span class="legend-color" style="background-color: #e74c3c;"></span>'+
                                    '<span>Interfaces</span>'+
                                '</div>'+
                                '<div class="legend-item">'+
                                    '<span class="legend-color" style="background-color: #2ecc71;"></span>'+
                                    '<span>Móviles</span>'+
                                '</div>'+
                            '</div>'+
                        '</div>'+
                    '</section>'+
                '</div>';

        pizarra.appendChild(calendari);

        omplirHorariGuardat(grup);
        connectarDragAndDrop();
    }catch (error) {
        console.error(error);
    }
}

// Pinta el calendario con lo que hay relleno en la base de datos
function omplirHorariGuardat(grup: Grup) {
    const modulsAgrupats = agruparModuls(grup.imparteix);
    const docentsPerModul = new Map<string, number[]>();

    for (const ma of modulsAgrupats) {
        docentsPerModul.set(ma.modul.id_modul, ma.docentIds);
    }
    for (const h of grup.horari) {
        const slot = document.querySelector(
            `.day-slot[data-day="${h.dia}"][data-time="${h.franja_id}"]`
        ) as HTMLDivElement | null;

        if (!slot) continue;

        const color = h.modul.color || "#3498db";
        const docentIds = docentsPerModul.get(h.modul.id_modul) || [];

        slot.innerHTML = `
            <div
                class="calendar-module"
                draggable="true"
                data-modul-id="${h.modul.id_modul}"
                data-grup-id="${grup.id_grup}"
                data-docent-ids="${docentIds.join(",")}"
                data-horari-id="${h.id_horari}"
                style="background-color: ${color};"
            >
                <div class="calendar-module-code">
                    ${h.modul.id_modul.split("-")[1]}
                </div>
                <div class="calendar-module-name">
                    ${h.modul.nom_modul}
                </div>
            </div>
        `;

        slot.dataset.modulId = h.modul.id_modul;
        slot.dataset.horariId = String(h.id_horari);
    }
}

// evento al seleccionar y arrastrar un modulo de la barra de la izquierda
async function onSubjectDragStart(ev: DragEvent) {
    droppedInValidZone = true;
    const el = ev.currentTarget as HTMLDivElement;

    if (!ev.dataTransfer) return;

    ev.dataTransfer.effectAllowed = "move";
    ev.dataTransfer.setData("text/plain", el.dataset.modulId || "");
    console.log("Drag start:", el.dataset.modulId);
    currentDrag = {
        modulId: el.dataset.modulId!,
        grupId: el.dataset.grupId!,
        docentIds: (el.dataset.docentIds || "")
            .split(",")
            .map(x => Number(x))
            .filter(x => !Number.isNaN(x)),
            source: "sidebar",
    };

    const params = new URLSearchParams({
        grup_id: currentDrag.grupId,
        modul_id: currentDrag.modulId,
        docent_ids: currentDrag.docentIds.join(","),
    });
    const veresto = params.toString();
    const data = await api<SlotResponse>(
        `${API_BASE}/horaris/slots-disponibles?${veresto}`
    );

    marcarSlots(data.valids, data.noValids);
}

// evento al seleccionar y arrastrar un modulo de las casillas del calendario
async function onCalendarModuleDragStart(ev: DragEvent) {
    droppedInValidZone = false;
    const el = ev.currentTarget as HTMLDivElement;

    if (!ev.dataTransfer) return;

    ev.dataTransfer.effectAllowed = "move";
    ev.dataTransfer.setData("text/plain", el.dataset.modulId || "");

    currentDrag = {
        modulId: el.dataset.modulId!,
        grupId: el.dataset.grupId!,
        docentIds: (el.dataset.docentIds || "")
            .split(",")
            .map(x => Number(x))
            .filter(x => !Number.isNaN(x)),
        source: "calendar",
        horariId: Number(el.dataset.horariId),
    };

    const params = new URLSearchParams({
        grup_id: currentDrag.grupId,
        modul_id: currentDrag.modulId,
        docent_ids: currentDrag.docentIds.join(","),
    });

    const data = await api<SlotResponse>(
        `${API_BASE}/horaris/slots-disponibles?${params.toString()}`
    );

    marcarSlots(data.valids, data.noValids);
}

// evento al soltar un modulo de la baara de la izquierda
function onSubjectDragEnd() {
    netejarSlotsMarcats();
    if (!droppedInValidZone) {
        showMessage("Si vols eliminar-lo, torna-ho a la caixa de mòduls!", "error");
    }
    //currentDrag = null;
}

function onDaySlotDragOver(ev: DragEvent) {
    ev.preventDefault();

    const slot = ev.currentTarget as HTMLDivElement;
    if (currentDrag && slot.classList.contains("slot-valid") && ev.dataTransfer) {
        ev.dataTransfer.dropEffect = "move";
    }
}

// evento al soltar un modulo sobre una casilla
async function onDaySlotDrop(ev: DragEvent) {
    ev.preventDefault();

    try{
    const slot = ev.currentTarget as HTMLDivElement;
    if (!currentDrag || !slot.classList.contains("slot-valid")){
        droppedInValidZone = true;
        showMessage("Aquesta casella no és vàlida!", "error");
        return;
    } 

    const dia = slot.dataset.day as DiaSetmana;
    const franjaId = Number(slot.dataset.time);
    
    if (currentDrag.source === "sidebar") {
        await api(`${API_BASE}/horaris`, {
            method: "POST",
            body: JSON.stringify({
                dia,
                modul_id: currentDrag.modulId,
                franja_id: franjaId,
                grup_id: currentDrag.grupId,
            }),
        });
        showMessage("Asignat correctament!", "success");
    } else if (currentDrag.source === "calendar" && currentDrag.horariId) {
        droppedInValidZone = true;
        await api(`${API_BASE}/horaris/${currentDrag.horariId}`, {
            method: "PUT",
            body: JSON.stringify({
                dia,
                modul_id: currentDrag.modulId,
                franja_id: franjaId,
                grup_id: currentDrag.grupId,
            }),
        });
        showMessage("Mogut correctament!", "success");
    }

    const grupId = currentDrag.grupId;
    netejarSlotsMarcats();
    currentDrag = null;
    await getCalendari(grupId);
    }catch(err){
        showMessage("Aquesta casella no és vàlida!", "error");
    }
}

function onSidebarDragOver(ev: DragEvent) {
    if (!currentDrag) return;

    if (currentDrag.source === "calendar") {
        ev.preventDefault();
        if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
    }
}

async function onSidebarDrop(ev: DragEvent) {
    ev.preventDefault();
    try{
        droppedInValidZone = true;
        if (!currentDrag || currentDrag.source !== "calendar" || !currentDrag.horariId) return showMessage("Error eliminant la casella!", "error");;

        const grupId = currentDrag.grupId;

        await api(`${API_BASE}/horaris/${currentDrag.horariId}`, {
            method: "DELETE",
        });
        showMessage("Casella eliminada correctament!", "success");

        netejarSlotsMarcats();
        currentDrag = null;
        await getCalendari(grupId);
    }catch(err){
        showMessage("Error eliminant la casella!", "error");
    }
}

function netejarSlotsMarcats() {
    document.querySelectorAll<HTMLDivElement>(".day-slot").forEach((slot) => {
        slot.classList.remove("slot-valid", "slot-invalid");

        const motiuEl = slot.querySelector(".slot-invalid-reason");
        if (motiuEl) motiuEl.remove();
    });
}

function crearTextMotiu(conflictes: ConflicteDocent[]) {
    return conflictes
        .map(c => `${c.nom_docent} a ${c.grup_id}`)
        .join("<br>");
}

function marcarSlots(valids: SlotInfo[], noValids: SlotNoValid[]) {
    netejarSlotsMarcats();

    for (const s of valids) {
        const el = document.querySelector<HTMLDivElement>(
            `.day-slot[data-day="${s.dia}"][data-time="${s.franja_id}"]`
        );
        el?.classList.add("slot-valid");
    }

    for (const s of noValids) {
        const el = document.querySelector<HTMLDivElement>(
            `.day-slot[data-day="${s.dia}"][data-time="${s.franja_id}"]`
        );

        if (!el) continue;

        el.classList.add("slot-invalid");

        const casillaOcupada = !!el.querySelector(".calendar-module");

        // Si ya hay un módulo pintado dentro, no mostramos texto
        if (casillaOcupada) continue;

        // Solo mostramos texto si el rojo es por conflicto de docentes
        if (s.motiu !== "docent_ocupat") continue;
        if (!s.conflicte_docents || s.conflicte_docents.length === 0) continue;

        const reason = document.createElement("div");
        reason.className = "slot-invalid-reason";
        reason.innerHTML = crearTextMotiu(s.conflicte_docents);

        el.appendChild(reason);
    }
}

function connectarDragAndDrop() {
    document.querySelectorAll<HTMLElement>(".subject-card[draggable='true']").forEach((el) => {
        el.addEventListener("dragstart", (ev) => void onSubjectDragStart(ev as DragEvent));
        el.addEventListener("dragend", onSubjectDragEnd);
    });

    document.querySelectorAll<HTMLElement>(".calendar-module[draggable='true']").forEach((el) => {
        el.addEventListener("dragstart", (ev) => void onCalendarModuleDragStart(ev as DragEvent));
        el.addEventListener("dragend", onSubjectDragEnd);
    });

    document.querySelectorAll<HTMLElement>(".day-slot").forEach((el) => {
        el.addEventListener("dragover", (ev) => onDaySlotDragOver(ev as DragEvent));
        el.addEventListener("drop", (ev) => void onDaySlotDrop(ev as DragEvent));
    });

    const sidebarList = document.querySelector(".subjects-list") as HTMLElement | null;
    if (sidebarList) {
        sidebarList.addEventListener("dragover", (ev) => onSidebarDragOver(ev as DragEvent));
        sidebarList.addEventListener("drop", (ev) => void onSidebarDrop(ev as DragEvent));
    }
}