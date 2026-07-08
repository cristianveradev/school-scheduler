import { Model } from "objection";
import Horari from "./horari.model";

export default class Franja_horaria extends Model {
    static get tableName() {
        return 'franges_horaries'
    }

    static get idColumn() {
        return 'id_franja'
    }

    id_franja!: number
    hora_inici!: string
    hora_fi!: string
    hora_inici_min!: number
    hora_fi_min!: number
    torn_franja!:string

    static get relationMappings() {
        return {
            horaris: {
                relation: Model.HasManyRelation,
                modelClass: () => Horari,
                join: {
                    from: "franges_horaries.id_franja",
                    to: "horaris.franja_id",
                },
            },
        };
    }
    static get jsonSchema() {
        return {
            type: "object",
            required: ["id_franja", "hora_inici", "hora_fi", "hora_inici_min", "hora_fi_min", "torn_franja"],
            properties: {
                id_franja: { type: "integer", minimum: 0 },
                hora_inici: { type: "string", pattern: "^[0-2]\\d:[0-5]\\d$" },
                hora_fi: { type: "string", pattern: "^[0-2]\\d:[0-5]\\d$" },
                hora_inici_min: { type: "integer", minimum: 0, maximum: 1440 },
                hora_fi_min: { type: "integer", minimum: 0, maximum: 1440 },
                torn_franja: { type: "string", enum: ["mati", "tarda"] },
            },
            allOf: [
                {
                    properties: {
                        hora_inici_min: { type: "integer" },
                        hora_fi_min: { type: "integer" },
                    },
                    required: ["hora_inici_min", "hora_fi_min"],
                }
            ]
        };
    }
}