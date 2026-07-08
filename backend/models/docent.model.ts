import { Model } from "objection";
import Imparteix from "./imparteix.model";

export default class Docent extends Model {
    static get tableName() {
        return "docents";
    }

    static get idColumn() {
        return "id_docent";
    }

    id_docent!: number;
    nom_sense!: string;
    avatar?: string | null;

    static get relationMappings() {
        return {
            imparteix: {
                relation: Model.HasManyRelation,
                modelClass: () => Imparteix,
                join: {
                from: "docents.id_docent",
                to: "imparteix.docent_id",
                },
            },
        };
    }

    static get jsonSchema() {
        return {
            type: "object",
            required: ["nom_sense"],
            properties: {
                id_docent: { type: "integer" },
                nom_sense: { type: "string", minLength: 1, maxLength: 100 },
                avatar: { type: ["string", "null"], minLength: 1, maxLength: 255 },
            },
        };
    }
}