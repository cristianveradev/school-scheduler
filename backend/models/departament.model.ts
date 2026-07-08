import { Model } from "objection";
import Cicle from "./cicle.model";

export default class Departament extends Model {
    static get tableName() {
        return 'departaments'
    }

    static get idColumn() {
        return 'id_departament'
    }

    id_departament!: string
    nom_departament!:string

    static get relationMappings() {
        return {
            cicles: {
                relation: Model.HasManyRelation,
                modelClass: () => Cicle,
                join: {
                    from: "departaments.id_departament",
                    to: "cicles.departament_id",
                },
            },
        };
    }
    static get jsonSchema() {
        return {
            type: "object",
            required: ["id_departament", "nom_departament"],

            properties: {
                id_departament: { type: "string", minLength: 1 },
                nom_departament: { type: "string", minLength: 1 }
            }
        };
    }
}