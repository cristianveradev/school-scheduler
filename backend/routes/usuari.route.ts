import express from "express";
import Usuari from "../models/usuari.model";

const router = express.Router();

// GET /api/usuari/all
router.get("/all", async (_req, res) => {
    try {
        const users = await Usuari.query().select("id_usuari", "usuari", "permisos", "avatar");
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error cargando usuarios" });
    }
});

// Devuelve el usuario del token (mi perfil)
router.get("/", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const user = await Usuari.query()
        .select("id_usuari", "usuari", "permisos", "avatar")
        .findById(req.user.idUsuari);

    if (!user) return res.sendStatus(404);

    return res.json(user);
});

// Devuelve un usuario por id (si lo queréis permitir)
router.get("/:id", async (req, res) => {
    const userId = Number(req.params.id);
    if(!Number.isFinite(userId)) {
        return res.status(400).json({ message: "ID inválid" });
    }

    const user = await Usuari.query()
        .select("id_usuari", "usuari", "permisos", "avatar")
        .findById(userId);

    if(!user) return res.sendStatus(404);

    return res.json(user);
});

export default router;