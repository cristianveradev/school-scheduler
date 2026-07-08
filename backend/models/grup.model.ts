import { Model } from "objection";
import Curs from "./curs.model";
import Imparteix from "./imparteix.model";
import Franja_horaria from "./franja_horaria.model";

export default class Grup extends Model {
    static get tableName () : string{
        return 'grups'
    }
    static get idColumn() : string{
        return 'id_grup'
    }

    id_grup!: string
    grup!: string
    aula!: string
    torn_horari!:string
    curs_id!: string

    franja?: Franja_horaria[];

    static get relationMappings() {
        return {
            curs: {
                relation: Model.BelongsToOneRelation,
                modelClass: () => Curs,
                join: {
                    from: 'grups.curs_id',
                    to: 'cursos.id_curs',
                }
            },
            imparteix: {
                relation: Model.HasManyRelation,
                modelClass: () => Imparteix,
                join: {
                    from: 'grups.id_grup',
                    to: 'imparteix.grup_id',
                }
            },
        };
    }
    static get jsonSchema() {
        return {
            type: "object",
            required: ["id_grup", "grup", "aula", "torn_horari", "curs_id"],

            properties: {
                id_grup: { type: "string", minLength: 1 },
                grup: { type: "string", minLength: 1 },
                aula: { type: "string", minLength: 1 },
                torn_horari: { type: "string", enum: ["mati", "tarda"] },
                curs_id: { type: "string", minLength: 1 }
            }
        };
    }
}