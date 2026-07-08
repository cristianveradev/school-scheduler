import { Router } from "express";
import Imparteix from "../models/imparteix.model";

const router = Router();

router.get('/', async (_req, res) => {
    try {
        const asignaciones = await Imparteix.query()
        .withGraphFetched("[docent, modul, grup]") // Trae los datos relacionados
        .orderBy(["docent_id", "modul_id"]);

        return res.json(asignaciones);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error intern del servidor" });
    }
});

router.get('/docent/:docent_id', async (req, res) => {
    try {
        const { docent_id } = req.params;
        const asignaciones = await Imparteix.query()
        .where("docent_id", docent_id)
        .withGraphFetched("[modul, grup]");

        return res.json(asignaciones)
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error intern del servidor" });
    }
})

router.post('/new', async (req, res) => {
    try {
        const { docent_id, modul_id, grup_id, hores_asignades } = req.body;

        if (!docent_id || !modul_id || !grup_id) {
            return res.status(400)
            .json({ message: 'Falten dades obligatòries' })
        }

        // CAMBIO AQUÍ: Usamos insert() en lugar de insertAndFetch()
        const created = await Imparteix.query().insert({
            docent_id: Number(docent_id), 
            modul_id: modul_id,
            grup_id: grup_id,    
            hores_asignades: Number(hores_asignades) || 0
        });

        return res.status(201).json(created);
        
    } catch (err: any) {
        // Captura el error de la primary key duplicada
        if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(409)
            .json({ message: "Aquesta assignació ja existeix" });
        }

        console.error("Error exacto en el backend:", err); 
        return res.status(500).json({ message: "Error intern al crear l'assignació" });
    }
});

router.delete('/:docent_id/:modul_id/:grup_id', async (req, res) => {
    try {
        const { docent_id, modul_id, grup_id } = req.params;

        const deleted = await Imparteix.query()
        .deleteById([docent_id, modul_id, grup_id]);

        if (!deleted) {
            return res.status(404).json({ message: "No s'ha trobat l'assignació" });
        }

        return res.json({ message: "Assignació eliminada correctament" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error intern al eliminar l'assignació" });
    }
});

router.put("/:docent_id/:modul_id/:grup_id", async (req, res) => {
    try {
        const { docent_id, modul_id, grup_id } = req.params;
        const { hores_asignades } = req.body;

        if (hores_asignades === undefined) {
            return res.status(400).json({ message: "Has d'indicar les hores assignades" });
        }

        // Con Objection.js, actualizamos usando un where múltiple
        const updatedCount = await Imparteix.query()
            .patch({ hores_asignades })
            .where({ docent_id, modul_id, grup_id });

        if (updatedCount === 0) {
            return res.status(404).json({ message: "Assignació no trobada" });
        }
        
        return res.json({ message: "Hores actualitzades correctament" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error intern al actualitzar" });
    }
});

export default router;