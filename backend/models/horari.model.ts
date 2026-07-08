import { Model } from "objection";
import Franja_horaria from "./franja_horaria.model";
import Modul from "./modul.model";
import Grup from "./grup.model";

export default class Horari extends Model {
    static get tableName() {
        return 'horaris'
    }

    static get idColumn() {
        return 'id_horari'
    }

    id_horari!: number
    dia!:string
    modul_id!:string
    franja_id!:number
    grup_id!:string

    static get relationMappings() {
        return {
            modul: {
                relation: Model.BelongsToOneRelation,
                modelClass: () => Modul,
                join: {
                    from: 'horaris.modul_id',
                    to: 'moduls.id_modul',
                }
            },
            franja: {
                relation: Model.BelongsToOneRelation,
                modelClass: () => Franja_horaria,
                join: {
                    from: 'horaris.franja_id',
                    to: 'franges_horaries.id_franja',
                }
            },
            grup: {
                relation: Model.BelongsToOneRelation,
                modelClass: () => Grup,
                join: {
                    from: 'horaris.grup_id',
                    to: 'grups.id_grup',
                }
            },
        };
    }
    static get jsonSchema() {
        return {
            type: "object",
            required: ["dia", "modul_id", "franja_id", "grup_id"],

            properties: {
                id_horari: { type: "integer" },
                dia: { type: "string", enum: ["dilluns","dimarts","dimecres","dijous","divendres","disabte","diumenge"] },
                modul_id: { type: "string", minLength: 1 },
                franja_id: { type: "integer", minimum: 0 },
                grup_id: { type: "string", minLength: 1 },
            },
        };
    }
}