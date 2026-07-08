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

