import { Router } from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import Usuari from "../models/usuari.model"
import { OAuth2Client } from "google-auth-library"

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID as string,
    process.env.GOOGLE_CLIENT_SECRET as string,
    "http://localhost:3100/api/auth/google/callback"
)


//Rutas de Google
router.get('/google', (req, res) => {
    const url = googleClient.generateAuthUrl({
        access_type: 'offline',
        scope: ['email', 'profile'], //Le pedimos a Google el correo del usuario
        prompt: 'select_account',
        redirect_uri: 'http://localhost:3100/api/auth/google/callback'
    });
    //Redirigimos al usuario a la pantalla de login de Google
    res.redirect(url);
});

//Google devuelve al usuario aquí con un código secreto
router.get('/google/callback', async (req, res) => {
    const code = req.query.code as string;
    try {
        //Intercambiamos el código por los tokens oficiales
        const { tokens } = await googleClient.getToken(code);
        googleClient.setCredentials(tokens);

        //Extraemos la información del usuario (su email)
        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token!,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const email = payload?.email;

        if (!email) {
            return res.status(400).send(
                "Error: Google no ha proporcionat cap email."
            )
        }

        //Buscamos si este email existe en nuestra base de datos
        const user = await Usuari.query().findOne({ email });

        if (!user) {
            //Si el profe usa un correo que no está en la base de datos, le denegamos el acceso
            return res.status(401).send(
                "Aquest correu no està registrat al sistema."
            );
        }

        // Si existe, le generamos el token normal (como en un lógin clásico)
        const token = jwt.sign(
            { idUsuari: user.id_usuari, permisos: user.permisos },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        //Redirigimos al frontend pasándole el token por la URL
        res.redirect(`http://localhost:5173/html/inici.html?token=${token}`);
    } catch (err) {
        console.error("Error a Google OAuth:", err);
        res.status(500).send("Error en l'autenticació amb Google");
    }
})

router.get('/login', async(req, res) => {
    res.json("Hola desde el login")
})
router.post('/login', async(req, res) => {
    try{
        const { usuari, password } = req.body as { 
            usuari?: string; 
            password?: string 
        };

        if (!usuari || !password) {
            return res.status(400).json({ message: "Falten credencials" });
        }

        const user = await Usuari.query().findOne({ usuari });

        if (!user) {
            return res.status(401).json({ message: "Usuari o contrasenya incorrectes" });
        }
        
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: "Usuari o contrasenya incorrectes" });
        }

        const token = jwt.sign(
            { idUsuari: user.id_usuari, permisos: user.permisos },
            JWT_SECRET,{ expiresIn: "1h" }
        );

        return res.json({ 
            token, 
            usuari: { id_usuari: user.id_usuari, usuari: user.usuari, permisos: user.permisos },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error intern" });
    }
});

export default router;