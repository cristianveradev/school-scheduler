import express from "express";
import Curs from "../models/curs.model";

const router = express.Router();

/** GET /api/cursos/cicle/:cicleId
    Devuelve cursos de un ciclo (para el select)*/
router.get("/cicle/:cicleId", async (req, res) => {
    try {
        const cicleId = req.params.cicleId;

        const cursos = await Curs.query()
        .select("id_curs", "nivell", "cicle_id")
        .where("cicle_id", cicleId)
        .orderBy("nivell", "asc");

        return res.json(cursos);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error obtenint cursos del cicle" });
    }
});

/** GET /api/cursos -> todos (opcional) */
router.get("/", async (_req, res) => {
    try {
        const cursos = await Curs.query().select("id_curs", "nivell", "cicle_id");
        return res.json(cursos);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error obtenint cursos" });
    }
});

/** GET /api/cursos/:id -> uno */
router.get("/:id", async (req, res) => {
    try {
        const id = req.params.id;

        const curs = await Curs.query()
        .select("id_curs", "nivell", "cicle_id")
        .findById(id);

        if (!curs) return res.status(404).json({ message: "Curs no trobat" });

        return res.json(curs);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error obtenint curs" });
    }
});

/** POST /api/cursos -> crear */
router.post("/", async (req, res) => {
    try {
        const { id_curs, nivell, cicle_id } = req.body as {
            id_curs?: string;
            nivell?: number;
            cicle_id?: string;
        };

        if (!id_curs || nivell == null || !cicle_id) {
            return res.status(400).json({ message: "Falten camps" });
        }

        const created = await Curs.query().insertAndFetch({
            id_curs,
            nivell,
            cicle_id,
        });

        return res.status(201).json(created);
    } catch (err: any) {
        console.error(err);
        // PK duplicada o FK invalida
        if (err?.code === "SQLITE_CONSTRAINT" || err?.errno === 19) {
            return res.status(409).json({ message: "Conflicte: ID duplicat o cicle inexistent" });
        }
        return res.status(500).json({ message: "Error creant curs" });
    }
});


/** PUT /api/cursos/:id -> editar "entero"
    body: { id_curs?: string, nivell: number, cicle_id: string }*/
router.put("/:id", async (req, res) => {
    try {
        const currentId = req.params.id;
        const { id_curs, nivell, cicle_id } = req.body as {
            id_curs?: string;
            nivell?: number;
            cicle_id?: string;
        };

        if (nivell == null || !cicle_id) {
            return res.status(400).json({ message: "Falten camps (nivell, cicle_id)" });
        }

        const exists = await Curs.query().findById(currentId);
        if (!exists) return res.status(404).json({ message: "Curs no trobat" });

        // Caso 1: no cambia id
        if (!id_curs || id_curs === currentId) {
            const updated = await Curs.query().patchAndFetchById(currentId, {
                nivell,
                cicle_id,
            });
            return res.json(updated);
        }

        // Caso 2: cambia id -> comprobar que el nuevo no exista
        const already = await Curs.query().findById(id_curs);
        if (already) return res.status(409).json({ message: "El nou ID ja existeix" });

        // Update PK + resto
        await Curs.query()
        .patch({ id_curs, nivell, cicle_id })
        .where("id_curs", currentId);

        const updated = await Curs.query()
        .select("id_curs", "nivell", "cicle_id")
        .findById(id_curs);

        return res.json(updated);
    } catch (err: any) {
        console.error(err);
        if (err?.code === "SQLITE_CONSTRAINT" || err?.errno === 19) {
            return res.status(409).json({ message: "Conflicte actualitzant curs (FK/unique)" });
        }
        return res.status(500).json({ message: "Error actualitzant curs" });
    }
});

/** DELETE /api/cursos/:id -> eliminar */
router.delete("/:id", async (req, res) => {
    try {
        const id = req.params.id;

        const deleted = await Curs.query().deleteById(id);
        if (!deleted) return res.status(404).json({ message: "Curs no trobat" });

        return res.json({ message: "Curs eliminat" });
    } catch (err: any) {
        console.error(err);
        // si tiene grups/moduls asociados (FK RESTRICT), constraint
        if (err?.code === "SQLITE_CONSTRAINT" || err?.errno === 19) {
            return res.status(409).json({ message: "No es pot eliminar: té dades associades" });
        }
        return res.status(500).json({ message: "Error esborrant curs" });
    }
});

export default router;