import path from "path";
import { knex } from "knex";
import { Model } from "objection";
import User from "../models/usuari.model";
import Departament from "../models/departament.model";
import Cicle from "../models/cicle.model";
import Curs from "../models/curs.model";
import Grup from "../models/grup.model";
import Modul from "../models/modul.model";
import Docent from "../models/docent.model";
import Franja_horaria from "../models/franja_horaria.model";
import Imparteix from "../models/imparteix.model";
import Horari from "../models/horari.model";
import bcrypt from "bcryptjs";

class Database {
  db!: knex.Knex;

  async start() {

    const dataDir = path.resolve(__dirname, "..", "..", "data"); // ajusta los ".." según dónde esté este archivo al compilar

    const filename = path.join(dataDir, "db.sqlite");
    console.log("SQLite file:", filename);

    const db = knex({
      client: "sqlite3",
      connection: {
        filename
      },
      useNullAsDefault: true,
    })

    this.db = db;

    // IMPORTANTE en SQLite: activar FKs
    await db.raw("PRAGMA foreign_keys = ON");

    // Vincular Objection con Knex
    Model.knex(db);

    await checkUpdates(db);
  }
}

const db = new Database();
export default db;

async function checkUpdates(db: knex.Knex) {
  const existConfigTable = await db.schema.hasTable("configs");
  console.log("¿Existe tabla configs?", existConfigTable);
  if (!existConfigTable) {
    console.log("Inicializando base de datos...");
    await initialDatabase(db);
    return;
  }
  console.log("Base de datos ya inicializada");
  // Si existe configs pero faltan tablas (por un db corrupto/antiguo), podríais revalidar aquí.
}

async function initialDatabase(db: knex.Knex) {
  /* ORDEN recomendado por dependencias (FKs):
   * departaments -> cicles -> cursos -> grups
   * cursos -> moduls
   * franges_horaries
   * docents, usuaris
   * imparteix (depende de docents, moduls, grups)
   * horaris (depende de moduls, franges, grups)
   * configs al final
   */

  // 1) Departament
  await db.schema.createTable("departaments", (t) => {
    t.string("id_departament").primary(); //String porque sera ej: id="info" con nom="Informàtica"
    t.string("nom_departament").notNullable();
  });

  // 2) Cicle
  await db.schema.createTable("cicles", (t) => {
    t.string("id_cicle").primary(); //String porque sera ej: id="DAW" con nom="Desenvolupament d'Aplicacions Web"
    t.string("nom_cicle").notNullable();

    t.string("departament_id")
      .notNullable()
      .references("id_departament")
      .inTable("departaments")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
  });

  // 3) Curs
  await db.schema.createTable("cursos", (t) => {
    t.string("id_curs").primary(); //String porque sera ej: id="DAW1" con nivell="1"

    // "Nivell"  (1,2...)
    t.integer("nivell").notNullable();

    t.string("cicle_id")
      .notNullable()
      .references("id_cicle")
      .inTable("cicles")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
  });

  // 4) Grup
  await db.schema.createTable("grups", (t) => {
    t.string("id_grup").primary(); //String porque sera ej: id="DAW1B" con grup="B"

    // En el diagrama hay un campo "Grup" (A,B,C...)
    t.string("grup").notNullable();

    // Cada grup tiene un aula asignada (ej: "Aula 256"). No es FK porque el aula no es una entidad aparte, solo un dato del grupo.
    t.string("aula").notNullable();

    // Torn del horario (mati o tarda) para ir acorde a franja horaria
    t.string("torn_horari").notNullable();

    // Relación principal: cada grup pertenece a un curs (1 curs -> 0..n grups)
    t.string("curs_id")
      .notNullable()
      .references("id_curs")
      .inTable("cursos")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");

    // Evitar duplicados tipo "A" repetido en el mismo curso
    t.unique(["curs_id", "grup"]);
  });

  // 5) Modul
  await db.schema.createTable("moduls", (t) => {
    t.string("id_modul").primary();
    t.string("nom_modul").notNullable();
    t.integer("hores_setmana").notNullable();
    t.string("color").notNullable();

    t.string("curs_id")
      .notNullable()
      .references("id_curs")
      .inTable("cursos")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");

  });

  // 6) Franja_horaria
  await db.schema.createTable("franges_horaries", (t) => {
    t.integer("id_franja").primary();

    // En SQLite no hay tipo TIME real: guardamos como string "HH:MM"
    t.string("hora_inici").notNullable();
    t.string("hora_fi").notNullable();

    // Esto son las horas en minutos para poder comprobar que no haya solapes entre las franjas
    t.integer("hora_inici_min").notNullable();
    t.integer("hora_fi_min").notNullable();

    // string para guardar como: "mati" / "tarda".
    t.string("torn_franja").notNullable();

    t.check("hora_inici_min < hora_fi_min");
  });
  // Comprueba que la nueva franja horaria no se solapa con otra ya existente al insertar
  await db.raw(`
    CREATE TRIGGER franges_no_overlap_insert
    BEFORE INSERT ON franges_horaries
    BEGIN
      SELECT CASE
        WHEN EXISTS (
          SELECT 1
          FROM franges_horaries f
          WHERE f.hora_inici_min < NEW.hora_fi_min
            AND NEW.hora_inici_min < f.hora_fi_min
        )
        THEN RAISE(ABORT, 'La franja se solapa con otra existente')
      END;
    END;
  `);
  // Comprueba que la nueva franja horaria no se solapa con otra ya existente al actualizar
  await db.raw(`
    CREATE TRIGGER franges_no_overlap_update
    BEFORE UPDATE ON franges_horaries
    BEGIN
      SELECT CASE
        WHEN EXISTS (
          SELECT 1
          FROM franges_horaries f
          WHERE f.id_franja != NEW.id_franja
            AND f.hora_inici_min < NEW.hora_fi_min
            AND NEW.hora_inici_min < f.hora_fi_min
        )
        THEN RAISE(ABORT, 'La franja se solapa con otra existente')
      END;
    END;
  `);
  // Comprueba que la hora de inicio es menor que la hora de fin
  await db.raw(`
    CREATE TRIGGER franges_valid_interval_insert
    BEFORE INSERT ON franges_horaries
    WHEN NEW.hora_inici_min >= NEW.hora_fi_min
    BEGIN
      SELECT RAISE(ABORT, 'hora_inici_min debe ser menor que hora_fi_min');
    END;
  `);

  // 7) Docent
  await db.schema.createTable("docents", (t) => {
    t.increments("id_docent").primary();
    t.string("nom_sense").notNullable();
    t.string("avatar").nullable();
  });

  // 8) Usuari
  await db.schema.createTable("usuaris", (t) => {
    t.increments("id_usuari").primary();
    t.string("usuari").notNullable().unique();
    t.string("email").nullable().unique();
    t.string("avatar").nullable();
    t.string("password").notNullable(); // ideal: hash
    t.string("permisos").notNullable(); // super admin / admin / solo ver
  });

  // 9) Horari
  await db.schema.createTable("horaris", (t) => {
    t.increments("id_horari").primary();

    // Día: "dilluns"...
    t.string("dia").notNullable();

    t.string("modul_id")
      .notNullable()
      .references("id_modul")
      .inTable("moduls")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");

    t.integer("franja_id")
      .notNullable()
      .references("id_franja")
      .inTable("franges_horaries")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");

    t.string("grup_id")
      .notNullable()
      .references("id_grup")
      .inTable("grups")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    // Evita que un grupo tenga 2 cosas a la vez en el mismo día+franja
    t.unique(["dia", "franja_id", "grup_id"]);
  });

  // 10) Imparteix (tabla puente Docent <-> Modul <-> Grup)
  await db.schema.createTable("imparteix", (t) => {
    t.integer("docent_id")
      .notNullable()
      .references("id_docent")
      .inTable("docents")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    t.string("modul_id")
      .notNullable()
      .references("id_modul")
      .inTable("moduls")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    t.string("grup_id")
      .notNullable()
      .references("id_grup")
      .inTable("grups")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

      t.integer("hores_asignades").notNullable().defaultTo(0);

    // PK compuesta (evita duplicados)
    t.primary(["docent_id", "modul_id", "grup_id"]);
  });

  // 11) Configs (control de versión / init)
  await db.schema.createTable("configs", (t) => {
    t.string("key").primary();
    t.string("value").notNullable();
  });

  await db("configs").insert({
    key: "version",
    value: "0.1",
  });

  // Si queréis seeds mínimos (admin, etc.), se añadirían aquí.
  await insertAll();
}

async function insertUsers() {
  type Permis = "superadmin" | "admin" | "ver";
  const users: Array<{ usuari: string; password: string; permisos: Permis; email: string; avatar?: string}> = [
    { usuari: 'superadmin', password: 'super123', permisos: 'superadmin', email: 'cristian.barbera.92@gmail.com', avatar: 'usuari1.jpg'},
    { usuari: 'superadmin2', password: 'super112', permisos: 'superadmin', email: '23arubio@ibadia.cat', avatar: 'usuari2.jpg'},
    { usuari: 'superadmin3', password: 'super123', permisos: 'superadmin', email: 'super@gmail.com', avatar: 'usuari3.jpg'},
    { usuari: 'admin', password: 'admin123', permisos: 'admin', email: 'admin@gmail.com'},
    { usuari: 'solover', password: 'ver123', permisos: 'ver', email: 'ver@gmail.com' },
  ];
  
  for (const user of users) {
    await User.query().insert({
      usuari: user.usuari,
      password: await bcrypt.hash(user.password, 10),
      permisos: user.permisos,
      email: user.email,
      avatar: user.avatar
    });
  }
}

async function insertDepartaments() {
  const departaments: Array<{ id_departament: string, nom_departament: string }> = [
    { id_departament: "INFO", nom_departament: "Informàtica" },
    { id_departament: "ADE", nom_departament: "Administració i Direcció d'Empreses" },
    { id_departament: "ELEC", nom_departament: "Electricitat i Electrònica" },
    { id_departament: "ENSG", nom_departament: "Ensenyament global" },
  ];
  
  for (const dept of departaments) {
    await Departament.query().insert({
      id_departament: dept.id_departament,
      nom_departament: dept.nom_departament,
    });
  }
}

async function insertCicles() {
  const cicles: Array<{ id_cicle: string, nom_cicle: string, departament_id: string }> = [
    { id_cicle: "DAW", nom_cicle: "Desenvolupament d'Aplicacions Web", departament_id: "INFO" },
    { id_cicle: "DAM", nom_cicle: "Desenvolupament d'Aplicacions Multiplataforma", departament_id: "INFO" },
    { id_cicle: "ASIX", nom_cicle: "Administració de Sistemes Informàtics en Xarxa", departament_id: "INFO" },
    { id_cicle: "AGB0", nom_cicle: "Administració i Finances", departament_id: "ADE" },
    { id_cicle: "AGE0", nom_cicle: "Assistència a la Direcció", departament_id: "ADE" },
    { id_cicle: "IEA", nom_cicle: "GM Instal·lacions Elèctriques i Automàtiques", departament_id: "ELEC" },
    { id_cicle: "SEA", nom_cicle: "GS Sistemes Electrotècnics i Automatitzats", departament_id: "ELEC" },
    { id_cicle: "ARI", nom_cicle: "Automatització i Robòtica Industrial", departament_id: "ELEC" },
    { id_cicle: "EMC", nom_cicle: "Electromedicina Clínica", departament_id: "ELEC" },
    { id_cicle: "ESO", nom_cicle: "Educació secundaria obligatòria", departament_id: "ENSG" },
    { id_cicle: "BAT", nom_cicle: "Batxillerat", departament_id: "ENSG" },
  ];
  
  for (const cicle of cicles) {
    await Cicle.query().insert({
      id_cicle: cicle.id_cicle,
      nom_cicle: cicle.nom_cicle,
      departament_id: cicle.departament_id,
    });
  }
}

async function insertCursos() {
  const cursos: Array<{ id_curs: string, nivell: number, cicle_id: string }> = [
    { id_curs: "DAW1", nivell: 1, cicle_id: "DAW" },
    { id_curs: "DAW2", nivell: 2, cicle_id: "DAW" },
    { id_curs: "DAM1", nivell: 1, cicle_id: "DAM" },
    { id_curs: "DAM2", nivell: 2, cicle_id: "DAM" },
    { id_curs: "ASIX1", nivell: 1, cicle_id: "ASIX" },
    { id_curs: "ASIX2", nivell: 2, cicle_id: "ASIX" },
    { id_curs: "AGB01", nivell: 1, cicle_id: "AGB0" },
    { id_curs: "AGB02", nivell: 2, cicle_id: "AGB0" },
    { id_curs: "AGE01", nivell: 1, cicle_id: "AGE0" },
    { id_curs: "AGE02", nivell: 2, cicle_id: "AGE0" },
    { id_curs: "IEA1", nivell: 1, cicle_id: "IEA" },
    { id_curs: "IEA2", nivell: 2, cicle_id: "IEA" },
    { id_curs: "SEA1", nivell: 1, cicle_id: "SEA" },
    { id_curs: "SEA2", nivell: 2, cicle_id: "SEA" },
    { id_curs: "ARI1", nivell: 1, cicle_id: "ARI" },
    { id_curs: "ARI2", nivell: 2, cicle_id: "ARI" },
    { id_curs: "EMC1", nivell: 1, cicle_id: "EMC" },
    { id_curs: "EMC2", nivell: 2, cicle_id: "EMC" },
    { id_curs: "ESO1", nivell: 1, cicle_id: "ESO" },
    { id_curs: "ESO2", nivell: 2, cicle_id: "ESO" },
    { id_curs: "ESO3", nivell: 3, cicle_id: "ESO" },
    { id_curs: "ESO4", nivell: 4, cicle_id: "ESO" },
    { id_curs: "BAT1", nivell: 1, cicle_id: "BAT" },
    { id_curs: "BAT2", nivell: 2, cicle_id: "BAT" },
  ];
  
  for (const curs of cursos) {
    await Curs.query().insert({
      id_curs: curs.id_curs,
      nivell: curs.nivell,
      cicle_id: curs.cicle_id,
    });
  }
}

async function insertGrups() {
  const grups: Array<{ id_grup: string, grup: string, aula: string, torn_horari: string, curs_id: string }> = [
    { id_grup: "DAW1A", grup: "A", aula: "101", torn_horari: "mati", curs_id: "DAW1" },
    { id_grup: "DAW1B", grup: "B", aula: "101", torn_horari: "tarda", curs_id: "DAW1" },
    { id_grup: "DAW2A", grup: "A", aula: "102", torn_horari: "mati", curs_id: "DAW2" },
    { id_grup: "DAW2B", grup: "B", aula: "102", torn_horari: "tarda", curs_id: "DAW2" },
    { id_grup: "DAM1A", grup: "A", aula: "103", torn_horari: "mati", curs_id: "DAM1" },
    { id_grup: "DAM1B", grup: "B", aula: "103", torn_horari: "tarda", curs_id: "DAM1" },
    { id_grup: "DAM2A", grup: "A", aula: "104", torn_horari: "mati", curs_id: "DAM2" },
    { id_grup: "DAM2B", grup: "B", aula: "104", torn_horari: "tarda", curs_id: "DAM2" },
    { id_grup: "ASIX1A", grup: "A", aula: "105", torn_horari: "mati", curs_id: "ASIX1" },
    { id_grup: "ASIX1B", grup: "B", aula: "105", torn_horari: "tarda", curs_id: "ASIX1" },
    { id_grup: "ASIX2A", grup: "A", aula: "106", torn_horari: "mati", curs_id: "ASIX2" },
    { id_grup: "ASIX2B", grup: "B", aula: "106", torn_horari: "tarda", curs_id: "ASIX2" },
    { id_grup: "AGB01A", grup: "A", aula: "107", torn_horari: "mati", curs_id: "AGB01" },
    { id_grup: "AGB01B", grup: "B", aula: "107", torn_horari: "tarda", curs_id: "AGB01" },
    { id_grup: "AGB02A", grup: "A", aula: "108", torn_horari: "mati", curs_id: "AGB02" },
    { id_grup: "AGB02B", grup: "B", aula: "108", torn_horari: "tarda", curs_id: "AGB02" },
    { id_grup: "AGE01A", grup: "A", aula: "109", torn_horari: "mati", curs_id: "AGE01" },
    { id_grup: "AGE01B", grup: "B", aula: "109", torn_horari: "tarda", curs_id: "AGE01" },
    { id_grup: "AGE02A", grup: "A", aula: "110", torn_horari: "mati", curs_id: "AGE02" },
    { id_grup: "AGE02B", grup: "B", aula: "110", torn_horari: "tarda", curs_id: "AGE02" },
    { id_grup: "IEA1A", grup: "A", aula: "111", torn_horari: "mati", curs_id: "IEA1" },
    { id_grup: "IEA1B", grup: "B", aula: "111", torn_horari: "tarda", curs_id: "IEA1" },
    { id_grup: "IEA2A", grup: "A", aula: "112", torn_horari: "mati", curs_id: "IEA2" },
    { id_grup: "IEA2B", grup: "B", aula: "112", torn_horari: "tarda", curs_id: "IEA2" },
    { id_grup: "SEA1A", grup: "A", aula: "113", torn_horari: "mati", curs_id: "SEA1" },
    { id_grup: "SEA1B", grup: "B", aula: "113", torn_horari:"tarda" ,curs_id:"SEA1"},
    { id_grup:"SEA2A" ,grup:"A" ,aula:"114" ,torn_horari:"mati" ,curs_id:"SEA2"},
    { id_grup:"SEA2B" ,grup:"B" ,aula:"114" ,torn_horari:"tarda" ,curs_id:"SEA2"},
    { id_grup: "ARI1A", grup: "A", aula: "115", torn_horari: "mati", curs_id: "ARI1" },
    { id_grup: "ARI1B", grup: "B", aula: "115", torn_horari: "tarda", curs_id: "ARI1" },
    { id_grup: "ARI2A", grup: "A", aula: "116", torn_horari: "mati", curs_id: "ARI2" },
    { id_grup: "ARI2B", grup: "B", aula: "116", torn_horari: "tarda", curs_id: "ARI2" },
    { id_grup: "EMC1A", grup: "A", aula: "117", torn_horari: "mati", curs_id: "EMC1" },
    { id_grup: "EMC1B", grup: "B", aula: "117", torn_horari: "tarda", curs_id: "EMC1" },
    { id_grup: "EMC2A", grup: "A", aula: "118", torn_horari: "mati", curs_id: "EMC2" },
    { id_grup: "EMC2B", grup: "B", aula: "118", torn_horari: "tarda", curs_id: "EMC2" },
    { id_grup: "ESO1A", grup: "A", aula: "119", torn_horari: "mati", curs_id: "ESO1" },
    { id_grup: "ESO1B", grup: "B", aula: "120", torn_horari: "mati", curs_id: "ESO1" },
    { id_grup: "ESO2A", grup: "A", aula: "121", torn_horari: "mati", curs_id: "ESO2" },
    { id_grup: "ESO2B", grup: "B", aula: "122", torn_horari: "mati", curs_id: "ESO2" },
    { id_grup: "ESO3A", grup: "A", aula: "123", torn_horari: "mati", curs_id: "ESO3" },
    { id_grup: "ESO3B", grup: "B", aula: "124", torn_horari:"mati" ,curs_id:"ESO3"},
    { id_grup:"ESO4A" ,grup:"A" ,aula:"125" ,torn_horari:"mati" ,curs_id:"ESO4"},
    { id_grup:"ESO4B" ,grup:"B" ,aula:"126" ,torn_horari:"mati" ,curs_id:"ESO4"},
    { id_grup: "BAT1A", grup: "A", aula: "127", torn_horari: "mati", curs_id: "BAT1" },
    { id_grup: "BAT1B", grup: "B", aula: "128", torn_horari: "mati", curs_id: "BAT1" },
    { id_grup: "BAT2A", grup: "A", aula: "129", torn_horari: "mati", curs_id: "BAT2" },
    { id_grup: "BAT2B", grup: "B", aula: "130", torn_horari: "mati", curs_id: "BAT2" },

  ];
  
  for (const grup of grups) {
    await Grup.query().insert({
      id_grup: grup.id_grup,
      grup: grup.grup,
      aula: grup.aula,
      torn_horari: grup.torn_horari,
      curs_id: grup.curs_id,
    });
  }
}

async function insertDocents() {
  const docents: Array<{ nom_sense: string, avatar: string | null }> = [
    { nom_sense: "Albert Millan", avatar: null },
    { nom_sense: "Rafa López", avatar: null },
    { nom_sense: "Andres Garcia", avatar: null },
    { nom_sense: "Maria Gonzalez", avatar: null },
    { nom_sense: "Xavi peña", avatar: null },
    { nom_sense: "Jordi Valentin", avatar: null },
    { nom_sense: "Laura Sánchez", avatar: null },
    { nom_sense: "David Rodríguez", avatar: null },
    { nom_sense: "Marta Fernández", avatar: null },
    { nom_sense: "Sergi Gómez", avatar: null },
    { nom_sense: "Anna Ruiz", avatar: null },
    { nom_sense: "Carlos Pérez", avatar: null },
    { nom_sense: "Elena Torres", avatar: null },
    { nom_sense: "Jordi Ramírez", avatar: null },
    { nom_sense: "Núria Vila", avatar: null },
    { nom_sense: "Marc Soler", avatar: null },
    { nom_sense: "Laia Ortiz", avatar: null },
    { nom_sense: "Xavier Vidal", avatar: null },
  ];
  
  for (const docent of docents) {
    await Docent.query().insert({
      nom_sense: docent.nom_sense,
      avatar: docent.avatar,
    });
  }
}

async function insertModuls() {
  const moduls: Array<{ id_modul: string, nom_modul: string, hores_setmana: number, curs_id: string, color: string }> = [
    { id_modul: "DAW1-M0179", nom_modul: "Professional English", hores_setmana: 3, curs_id: "DAW1", color: "#1abc9c" },
    { id_modul: "DAW1-M0483", nom_modul: "Sistemes Informàtics", hores_setmana: 6, curs_id: "DAW1", color: "#3498db" },
    { id_modul: "DAW1-M0484", nom_modul: "Base de dades", hores_setmana: 6, curs_id: "DAW1", color: "#9b59b6" },
    { id_modul: "DAW1-M0485", nom_modul: "Programació", hores_setmana: 6, curs_id: "DAW1", color: "#be1027" },
    { id_modul: "DAW1-M0373", nom_modul: "Llenguatge de marques i sistemes de gestió d'informació", hores_setmana: 4, curs_id: "DAW1", color: "#aac709" },
    { id_modul: "DAW1-M0487", nom_modul: "Entorns de Desenvolupament", hores_setmana: 6, curs_id: "DAW1", color: "#0814b9" },
    { id_modul: "DAW1-M1709", nom_modul: "Formació i orientació laboral", hores_setmana: 3, curs_id: "DAW1", color: "#0aa50a" },
    { id_modul: "DAW1-TUT", nom_modul: "Tutoria", hores_setmana: 1, curs_id: "DAW1", color: "#eb87cd" },
    { id_modul: "DAW2-M0613+M9999", nom_modul: "Desenvolupament web en entorn servidor + Mòdul professional optatiu", hores_setmana: 6, curs_id: "DAW2", color: "#a3336b" },
    { id_modul: "DAW2-M0612+M0615", nom_modul: "Desenvolupament web en entorn client + Disseny d’interfícies web", hores_setmana: 5, curs_id: "DAW2", color: "#7b04aa" },
    { id_modul: "DAW2-M0614", nom_modul: "Desplegament d'aplicacions Web", hores_setmana: 2, curs_id: "DAW2", color: "#bbbe07" },
    { id_modul: "DAW2-M0616", nom_modul: "Projecte de desenvolupament d’aplicacions web", hores_setmana: 6, curs_id: "DAW2", color: "#04caec" },
    { id_modul: "DAW2-M1710", nom_modul: "Itinerari personal per a l'ocupabilitat II", hores_setmana: 2, curs_id: "DAW2", color: "#6d9712" },
    { id_modul: "DAW2-TUT", nom_modul: "Tutoria", hores_setmana: 1, curs_id: "DAW2", color: "#d422ae" },
    { id_modul: "ASIX2-M666", nom_modul: "Hackeix masiu", hores_setmana: 6, curs_id: "ASIX2", color: "#cc0d1d" },
  ];
  
  for (const modul of moduls) {
    await Modul.query().insert({
      id_modul: modul.id_modul,
      nom_modul: modul.nom_modul,
      hores_setmana: modul.hores_setmana,
      curs_id: modul.curs_id,
      color: modul.color,
    });
  }
}

async function insertFrangesHoraries() {
  const franges: Array<{ id_franja: number, hora_inici: string, hora_fi: string, hora_inici_min: number, hora_fi_min: number, torn_franja: string }> = [
    { id_franja: 0, hora_inici: "08:00", hora_fi: "09:00", hora_inici_min: 480, hora_fi_min: 540, torn_franja: "mati"},
    { id_franja: 1, hora_inici: "09:00", hora_fi: "10:00", hora_inici_min: 540, hora_fi_min: 600, torn_franja: "mati"},
    { id_franja: 2, hora_inici: "10:00", hora_fi: "11:00", hora_inici_min: 600, hora_fi_min: 660, torn_franja: "mati"},
    { id_franja: 3, hora_inici: "11:00", hora_fi: "11:30", hora_inici_min: 660, hora_fi_min: 690, torn_franja: "mati"},
    { id_franja: 4, hora_inici: "11:30", hora_fi: "12:30", hora_inici_min: 690, hora_fi_min: 750, torn_franja: "mati"},
    { id_franja: 5, hora_inici: "12:30", hora_fi: "13:30", hora_inici_min: 750, hora_fi_min: 810, torn_franja: "mati"},
    { id_franja: 6, hora_inici: "15:00", hora_fi: "16:00", hora_inici_min: 900, hora_fi_min: 960, torn_franja: "tarda"},
    { id_franja: 7, hora_inici: "16:00", hora_fi: "17:00", hora_inici_min: 960, hora_fi_min: 1020, torn_franja: "tarda"},
    { id_franja: 8, hora_inici: "17:00", hora_fi: "18:00", hora_inici_min: 1020, hora_fi_min: 1080, torn_franja: "tarda"},
    { id_franja: 9, hora_inici: "18:00", hora_fi: "18:30", hora_inici_min: 1080, hora_fi_min: 1110, torn_franja: "tarda"},
    { id_franja: 10, hora_inici: "18:30", hora_fi: "19:30", hora_inici_min: 1110, hora_fi_min: 1170, torn_franja: "tarda"},
    { id_franja: 11, hora_inici: "19:30", hora_fi: "20:30", hora_inici_min: 1170, hora_fi_min: 1230, torn_franja: "tarda"},
  ];

  for (const franja of franges) {
    await Franja_horaria.query().insert({
      id_franja: franja.id_franja,
      hora_inici: franja.hora_inici,
      hora_fi: franja.hora_fi,
      hora_inici_min: franja.hora_inici_min,
      hora_fi_min: franja.hora_fi_min,
      torn_franja: franja.torn_franja,
    });
  }
}

async function insertImparteix() {
  const imparteix: Array<{ docent_id: number, modul_id: string, grup_id: string}> = [
    {docent_id: 4, modul_id: "DAW1-M0179", grup_id: "DAW1A"},
    {docent_id: 4, modul_id: "DAW1-M0179", grup_id: "DAW1B"},
    {docent_id: 3, modul_id: "DAW1-M0483", grup_id: "DAW1A"},
    {docent_id: 3, modul_id: "DAW1-M0483", grup_id: "DAW1B"},
    {docent_id: 2, modul_id: "DAW1-M0484", grup_id: "DAW1A"},
    {docent_id: 2, modul_id: "DAW1-M0484", grup_id: "DAW1B"},
    {docent_id: 1, modul_id: "DAW1-M0485", grup_id: "DAW1A"},
    {docent_id: 1, modul_id: "DAW1-M0485", grup_id: "DAW1B"},
    {docent_id: 6, modul_id: "DAW1-M0485", grup_id: "DAW1B"},
    {docent_id: 4, modul_id: "DAW1-M0373", grup_id: "DAW1A"},
    {docent_id: 4, modul_id: "DAW1-M0373", grup_id: "DAW1B"},
    {docent_id: 5, modul_id: "DAW1-M0487", grup_id: "DAW1A"},
    {docent_id: 5, modul_id: "DAW1-M0487", grup_id: "DAW1B"},
    {docent_id: 8, modul_id: "DAW1-M1709", grup_id: "DAW1A"},
    {docent_id: 8, modul_id: "DAW1-M1709", grup_id: "DAW1B"},
    {docent_id: 2, modul_id: "DAW1-TUT", grup_id: "DAW1A"},
    {docent_id: 3, modul_id: "DAW1-TUT", grup_id: "DAW1B"},
    {docent_id: 6, modul_id: "DAW2-M0613+M9999", grup_id: "DAW2A"},
    {docent_id: 6, modul_id: "DAW2-M0613+M9999", grup_id: "DAW2B"},
    {docent_id: 1, modul_id: "DAW2-M0612+M0615", grup_id: "DAW2A"},
    {docent_id: 1, modul_id: "DAW2-M0612+M0615", grup_id: "DAW2B"},
    {docent_id: 5, modul_id: "DAW2-M0614", grup_id: "DAW2A"},
    {docent_id: 5, modul_id: "DAW2-M0614", grup_id: "DAW2B"},
    {docent_id: 1, modul_id: "DAW2-M0616", grup_id: "DAW2A"},
    {docent_id: 1, modul_id: "DAW2-M0616", grup_id: "DAW2B"},
    {docent_id: 4, modul_id: "DAW2-M1710", grup_id: "DAW2A"},
    {docent_id: 4, modul_id: "DAW2-M1710", grup_id: "DAW2B"},
    {docent_id: 6, modul_id: "DAW2-TUT", grup_id: "DAW2A"},
    {docent_id: 6, modul_id: "DAW2-TUT", grup_id: "DAW2B"},
    {docent_id: 6, modul_id: "ASIX2-M666", grup_id: "ASIX2B"},
  ]
  for (const impart of imparteix) {
    await Imparteix.query().insert({
      docent_id: impart.docent_id,
      modul_id: impart.modul_id,
      grup_id: impart.grup_id,
    });
  }
}

async function insertHorari(){
  const horaris: Array<{ dia: string, modul_id: string, franja_id: number, grup_id: string}> = [
    { dia: "dilluns", modul_id: "DAW2-M0612+M0615", franja_id: 6, grup_id: "DAW2B"},
    { dia: "dilluns", modul_id: "DAW2-M0612+M0615", franja_id: 7, grup_id: "DAW2B"},
    { dia: "dilluns", modul_id: "DAW2-M0612+M0615", franja_id: 8, grup_id: "DAW2B"},
    { dia: "dilluns", modul_id: "DAW2-M0613+M9999", franja_id: 10, grup_id: "DAW2B"},
    { dia: "dimarts", modul_id: "DAW2-M0614", franja_id: 6, grup_id: "DAW2B"},
    { dia: "dimarts", modul_id: "DAW2-M0614", franja_id: 7, grup_id: "DAW2B"},
    { dia: "dimarts", modul_id: "DAW2-M0616", franja_id: 8, grup_id: "DAW2B"},
    { dia: "dimarts", modul_id: "DAW2-M0616", franja_id: 10, grup_id: "DAW2B"},
    { dia: "dimarts", modul_id: "DAW2-M0616", franja_id: 11, grup_id: "DAW2B"},
    { dia: "dimecres", modul_id: "DAW2-M1710", franja_id: 6, grup_id: "DAW2B"},
    { dia: "dimecres", modul_id: "DAW2-M1710", franja_id: 7, grup_id: "DAW2B"},
    { dia: "dimecres", modul_id: "DAW2-TUT", franja_id: 8, grup_id: "DAW2B"},
    { dia: "dimecres", modul_id: "DAW2-M0613+M9999", franja_id: 10, grup_id: "DAW2B"},
    { dia: "dimecres", modul_id: "DAW2-M0613+M9999", franja_id: 11, grup_id: "DAW2B"},
    { dia: "dijous", modul_id: "DAW2-M0613+M9999", franja_id: 6, grup_id: "DAW2B"},
    { dia: "dijous", modul_id: "DAW2-M0613+M9999", franja_id: 7, grup_id: "DAW2B"},
    { dia: "dijous", modul_id: "DAW2-M0613+M9999", franja_id: 8, grup_id: "DAW2B"},
    { dia: "dijous", modul_id: "DAW2-M0612+M0615", franja_id: 10, grup_id: "DAW2B"},
    { dia: "dijous", modul_id: "DAW2-M0612+M0615", franja_id: 11, grup_id: "DAW2B"},
    { dia: "divendres", modul_id: "DAW2-M0616", franja_id: 6, grup_id: "DAW2B"},
    { dia: "divendres", modul_id: "DAW2-M0616", franja_id: 7, grup_id: "DAW2B"},
    { dia: "divendres", modul_id: "DAW2-M0616", franja_id: 8, grup_id: "DAW2B"},
    { dia: "dilluns", modul_id: "ASIX2-M666", franja_id: 6, grup_id: "ASIX2B"},
    { dia: "dilluns", modul_id: "ASIX2-M666", franja_id: 7, grup_id: "ASIX2B"},
  ]
  for (const horari of horaris) {
    await Horari.query().insert({
      dia: horari.dia,
      modul_id: horari.modul_id,
      franja_id: horari.franja_id,
      grup_id: horari.grup_id,
    });
  }

  const horaresAsignades: Array<{ docent_id: number, modul_id: string, grup_id: string, hores_asignades: number }> = [
    { docent_id: 6, modul_id: "DAW2-M0613+M9999", grup_id: "DAW2B", hores_asignades: 6,},
    { docent_id: 1, modul_id: "DAW2-M0612+M0615", grup_id: "DAW2B", hores_asignades: 5,},
    { docent_id: 5, modul_id: "DAW2-M0614", grup_id: "DAW2B", hores_asignades: 2,},
    { docent_id: 1, modul_id: "DAW2-M0616", grup_id: "DAW2B", hores_asignades: 6,},
    { docent_id: 4, modul_id: "DAW2-M1710", grup_id: "DAW2B", hores_asignades: 2,},
    { docent_id: 6, modul_id: "DAW2-TUT", grup_id: "DAW2B", hores_asignades: 1,},
    { docent_id: 6, modul_id: "ASIX2-M666", grup_id: "ASIX2B", hores_asignades: 2,},
  ]
  for (const horesAsig of horaresAsignades) {
    await Imparteix.query().patch({ hores_asignades: horesAsig.hores_asignades })
            .where("docent_id", horesAsig.docent_id)
            .andWhere("modul_id", horesAsig.modul_id)
            .andWhere("grup_id", horesAsig.grup_id);
  }
}

async function insertAll() {
  await insertUsers();
  await insertFrangesHoraries();
  await insertDocents();
  await insertDepartaments();
  await insertCicles();
  await insertCursos();
  await insertGrups();
  await insertModuls();
  await insertImparteix();
  await insertHorari();
}