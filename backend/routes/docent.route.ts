import express from "express";
import Docent from "../models/docent.model";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();
export default router;

const uploadDir = path.join(__dirname, "../../uploads/uploadsDocents");

//Crear carpeta si no existeix
if(!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

router.get("/", async(_req, res) => {
    try {
        const docents = await Docent.query().select("id_docent", "nom_sense", "avatar");
        res.json(docents);
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: "Error carregant docents"});
    }
});

//GET /api/docents Retorna la llista de docents
//GET /api/docents/all
router.get("/all", async (_req, res) => {
    try {
        const docents = await Docent.query().select("id_docent", "nom_sense", "avatar"); //Retorna array
        res.json(docents);
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: "Error carregat docents" });
    }
});

//GET /api/docents/:id Retorna un docent per id
router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);
    if(!Number.isFinite(id)) return res.status(400).json({ message: "ID inválid" });

    try {
        const docent = await Docent.query().select("id_docent", "nom_sense", "avatar").findById(id);
        if (!docent) return res.sendStatus(404);
        res.json(docent);
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: "Error servidor" });
    }
});

//POST /api/docents Crear un nou docent
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/uploadsDocents");
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + path.extname(file.originalname);
        cb(null, unique);
    }
});

const upload = multer({ dest: "uploads/uploadsDocents/" });

router.post("/", (req, res, next) => {
    upload.single("avatar")(req, res, (err: any) => {
        if(err) {
            console.error("MULTER ERROR:", err);
            return res.status(500).json({ message: "Error multer" });
        }
        next();
    });
}, async(req, res) => {
    try {
        console.log("BODY:", req.body);
        console.log("FILE:", req.file);

        const { nom_sense } = req.body;

        if(!nom_sense) {
            return res.status(400).json({ message: "Falten dades" });
        }

        const newDocent = await Docent.query().insert({
            nom_sense,
            avatar: null
        });

        let filename: string | null = null;

        if(req.file) {
            const ext = path.extname(req.file.originalname);
            filename = `docent${newDocent.id_docent}${ext}`;

            const newPath = path.join(uploadDir, filename);

            try {
                fs.renameSync(req.file.path, newPath);
            } catch(err) {
                console.error("Error moviendo archivo:", err);
            }

            await Docent.query()
                .patch({ avatar: filename })
                .where("id_docent", newDocent.id_docent);
        }

        return res.status(201).json({
            ...newDocent,
            avatar: filename
        });

    } catch(err) {
        console.error("ERROR GENERAL:", err);
        return res.status(500).json({ message: "Error creant docent" });
    }
});

//PUT /api/docents/:id Editar un docent
router.put("/:id", (req, res, next) => {
    upload.single("avatar")(req, res, (err: any) => {
        if(err) {
            console.error("MULTER ERROR:", err);
            return res.status(500).json({ message: "Error multer" });
        }
        next();
    });
}, async(req, res) => {
    const id = Number(req.params.id);
    if(!Number.isFinite(id)) return res.status(400).json({ message: "ID inválid" });

    try {
        console.log("BODY:", req.body);
        console.log("FILE:", req.file);

        const { nom_sense } = req.body;
        if(!nom_sense) return res.status(400).json({ message: "Falta nom_sense" });

        let filename: string | null = null;

        //Si puyan imatges
        if(req.file) {
            const ext = path.extname(req.file.originalname);
            filename = `docent${id}${ext}`;
            const newPath = path.join(uploadDir, filename);

            //Borrar avatar anterior si existeix
            const existing = await Docent.query().findById(id);
            if(existing?.avatar) {
                const oldPath = path.join(uploadDir, existing.avatar);
                if(fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

            //Moure nou archiu
            try {
                fs.renameSync(req.file.path, newPath);
            } catch(err) {
                console.error("Error movent archiu:", err);
            }
        }

        //Actualitzar DB
        const updated = await Docent.query()
            .findById(id)
            .patch({
                nom_sense,
                ...(filename ? { avatar: filename } : {})
            })
            .returning(["id_docent", "nom_sense", "avatar"]);

        if(!updated) return res.sendStatus(404);

        res.json(updated);

    } catch(err) {
        console.error("ERROR GENERAL:", err);
        res.status(500).json({ message: "Error editant docent" });
    }
});

//DELETE /api/docents/:id Elimina un docent
router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);
    if(!Number.isFinite(id)) return res.status(400).json({ message: "ID inválid" });

    try {
        const deleted = await Docent.query().deleteById(id);
        if(!deleted) return res.sendStatus(404);
        res.sendStatus(204);
    } catch(err) {
        console.error("Error borrando docente:", err);
        res.status(500).json({ message: "Error servidor" });
    }
});