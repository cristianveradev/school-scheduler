import { Router } from "express";
import Franja from "../models/franja_horaria.model";

const router = Router();

router.get("/", async (_req, res) => {
    res.json({ message: "Hola desde les franges horaries!" });
});

router.post("/new", async (req, res) => {
    try {
        const { id_franja, hora_inici, hora_fi, hora_inici_min, hora_fi_min, torn_franja } = req.body as {
            id_franja?: number;
            hora_inici?: string;
            hora_fi?: string;
            hora_inici_min?: number;
            hora_fi_min?: number;
            torn_franja?: string;
        };

        // importante: permitir 0
        if (
            id_franja == null || hora_inici == null || hora_fi == null ||
            hora_inici_min == null || hora_fi_min == null || torn_franja == null
        ) {
            return res.status(400).json({ message: "Falten dades" });
        }

        // inicio < fin
        if (hora_inici_min >= hora_fi_min) {
            return res.status(400).json({ message: "La franja ha de tenir inici < fi" });
        }

        // comprobar solape
        const overlap = await Franja.query()
            .where("hora_inici_min", "<", hora_fi_min)
            .where("hora_fi_min", ">", hora_inici_min)
            .first();

        if (overlap) {
            return res.status(409).json({ message: "La franja se solapa con otra existente" });
        }

        const created = await Franja.query().insertAndFetch({
            id_franja,
            hora_inici,
            hora_fi,
            hora_inici_min,
            hora_fi_min,
            torn_franja,
        });

        return res.status(201).json(created);
    } catch (err: any) {
        // Si el trigger salta, también llegará aquí (por si se coló algo)
        console.error(err);
        return res.status(500).json({ message: "Error intern" });
    }
});

router.get("/creadas", async (_req, res) => {
    try {
        const franjas = await Franja.query()
            .select("id_franja", "hora_inici", "hora_fi", "torn_franja")
            .orderBy("id_franja", "asc");

        return res.json(franjas);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error intern" });
    }
});

// GET /franges/torn/mati  o  /franges/torn/tarda
router.get("/torn/:torn", async (req, res) => {
    try {
        const { torn } = req.params as { torn: string };

        if (!["mati", "tarda"].includes(torn)) {
            return res.status(400).json({ message: "Torn inválid" });
        }

        const franjas = await Franja.query()
            .select("id_franja", "hora_inici", "hora_fi", "torn_franja")
            .where("torn_franja", torn)
            .orderBy("id_franja", "asc");

        return res.json(franjas);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error intern" });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const { hora_inici, hora_fi, hora_inici_min, hora_fi_min, torn_franja } = req.body;

        if (!hora_inici || !hora_fi || hora_inici_min == null || hora_fi_min == null || !torn_franja) {
            return res.status(400).json({ message: "Falten dades" });
        }

        if (hora_inici_min >= hora_fi_min) {
            return res.status(400).json({ message: "La franja ha de tenir inici < fi" });
        }

        // Aquí podríamos añadir la comprobación de solapamiento (overlap) excluyendo la propia franja actual
        const overlap = await Franja.query()
            .where("hora_inici_min", "<", hora_fi_min)
            .where("hora_fi_min", ">", hora_inici_min)
            .whereNot("id_franja", id) // Excluimos la franja que estamos editando
            .first();

        if (overlap) {
            return res.status(409).json({ message: "La franja se solapa con otra existente" });
        }

        const updated = await Franja.query().patchAndFetchById(id, {
            hora_inici,
            hora_fi,
            hora_inici_min,
            hora_fi_min,
            torn_franja
        });

        if (!updated) return res.status(404).json({ message: "Franja no trobada" });
        return res.json(updated);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error intern al actualitzar" });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const deleted = await Franja.query().deleteById(id);
        
        if (!deleted) return res.status(404).json({ message: "Franja no trobada" });
        return res.json({ message: "Franja eliminada" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error intern al eliminar" });
    }
});

export default router;