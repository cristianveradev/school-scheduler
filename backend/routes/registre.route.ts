import { Router } from "express";
import Usuari from "../models/usuari.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({ dest: "uploads/tmp" });

const uploadDir = path.join(__dirname, "..", "..", "uploads", "uploadsUsuaris");
type Permis = "superadmin" | "admin" | "ver";

if(!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}

router.get("/", async (req, res) => {
    res.json({ message: "Hola desde el registre!" });
});

// Crear usuari
router.post("/", upload.single("avatar"), async (req, res) => {
    try {
        const actor = req.user; // viene del middleware
        if (!actor) return res.sendStatus(401);

        const { usuari, password, permisos,  email } = req.body as {
            usuari?: string;
            password?: string;
            permisos?: Permis;
            email?: string | null;
        };

        if (!usuari || !password || !permisos) {
            return res.status(400).json({ message: "Falten dades" });
        }

        // Nadie crea superadmins desde aquí
        if (permisos === "superadmin") {
            return res.status(403).json({ message: "No es pot crear un superadmin" });
        }

        // Reglas:
        // superadmin -> puede crear admin o ver
        // admin -> solo ver
        if (actor.permisos === "admin" && permisos !== "ver") {
            return res.status(403).json({ message: "Un admin només pot crear usuaris de tipus 'ver'" });
        }

        if (actor.permisos === "ver") {
            return res.status(403).json({ message: "No tens permisos per crear usuaris" });
        }

        const existeix = await Usuari.query().findOne({ usuari });
        if (existeix) {
            return res.status(409).json({ message: "Aquest usuari ja esta registrat!" });
        }

        const hashPass = await bcrypt.hash(password, 10);

        const created = await Usuari.query().insertAndFetch({
            usuari,
            email: email,
            avatar: null,
            password: hashPass,
            permisos,
        });

        let filename: string | null = null;
        
        if(req.file) {
            const ext = path.extname(req.file.originalname);
            filename = `usuari${created.id_usuari}${ext}`;

            const newPath = path.join(uploadDir, filename);
            fs.renameSync(req.file.path, newPath);

            await Usuari.query()
                .patch({ avatar: filename })
                .where("id_usuari", created.id_usuari);
        }

        // aquí NO se devuelve token (porque lo crea un admin/superadmin)
        return res.status(201).json({
            user: { 
                id_usuari: created.id_usuari,
                usuari: created.usuari, 
                email: created.email,
                avatar: filename,
                permisos: created.permisos
            },
        });
    } catch (error) {
        console.error("Error al crear l'usuari:",error);
        return res.status(500).json({ message: "Error intern" });
    }
});

//Editar usuario
router.put("/:id", upload.single("avatar"), async (req, res) => {
    try {
        const actor = req.user; // viene del middleware
        if (!actor) return res.sendStatus(401);

        const userId = Number(req.params.id);
        if(!Number.isFinite(userId))
            return res.status(400).json({ message: "ID inválid" });

        const { usuari, permisos, email } = req.body as {
            usuari?: string;
            permisos?: Permis;
            email?: string | null;
        };

        if (!usuari || !permisos) {
            return res.status(400).json({ message: "Falten dades" });
        }
        const existeix = await Usuari.query().findById(userId);
        if (!existeix) {
            return res.status(409).json({ message: "Usuari no trobat!" });
        }
        // Nadie edita superadmins desde aquí
        if (existeix.permisos === "superadmin") {
            return res.status(403).json({ message: "No es pot editar un superadmin" });
        }
        // Reglas:
        // superadmin -> puede editar admin o ver
        // admin -> solo ver
        if (actor.permisos === "admin" && existeix.permisos !== "ver") {
            return res.status(403).json({ message: "Un admin només pot editar usuaris de tipus 'ver'" });
        }

        if (actor.permisos === "ver") {
            return res.status(403).json({ message: "No tens permisos per editar usuaris" });
        }

        let avatar = null;

        if(req.file) {
            const ext = path.extname(req.file.originalname);
            avatar = `usuari${userId}${ext}`;

            const newPath = path.join(uploadDir, avatar);
            fs.renameSync(req.file.path, newPath);
        }

        const patchData: any = { usuari, permisos,  email };
        if(avatar) patchData.avatar = avatar;

        const updated = await Usuari.query()
            .findById(userId)
            .patch(patchData)
            .returning(["id_usuari", "usuari", "permisos", "email", "avatar"]);

        if(!updated) return res.sendStatus(404);

        res.json(updated);

    } catch(err) {
        console.error("Error editand l'usuari:", err);
        res.status(500).json({ message: "Error servidor" });
    }
});

//Borrar usuario
router.delete("/:id", async (req, res) => {
    try {
        const actor = req.user; // viene del middleware
        if (!actor) return res.sendStatus(401);

        const userId = Number(req.params.id);
        if(!Number.isFinite(userId)) return res.status(400).json({ message: "ID inválid" });

        const user = await Usuari.query().findById(userId);
        if(!user) return res.sendStatus(404).json({ message: "Usuari no trobat" });

        // Nadie elimina superadmins desde aquí
        if (user.permisos === "superadmin") {
            return res.status(403).json({ message: "No es pot eliminar un superadmin" });
        }
        // Reglas:
        // superadmin -> puede eliminar admin o ver
        // admin -> solo ver
        if (actor.permisos === "admin" && user.permisos !== "ver") {
            return res.status(403).json({ message: "Un admin només pot eliminar usuaris de tipus 'ver'" });
        }

        if (actor.permisos === "ver") {
            return res.status(403).json({ message: "No tens permisos per eliminar usuaris" });
        }

        const deleted = await Usuari.query().deleteById(userId);

        if(!deleted) return res.sendStatus(404).json({ message: "Usuari no trobat" });
        return res.json({ message: "Usuari eliminat" });
    } catch(err) {
        console.error("Error esborrand l'usuari:", err);
        res.status(500).json({ message: "Error servidor" });
    }
});


export default router;