import { Model } from "objection";
import Cicle from "./cicle.model";
import Grup from "./grup.model";
import Modul from "./modul.model";

export default class Curs extends Model {
    static get tableName () : string{
        return 'cursos'
    }
    static get idColumn() : string{
        return 'id_curs'
    }

    id_curs!: string
    nivell!: number
    cicle_id!: string

    cicle?: Cicle;
    grups?: Grup[];

    static get relationMappings() {
        return {
            cicle: {
                relation: Model.BelongsToOneRelation,
                modelClass: () => Cicle,
                join: {
                    from: 'cursos.cicle_id',
                    to: 'cicles.id_cicle',
                }
            },
            grups: {
                relation: Model.HasManyRelation,
                modelClass: () => Grup,
                join: {
                    from: "cursos.id_curs",
                    to: "grups.curs_id",
                },
            },
            moduls: {
            relation: Model.HasManyRelation,
            modelClass: () => Modul,
            join: {
                from: "cursos.id_curs",
                to: "moduls.curs_id",
            },
        },
        };
    }
    static get jsonSchema() {
        return {
            type: "object",
            required: ["id_curs", "nivell", "cicle_id"],

            properties: {
                id_curs: { type: "string", minLength: 1 },
                nivell: { type: "integer", minimum: 1 },
                cicle_id: { type: "string", minLength: 1 }
            }
        };
    }
}