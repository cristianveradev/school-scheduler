import { Model } from "objection";
import Docent from "./docent.model";
import Modul from "./modul.model";
import Grup from "./grup.model";

export default class Imparteix extends Model {
    static get tableName() {
        return "imparteix";
    }

    // PK compuesta
    static get idColumn() {
        return ["docent_id", "modul_id", "grup_id"];
    }

    docent_id!: number;
    modul_id!: string;
    grup_id!: string;
    hores_asignades!: number;

    // Con este modelo podemos hacer cosas tipo: 
    // await Docent.query().withGraphFetched("imparteix.[modul,grup]");
    // y obtener qué imparte cada profesor y a quien.
    static get relationMappings() {
        return {
            docent: {
                relation: Model.BelongsToOneRelation,
                modelClass: () => Docent,
                join: {
                from: "imparteix.docent_id",
                to: "docents.id_docent",
                },
            },
            modul: {
                relation: Model.BelongsToOneRelation,
                modelClass: () => Modul,
                join: {
                from: "imparteix.modul_id",
                to: "moduls.id_modul",
                },
            },
            grup: {
                relation: Model.BelongsToOneRelation,
                modelClass: () => Grup,
                join: {
                from: "imparteix.grup_id",
                to: "grups.id_grup",
                },
            },
        };
    }

    static get jsonSchema() {
        return {
            type: "object",
            required: ["docent_id", "modul_id", "grup_id"],
            properties: {
                docent_id: { type: "integer" },
                modul_id: { type: "string", minLength: 1 },
                grup_id: { type: "string", minLength: 1 },
                hores_asignades: { type: "integer", minimum: 0 },
            },
        };
    }
}