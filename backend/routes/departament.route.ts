import express from "express";
import Departament from "../models/departament.model";

const router = express.Router();

// GET todos
router.get("/", async (_req, res) => {
    try {
        const departamentos = await Departament.query().select("id_departament", "nom_departament");
        return res.json(departamentos);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error obtenint departaments" });
    }
});

// GET por id
router.get("/:id", async (req, res) => {
    try {
        const departamentId = req.params.id;

        const departament = await Departament.query()
        .select("id_departament", "nom_departament")
        .findById(departamentId);

        if (!departament) return res.status(404).json({ message: "Departament no trobat" });

        return res.json(departament);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error obtenint departament" });
    }
});

// POST crear
router.post("/", async (req, res) => {
    try {
        const { id_departament, nom_departament } = req.body as {
            id_departament?: string;
            nom_departament?: string;
        };

        if (!id_departament || !nom_departament) {
            return res.status(400).json({ message: "Falten camps" });
        }

        const nou = await Departament.query().insert({
            id_departament: id_departament.trim(),
            nom_departament: nom_departament.trim(),
        });

        return res.status(201).json(nou);
    } catch (err: any) {
        console.error(err);
        if (err?.code === "SQLITE_CONSTRAINT" || err?.errno === 19) {
            return res.status(409).json({ message: "ID ja existent" });
        }
        return res.status(500).json({ message: "Error creant departament" });
    }
});

// DELETE eliminar
router.delete("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const deleted = await Departament.query().deleteById(id);

        if (!deleted) return res.status(404).json({ message: "Departament no trobat" });

        return res.json({ message: "Departament eliminat" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error esborrant departament" });
    }
});

// PUT editar (solo nombre)
router.put("/:id", async (req, res) => {
    try {
        const currentId = req.params.id;
        const { id_departament, nom_departament } = req.body as {
            id_departament?: string;
            nom_departament?: string;
        };

        if (!nom_departament) {
            return res.status(400).json({ message: "Falta el nom del departament" });
        }

        const exists = await Departament.query().findById(currentId);
        if (!exists) return res.status(404).json({ message: "Departament no trobat" });

        // Caso 1: solo cambia el nombre
        if (!id_departament || id_departament === currentId) {
            const updated = await Departament.query().patchAndFetchById(currentId, { nom_departament });
            return res.json(updated);
        }

        // Caso 2: cambia el ID (PK) y el nombre
        // 1) comprobar que el nuevo id no exista
        const already = await Departament.query().findById(id_departament);
        if (already) return res.status(409).json({ message: "El nou ID ja existeix" });

        // 2) update PK + nombre (en SQLite puede hacerse con patch where)
        await Departament.query()
        .patch({ id_departament, nom_departament })
        .where("id_departament", currentId);

        // 3) devolver el actualizado
        const updated = await Departament.query().findById(id_departament);
        return res.json(updated);
    } catch (err: any) {
        console.error(err);
        if (err?.code === "SQLITE_CONSTRAINT" || err?.errno === 19) {
            return res.status(409).json({ message: "Conflicte actualitzant departament" });
        }
        return res.status(500).json({ message: "Error actualitzant departament" });
    }
});

export default router;