import { Model } from "objection";

type Permis = "superadmin" | "admin" | "ver";

export default class Usuari extends Model {
    static get tableName() {
        return "usuaris";
    }

    static get idColumn() {
        return "id_usuari";
    }

    id_usuari!: number;
    usuari!: string;
    password!: string;
    permisos!: Permis;
    email?: string | null;
    avatar?: string | null;

    static get jsonSchema() {
        return {
        type: "object",
        required: ["usuari", "password", "permisos"],
        properties: {
            id_usuari: { type: "integer" }, // no required (autoincrement)
            usuari: { type: "string", minLength: 3, maxLength: 50 },
            password: { type: "string", minLength: 6 },
            permisos: { type: "string", enum: ["superadmin", "admin", "ver"] },
            email: { type: ["string", "null"] },
            avatar: { type: ["string", "null"] }
        },
        };
    }
}