import { Model } from "objection";
import Curs from "./curs.model";
import Horari from "./horari.model";
import Imparteix from "./imparteix.model";

export default class Modul extends Model {
    static get tableName () : string{
        return 'moduls'
    }
    static get idColumn() : string{
        return 'id_modul'
    }

    id_modul!: string
    nom_modul!: string
    hores_setmana!: number
    color!: string;
    curs_id!: string

    static get relationMappings() {
        return {
            curs: {
                relation: Model.BelongsToOneRelation,
                modelClass: () => Curs,
                join: {
                    from: 'moduls.curs_id',
                    to: 'cursos.id_curs',
                }
            },
            horaris: {
                relation: Model.HasManyRelation,
                modelClass: () => Horari,
                join: {
                    from: "moduls.id_modul",
                    to: "horaris.modul_id",
                },
            },
            imparteix: {
                            relation: Model.HasManyRelation,
                            modelClass: () => Imparteix,
                            join: {
                                from: 'moduls.id_modul',
                                to: 'imparteix.modul_id',
                            }
                        },
        };
    }
    static get jsonSchema() {
        return {
            type: "object",
            required: ["id_modul", "nom_modul", "hores_setmana", "color", "curs_id"],

            properties: {
                id_modul: { type: "string", minLength: 1 },
                nom_modul: { type: "string", minLength: 1 },
                hores_setmana: { type: "number", minimum: 0 },
                color: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                curs_id: { type: "string", minLength: 1 },
            },
        };
    }
}