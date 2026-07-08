import express from "express";
import Cicle from "../models/cicle.model";

const router = express.Router();

// GET /api/cicles/departament/:departamentId -> ciclos de un departament ✅
router.get("/departament/:departamentId", async (req, res) => {
    try {
        const departamentId = req.params.departamentId;

        const cicles = await Cicle.query()
        .select("id_cicle", "nom_cicle", "departament_id")
        .where("departament_id", departamentId)
        .orderBy("id_cicle", "asc");

        return res.json(cicles);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error obtenint cicles del departament" });
    }
});

// GET /api/cicles -> todos
router.get("/", async (_req, res) => {
    try {
        const cicles = await Cicle.query().select("id_cicle", "nom_cicle", "departament_id");
        return res.json(cicles);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error obtenint cicles" });
    }
});

// GET /api/cicles/:id -> uno
router.get("/:id", async (req, res) => {
    try {
        const id = req.params.id;

        const cicle = await Cicle.query()
        .select("id_cicle", "nom_cicle", "departament_id")
        .findById(id);

        if (!cicle) return res.status(404).json({ message: "Cicle no trobat" });

        return res.json(cicle);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error obtenint cicle" });
    }
});

// POST /api/cicles -> crear
router.post("/", async (req, res) => {
    try {
        const { id_cicle, nom_cicle, departament_id } = req.body as {
            id_cicle?: string;
            nom_cicle?: string;
            departament_id?: string;
        };

        if (!id_cicle || !nom_cicle || !departament_id) {
            return res.status(400).json({ message: "Falten camps" });
        }

        const created = await Cicle.query().insertAndFetch({
            id_cicle,
            nom_cicle,
            departament_id,
        });

        return res.status(201).json(created);
    } catch (err: any) {
        console.error(err);
        // PK duplicada o FK invalida
        if (err?.code === "SQLITE_CONSTRAINT" || err?.errno === 19) {
            return res.status(409).json({ message: "Conflicte: ID duplicat o departament inexistent" });
        }
        return res.status(500).json({ message: "Error creant cicle" });
    }
});

// PUT /api/cicles/:id -> editar "entero"
// body: { id_cicle?: string, nom_cicle: string, departament_id: string }
router.put("/:id", async (req, res) => {
    try {
        const currentId = req.params.id;
        const { id_cicle, nom_cicle, departament_id } = req.body as {
            id_cicle?: string;
            nom_cicle?: string;
            departament_id?: string;
        };

        if (!nom_cicle || !departament_id) {
            return res.status(400).json({ message: "Falten camps (nom_cicle, departament_id)" });
        }

        const exists = await Cicle.query().findById(currentId);
        if (!exists) return res.status(404).json({ message: "Cicle no trobat" });

        // Si no cambias id, update normal
        if (!id_cicle || id_cicle === currentId) {
            const updated = await Cicle.query().patchAndFetchById(currentId, {
                nom_cicle,
                departament_id,
            });
            return res.json(updated);
        }

        // Si cambias id: comprobar que el nuevo id no exista
        const already = await Cicle.query().findById(id_cicle);
        if (already) return res.status(409).json({ message: "El nou ID ja existeix" });

        // Update PK + resto
        await Cicle.query()
        .patch({ id_cicle, nom_cicle, departament_id })
        .where("id_cicle", currentId);

        const updated = await Cicle.query()
        .select("id_cicle", "nom_cicle", "departament_id")
        .findById(id_cicle);

        return res.json(updated);
    } catch (err: any) {
        console.error(err);
        if (err?.code === "SQLITE_CONSTRAINT" || err?.errno === 19) {
            return res.status(409).json({ message: "Conflicte actualitzant cicle (FK/unique)" });
        }
        return res.status(500).json({ message: "Error actualitzant cicle" });
    }
});

// DELETE /api/cicles/:id -> eliminar
router.delete("/:id", async (req, res) => {
    try {
        const id = req.params.id;

        const deleted = await Cicle.query().deleteById(id);
        if (!deleted) return res.status(404).json({ message: "Cicle no trobat" });

        return res.json({ message: "Cicle eliminat" });
    } catch (err: any) {
        console.error(err);
        // si tiene cursos asociados, FK RESTRICT -> constraint
        if (err?.code === "SQLITE_CONSTRAINT" || err?.errno === 19) {
            return res.status(409).json({ message: "No es pot eliminar: té cursos associats" });
        }
        return res.status(500).json({ message: "Error esborrant cicle" });
    }
});

export default router;