import express from "express";
import Horari from "../models/horari.model";
import Imparteix from "../models/imparteix.model";
import Grup from "../models/grup.model";
import Franja_horaria from "../models/franja_horaria.model";
import Docent from "../models/docent.model";

const router = express.Router();

async function incrementarHoresAsignades(
    trx: any,
    modulId: string,
    grupId: string,
    quantitat: number
) {
    const files = await Imparteix.query(trx)
        .where("modul_id", modulId)
        .andWhere("grup_id", grupId);

    if (files.length === 0) {
        throw new Error(`No existeix cap relació imparteix per al mòdul ${modulId} i grup ${grupId}`);
    }

    for (const fila of files) {
        const novesHores = Math.max(0, (fila.hores_asignades ?? 0) + quantitat);

        await Imparteix.query(trx)
            .patch({ hores_asignades: novesHores })
            .where("docent_id", fila.docent_id)
            .andWhere("modul_id", fila.modul_id)
            .andWhere("grup_id", fila.grup_id);
    }
}

/** GET /api/horaris/grup/:grupId -> horaris d'un grup */
router.get("/grup/:grupId", async (req, res) => {
    try {
        const grupId = req.params.grupId;

        const horaris = await Horari.query()
            .where("grup_id", grupId)
            .withGraphFetched("modul")
            .orderBy("dia", "asc")
            .orderBy("franja_id", "asc");

        return res.json(horaris);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error obtenint horaris del grup" });
    }
});

/** POST /api/horaris -> crear horari i sumar hores_asignades */
router.post("/", async (req, res) => {
    const trx = await Horari.startTransaction();

    try {
        const { dia, modul_id, franja_id, grup_id } = req.body as {
            dia?: string;
            modul_id?: string;
            franja_id?: number;
            grup_id?: string;
        };

        if (!dia || !modul_id || franja_id == null || !grup_id) {
            await trx.rollback();
            return res.status(400).json({ message: "Falten camps" });
        }

        const created = await Horari.query(trx).insertAndFetch({
            dia,
            modul_id,
            franja_id,
            grup_id,
        });

        await incrementarHoresAsignades(trx, modul_id, grup_id, 1);

        await trx.commit();
        return res.status(201).json(created);
    } catch (err: any) {
        await trx.rollback();
        console.error(err);

        if (err?.message?.includes("No existeix cap relació imparteix")) {
            return res.status(409).json({ message: err.message });
        }

        if (err?.code === "SQLITE_CONSTRAINT" || err?.errno === 19) {
            return res.status(409).json({
                message: "Conflicte creant horari: franja ocupada, dades duplicades o FK invàlida"
            });
        }

        return res.status(500).json({ message: "Error creant horari" });
    }
});

/** PUT /api/horaris/:id -> editar horari */
router.put("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { dia, franja_id, grup_id, modul_id } = req.body;

        if (!id || !dia || !franja_id || !grup_id || !modul_id) {
            return res.status(400).json({ message: "Falten dades" });
        }

        const updated = await Horari.query().patchAndFetchById(id, {
            dia,
            franja_id,
            grup_id,
            modul_id,
        });

        if (!updated) {
            return res.status(404).json({ message: "Horari no trobat" });
        }

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error en actualitzar l'horari" });
    }
});

/** DELETE /api/horaris/:id -> eliminar horari i restar hores_asignades */
router.delete("/:id", async (req, res) => {
    const trx = await Horari.startTransaction();

    try {
        const id = Number(req.params.id);

        const antic = await Horari.query(trx).findById(id);
        if (!antic) {
            await trx.rollback();
            return res.status(404).json({ message: "Horari no trobat" });
        }

        await Horari.query(trx).deleteById(id);
        await incrementarHoresAsignades(trx, antic.modul_id, antic.grup_id, -1);

        await trx.commit();
        return res.json({ message: "Horari eliminat" });
    } catch (err: any) {
        await trx.rollback();
        console.error(err);

        if (err?.message?.includes("No existeix cap relació imparteix")) {
            return res.status(409).json({ message: err.message });
        }

        return res.status(500).json({ message: "Error eliminant horari" });
    }
});

router.get("/slots-disponibles", async (req, res) => {
    try {
        const grupId = String(req.query.grup_id || "");
        const modulId = String(req.query.modul_id || "");
        const docentIdsParam = String(req.query.docent_ids || "");

        type OcupacioDocentRow = {
            dia: string;
            franja_id: number;
            grup_id: string;
            docent_id: number;
        };

        if (!grupId || !modulId || !docentIdsParam) {
            return res.status(400).json({ message: "Falten paràmetres" });
        }

        const docentIds = docentIdsParam
            .split(",")
            .map(v => Number(v.trim()))
            .filter(v => !Number.isNaN(v));

        const grup = await Grup.query().findById(grupId);
        if (!grup) {
            return res.status(404).json({ message: "Grup no trobat" });
        }

        const franges = await Franja_horaria.query()
            .where("torn_franja", grup.torn_horari)
            .orderBy("hora_inici_min", "asc");

        const ocupatsGrup = await Horari.query()
            .select("dia", "franja_id")
            .where("grup_id", grupId);

        const ocupatsGrupSet = new Set(
            ocupatsGrup.map(x => `${x.dia}-${x.franja_id}`)
        );

        const docents = await Docent.query()
            .whereIn("id_docent", docentIds)
            .select("id_docent", "nom_sense");

        const docentsMap = new Map(
            docents.map(d => [d.id_docent, d.nom_sense])
        );

        // Horaris on qualsevol d'aquests docents ja està impartint classe
        const ocupacionsDocents = (await Horari.query()
            .alias("h")
            .join("imparteix as i", function () {
                this.on("i.modul_id", "=", "h.modul_id")
                    .andOn("i.grup_id", "=", "h.grup_id");
            })
            .whereIn("i.docent_id", docentIds)
            .select(
                "h.dia",
                "h.franja_id",
                "h.grup_id",
                "i.docent_id"
            )
            .distinct()) as unknown as OcupacioDocentRow[];

        type ConflicteDocent = {
            id_docent: number;
            nom_docent: string;
            grup_id: string;
        };

        const conflictesDocentsMap = new Map<string, ConflicteDocent[]>();

        for (const fila of ocupacionsDocents) {
            const key = `${fila.dia}-${fila.franja_id}`;

            if (!conflictesDocentsMap.has(key)) {
                conflictesDocentsMap.set(key, []);
            }

            const llista = conflictesDocentsMap.get(key)!;

            if (!llista.some(x => x.id_docent === fila.docent_id && x.grup_id === fila.grup_id)) {
                llista.push({
                    id_docent: fila.docent_id,
                    nom_docent: docentsMap.get(fila.docent_id) ?? `Docent ${fila.docent_id}`,
                    grup_id: fila.grup_id,
                });
            }
        }

        const dies = ["dilluns", "dimarts", "dimecres", "dijous", "divendres"] as const;

        const valids: Array<{ dia: string; franja_id: number }> = [];
        const noValids: Array<{
            dia: string;
            franja_id: number;
            motiu: "grup_ocupat" | "docent_ocupat";
            conflicte_docents?: ConflicteDocent[];
        }> = [];

        for (const dia of dies) {
            for (const franja of franges) {
                const key = `${dia}-${franja.id_franja}`;

                if (ocupatsGrupSet.has(key)) {
                    noValids.push({
                        dia,
                        franja_id: franja.id_franja,
                        motiu: "grup_ocupat",
                    });
                    continue;
                }

                const conflictes = conflictesDocentsMap.get(key) ?? [];

                if (conflictes.length > 0) {
                    noValids.push({
                        dia,
                        franja_id: franja.id_franja,
                        motiu: "docent_ocupat",
                        conflicte_docents: conflictes,
                    });
                    continue;
                }

                valids.push({
                    dia,
                    franja_id: franja.id_franja,
                });
            }
        }

        return res.json({ valids, noValids });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error calculant slots disponibles" });
    }
});

/** GET /api/horaris/:id -> un horari */
router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        const horari = await Horari.query()
            .findById(id)
            .withGraphFetched("[modul,franja,grup]");

        if (!horari) return res.status(404).json({ message: "Horari no trobat" });

        return res.json(horari);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error obtenint horari" });
    }
});

export default router;