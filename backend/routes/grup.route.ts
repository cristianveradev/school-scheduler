import express from "express";
import Grup from "../models/grup.model";

const router = express.Router();


/** GET /api/grups/curs/:cursId
    Devuelve grupos de un curso (para el select) */
router.get("/curs/:cursId", async (req, res) => {
    try {
        const cursId = req.params.cursId;

        const grups = await Grup.query()
        .select("id_grup", "grup", "aula", "torn_horari", "curs_id")
        .where("curs_id", cursId)
        .orderBy("id_grup", "asc");

        return res.json(grups);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error obtenint grups del curs" });
    }
});

/** GET /api/grups -> todos */
router.get("/", async (_req, res) => {
    try {
        const grups = await Grup.query().select("id_grup", "grup", "aula", "torn_horari", "curs_id");
        return res.json(grups);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error obtenint grups" });
    }
});

/** GET /api/grups/:id -> uno */
router.get("/:id", async (req, res) => {
    try {
        const id = req.params.id;

        const grup = await Grup.query()
        .select("id_grup", "grup", "aula", "torn_horari", "curs_id")
        .findById(id);

        if (!grup) return res.status(404).json({ message: "Grup no trobat" });

        return res.json(grup);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error obtenint grup" });
    }
});

/** POST /api/grups -> crear */
router.post("/", async (req, res) => {
    try {
        const { id_grup, grup, aula, torn_horari, curs_id } = req.body as {
            id_grup?: string;
            grup?: string;
            aula?: string;
            torn_horari?: string;
            curs_id?: string;
        };

        if (!id_grup || !grup || !aula || !torn_horari || !curs_id) {
        return res.status(400).json({ message: "Falten camps" });
        }

        const created = await Grup.query().insertAndFetch({
            id_grup,
            grup,
            aula,
            torn_horari,
            curs_id,
        });

        return res.status(201).json(created);
    } catch (err: any) {
        console.error(err);
        if (err?.code === "SQLITE_CONSTRAINT" || err?.errno === 19) {
            // PK duplicada o unique(curs_id,grup) o FK curs_id inválida
            return res.status(409).json({ message: "Conflicte: ID duplicat / grup repetit al curs / curs inexistent" });
        }
        return res.status(500).json({ message: "Error creant grup" });
    }
});

/** PUT /api/grups/:id -> editar "entero"
    body: { id_grup?: string, grup: string, aula: string, torn_horari: string, curs_id: string }*/
router.put("/:id", async (req, res) => {
    try {
        const currentId = req.params.id;
        const { id_grup, grup, aula, torn_horari, curs_id } = req.body as {
            id_grup?: string;
            grup?: string;
            aula?: string;
            torn_horari?: string;
            curs_id?: string;
        };

        if (!grup || !aula || !torn_horari || !curs_id) {
            return res.status(400).json({ message: "Falten camps (grup, aula, torn_horari, curs_id)" });
        }

        const exists = await Grup.query().findById(currentId);
        if (!exists) return res.status(404).json({ message: "Grup no trobat" });

        // Caso 1: no cambia id
        if (!id_grup || id_grup === currentId) {
            const updated = await Grup.query().patchAndFetchById(currentId, {
                grup,
                aula,
                torn_horari,
                curs_id,
            });
            return res.json(updated);
        }

        // Caso 2: cambia id
        const already = await Grup.query().findById(id_grup);
        if (already) return res.status(409).json({ message: "El nou ID ja existeix" });

        await Grup.query()
        .patch({ id_grup, grup, aula, torn_horari, curs_id })
        .where("id_grup", currentId);

        const updated = await Grup.query()
        .select("id_grup", "grup", "aula", "torn_horari", "curs_id")
        .findById(id_grup);

        return res.json(updated);
    } catch (err: any) {
        console.error(err);
        if (err?.code === "SQLITE_CONSTRAINT" || err?.errno === 19) {
            return res.status(409).json({ message: "Conflicte actualitzant grup (unique/FK)" });
        }
        return res.status(500).json({ message: "Error actualitzant grup" });
    }
});

/** DELETE /api/grups/:id -> eliminar */
router.delete("/:id", async (req, res) => {
    try {
        const id = req.params.id;

        const deleted = await Grup.query().deleteById(id);
        if (!deleted) return res.status(404).json({ message: "Grup no trobat" });

        return res.json({ message: "Grup eliminat" });
    } catch (err: any) {
        console.error(err);
        // si tiene horaris asociados, FK CASCADE en horaris.grup_id (en tu db era CASCADE)
        // pero si hay otras restricciones, podría saltar constraint
        if (err?.code === "SQLITE_CONSTRAINT" || err?.errno === 19) {
            return res.status(409).json({ message: "No es pot eliminar: té dades associades" });
        }
        return res.status(500).json({ message: "Error esborrant grup" });
    }
});

export default router;