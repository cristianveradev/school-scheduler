export {};

declare global {
    namespace Express {
        interface Request {
            user?: {
                idUsuari: number;
                permisos: "superadmin" | "admin" | "ver";
            };
        }
    }
}