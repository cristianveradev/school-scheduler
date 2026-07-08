import { Model } from "objection";
import Departament from "./departament.model";
import Curs from "./curs.model";

export default class Cicle extends Model {
    static get tableName() {
        return 'cicles'
    }

    static get idColumn() {
        return 'id_cicle'
    }

    id_cicle!: string
    nom_cicle!:string
    departament_id!:string

    static get relationMappings() {
        return {
            departament: {
                relation: Model.BelongsToOneRelation,
                modelClass: () => Departament,
                join: {
                    from: 'cicles.departament_id',
                    to: 'departaments.id_departament',
                }
            },
            cursos: {
                relation: Model.HasManyRelation,
                modelClass: () => Curs,
                join: {
                    from: "cicles.id_cicle",
                    to: "cursos.cicle_id",
                },
            },
        };
    }
    static get jsonSchema() {
        return {
            type: "object",
            required: ["id_cicle", "nom_cicle", "departament_id"],

            properties: {
                id_cicle: { type: "string", minLength: 1 },
                nom_cicle: { type: "string", minLength: 1 },
                departament_id: { type: "string", minLength: 1 }
            }
        };
    }
}