
import dotenv from "dotenv";
import path from "path";                                                    // PARA EL FUNCIONAMIENTO
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
import express from "express";                                              // IMPORTS NECESARIOS 
import type { ErrorRequestHandler, RequestHandler } from "express";
import jwt from "jsonwebtoken";

import db from "./engine/database"; // archivo crear base de datos
// IMPORTS para crear las rutas
import authRoute from "./routes/auth.route";
import usuariRoute from "./routes/usuari.route";
import registreRoute from "./routes/registre.route";
import frangesRoute from "./routes/franja_horaria.route"; 
import departamentRoute from "./routes/departament.route";
import cicleRoute from "./routes/cicle.route";
import cursRoute from "./routes/curs.route";
import grupRoute from "./routes/grup.route";
import modulRoute from "./routes/modul.route";
import calendariRoute from "./routes/calendari.route";  
import horariRoute from "./routes/horari.route";
import docentRoute from "./routes/docent.route";
import imparteixRoute from "./routes/imparteix.route";

const app = express();

const port = process.env.PORT ? Number(process.env.PORT) : 3100;
const accessControlAllowOrigin = process.env.ALLOW_ORIGIN || "*";
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

type Permis = "superadmin" | "admin" | "ver";

app.use(express.json());

// Static uploads
const uploadsPath = path.join(__dirname, "..", "uploads");
console.log("Serving uploads from:", uploadsPath);
app.use("/uploads", express.static(uploadsPath));

/** CORS + Auth decode (NO obliga a auth, solo decodifica si toca) */
app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", accessControlAllowOrigin);
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.set("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") return res.sendStatus(204).end();

  const isPublic =
    req.path.startsWith("/api/auth") ||
    req.path.startsWith("/uploads") ||
    req.path === "/" ||
    req.path === "/error";

  if (!isPublic) {
    const auth = req.headers.authorization;
    if (!auth) return res.sendStatus(401);

    const [scheme, token] = auth.split(" ");
    if (scheme !== "Bearer" || !token) return res.sendStatus(401);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        idUsuari: number;
        permisos: Permis;
      };
      req.user = { idUsuari: decoded.idUsuari, permisos: decoded.permisos };
    } catch {
      return res.status(401).json({ message: "Token invalid o expirat" });
    }
  }

  next();
});

/** Middleware: requiere que haya user */
const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.user) return res.sendStatus(401);
  next();
};

/** Middleware: requiere roles concretos */
const requireRoles = (...roles: Permis[]): RequestHandler => {
  return (req, res, next) => {
    if (!req.user) return res.sendStatus(401);
    if (!roles.includes(req.user.permisos)) {
      return res.status(403).json({ message: "No tens permisos" });
    }
    next();
  };
};

// Rutas públicas (login)
app.use("/api/auth", authRoute);

// Rutas protegidas (requieren token por el middleware global)
// - usuari: protegida con token 
app.use("/api/usuari", requireAuth, usuariRoute);

// Rutas super protegidas (requieren token por el middleware global y roles especificos de admin y superadmin)
// - registre: solo admin/superadmin pueden crear usuarios (y reglas dentro)
app.use("/api/registre", requireAuth, requireRoles("admin", "superadmin"), registreRoute);
app.use("/api/calendari", requireAuth, requireRoles("admin", "superadmin"), calendariRoute);
app.use("/api/horaris", requireAuth, requireRoles("admin", "superadmin"), horariRoute);

// Rutas super protegidas (requieren token por el middleware global y rol especifico de superadmin)
// - franges: SOLO superadmin
app.use("/api/franges", requireAuth, requireRoles("superadmin"), frangesRoute);
app.use("/api/departaments", requireAuth, requireRoles("admin", "superadmin"), departamentRoute); // ESTOS 4 HE TENIDO QUE PONERLES     |  TODO LO NECESARIO PARA 
app.use("/api/cicles", requireAuth, requireRoles("admin", "superadmin"), cicleRoute);             // TAMBIEN EL ROL DE ADMIN PARA       |  SELECCIONAR EN EL CREADOR
app.use("/api/cursos", requireAuth, requireRoles("admin", "superadmin"), cursRoute);              // QUE FUNCIONEN LOS DESPLEGABLES     |  DE CALENDARIOS.
app.use("/api/grups", requireAuth, requireRoles("admin", "superadmin"), grupRoute);               // DE SELECCION DE GRUPO PARA CARGAR  |  ¡POR REUTILIZAR EL CODIGO! NO ME DI CUENTA
app.use("/api/moduls", requireAuth, requireRoles("superadmin"), modulRoute);
app.use("/api/docents", requireAuth, requireRoles("superadmin"), docentRoute);
app.use("/api/imparteix", requireAuth, requireRoles("superadmin"), imparteixRoute);

// Ruta de error por si algo ha fallado
app.use("/error", (_req, _res) => {
  throw new Error("Alguna cosa ha sortit malament!");
});

app.use("/", (_req, res) => {
  res.json("Benvingut a la creació de calendari api");
});

// Error handler al final
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  const status = (err as any)?.statusCode || 500;
  const message = (err as any)?.message || "Internal Server Error";
  res.status(status).json({ message });
};

app.use(errorHandler);

async function bootstrap() {
  await db.start();
  app.listen(port, () => {
    console.log(`Listening backend in http://localhost:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error("Error al iniciar el backend:", err);
});