import express from "express";
import Grup from "../models/grup.model";
import Franja_horaria from "../models/franja_horaria.model";
import Horari from "../models/horari.model";

const router = express.Router();

/** GET /api/calendari/:id -> uno */
router.get("/:id", async (req, res) => {
    try {
        const id = req.params.id;

        const grup = await Grup.query()
            .findById(id)
            .withGraphFetched("imparteix.[docent,modul]");

        if (!grup) return res.status(404).json({ message: "Grup no trobat" });

        const franges = await Franja_horaria.query()
            .where("torn_franja", grup.torn_horari)
            .orderBy("hora_inici_min", "asc");

        const horaris = await Horari.query()
            .where("grup_id", id)
            .withGraphFetched("modul")
            .orderBy("dia", "asc")
            .orderBy("franja_id", "asc");

        const resposta = {
            ...grup.toJSON(),
            franja: franges,
            horari: horaris,
        };

        return res.json(resposta);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error obtenint les dades del grup" });
    }
});

export default router;