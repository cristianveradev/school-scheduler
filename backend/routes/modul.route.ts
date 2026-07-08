// backend/routes/modul.route.ts
import express from "express";
import Modul from "../models/modul.model";
import Curs from "../models/curs.model";

const router = express.Router();

async function getDepartamentIdFromCurs(cursId: string): Promise<string | null> {
    const curs = await Curs.query()
        .findById(cursId)
        .withGraphFetched("cicle");

    return curs?.cicle?.departament_id ?? null;
}

async function existsColorInSameDepartament(
    color: string,
    cursId: string,
    excludeModulId?: string
): Promise<boolean> {
    const departamentId = await getDepartamentIdFromCurs(cursId);
    if (!departamentId) return false;

    const query = Modul.query()
        .alias("m")
        .join("cursos as cu", "m.curs_id", "cu.id_curs")
        .join("cicles as ci", "cu.cicle_id", "ci.id_cicle")
        .where("ci.departament_id", departamentId)
        .andWhere("m.color", color);

    if (excludeModulId) {
        query.whereNot("m.id_modul", excludeModulId);
    }

    const found = await query.select("m.id_modul").first();
    return !!found;
}

/** GET /api/moduls/curs/:cursId -> Retorna mòduls d'un curs (per al select i llistat) */
router.get("/curs/:cursId", async (req, res) => {
    try {
        const cursId = req.params.cursId;

        const moduls = await Modul.query()
            .select("id_modul", "nom_modul", "hores_setmana", "color", "curs_id")
            .where("curs_id", cursId)
            .orderBy("id_modul", "asc");

        return res.json(moduls);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error obtenint mòduls del curs" });
    }
});

/** GET /api/moduls -> Tots els mòduls */
router.get("/", async (_req, res) => {
    try {
        const moduls = await Modul.query()
            .select("id_modul", "nom_modul", "hores_setmana", "color", "curs_id")
            .orderBy("id_modul", "asc");

        return res.json(moduls);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error obtenint mòduls" });
    }
});

/** GET /api/moduls/:id -> Un mòdul */
router.get("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const modul = await Modul.query().findById(id);

        if (!modul) return res.status(404).json({ message: "Mòdul no trobat" });
        return res.json(modul);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error obtenint mòdul" });
    }
});

/** POST /api/moduls -> Crear mòdul */
router.post("/", async (req, res) => {
    try {
        const { id_modul, nom_modul, hores_setmana, color, curs_id } = req.body;

        if (!id_modul || !nom_modul || hores_setmana == null || !color || !curs_id) {
            return res.status(400).json({ message: "Falten camps" });
        }

        if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
            return res.status(400).json({ message: "Color invàlid. Ha de ser tipus #A1B2C3" });
        }

        const colorOcupat = await existsColorInSameDepartament(color, curs_id);
        if (colorOcupat) {
            return res.status(409).json({
                message: "Ja existeix un altre mòdul amb aquest color dins del mateix departament"
            });
        }

        const created = await Modul.query().insertAndFetch({
            id_modul,
            nom_modul,
            hores_setmana,
            color,
            curs_id,
        });

        return res.status(201).json(created);
    } catch (err: any) {
        console.error(err);
        if (err?.code === "SQLITE_CONSTRAINT" || err?.errno === 19) {
            return res.status(409).json({ message: "Conflicte: ID duplicat o curs inexistent" });
        }
        return res.status(500).json({ message: "Error creant mòdul" });
    }
});

/** PUT /api/moduls/:id -> Editar mòdul */
router.put("/:id", async (req, res) => {
    try {
        const currentId = req.params.id;
        const { id_modul, nom_modul, hores_setmana, color, curs_id } = req.body;

        if (!nom_modul || hores_setmana == null || !color || !curs_id) {
            return res.status(400).json({ message: "Falten camps" });
        }

        if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
            return res.status(400).json({ message: "Color invàlid. Ha de ser tipus #A1B2C3" });
        }

        const exists = await Modul.query().findById(currentId);
        if (!exists) return res.status(404).json({ message: "Mòdul no trobat" });

        const colorOcupat = await existsColorInSameDepartament(color, curs_id, currentId);
        if (colorOcupat) {
            return res.status(409).json({
                message: "Ja existeix un altre mòdul amb aquest color dins del mateix departament"
            });
        }

        if (!id_modul || id_modul === currentId) {
            const updated = await Modul.query().patchAndFetchById(currentId, {
                nom_modul,
                hores_setmana,
                color,
                curs_id,
            });
            return res.json(updated);
        }

        const already = await Modul.query().findById(id_modul);
        if (already) return res.status(409).json({ message: "El nou ID ja existeix" });

        await Modul.query()
            .patch({
                id_modul,
                nom_modul,
                hores_setmana,
                color,
                curs_id,
            })
            .where("id_modul", currentId);

        const updated = await Modul.query().findById(id_modul);
        return res.json(updated);
    } catch (err: any) {
        console.error(err);
        if (err?.code === "SQLITE_CONSTRAINT" || err?.errno === 19) {
            return res.status(409).json({ message: "Conflicte actualitzant mòdul (FK/unique)" });
        }
        return res.status(500).json({ message: "Error actualitzant mòdul" });
    }
});

/** DELETE /api/moduls/:id -> Eliminar mòdul */
router.delete("/:id", async (req, res) => {
    try {
        const id = req.params.id;

        const deleted = await Modul.query().deleteById(id);
        if (!deleted) return res.status(404).json({ message: "Mòdul no trobat" });

        return res.json({ message: "Mòdul eliminat" });
    } catch (err: any) {
        console.error(err);
        if (err?.code === "SQLITE_CONSTRAINT" || err?.errno === 19) {
            return res.status(409).json({ message: "No es pot eliminar: té dades (horaris) associades" });
        }
        return res.status(500).json({ message: "Error esborrant mòdul" });
    }
});

export default router;