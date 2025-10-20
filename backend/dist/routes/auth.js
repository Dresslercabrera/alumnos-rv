"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const config_1 = require("../utils/config");
exports.authRouter = (0, express_1.Router)();
const loginSchema = zod_1.z.object({
    usuario: zod_1.z.string().min(1),
    contrasena: zod_1.z.string().min(1),
});
exports.authRouter.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ message: 'Datos inválidos' });
    const { usuario, contrasena } = parsed.data;
    const user = await prisma_1.prisma.usuario.findFirst({
        where: {
            OR: [{ usuario }, { correo: usuario }],
            estado: 'ACTIVO',
        },
    });
    if (!user)
        return res.status(401).json({ message: 'Credenciales inválidas' });
    const ok = await bcryptjs_1.default.compare(contrasena, user.contrasena);
    if (!ok)
        return res.status(401).json({ message: 'Credenciales inválidas' });
    const token = jsonwebtoken_1.default.sign({ id: user.id, rol: user.rol }, config_1.config.jwtSecret, { expiresIn: '8h' });
    return res.json({ token, user: { id: user.id, nombre: user.nombre, rol: user.rol } });
});
exports.authRouter.post('/forgot', async (req, res) => {
    // For MVP: respond ok without sending email
    const usuario = String(req.body?.usuario || '');
    if (!usuario)
        return res.status(400).json({ message: 'Datos inválidos' });
    return res.json({ message: 'Si el usuario existe, se enviarán instrucciones' });
});
exports.authRouter.get('/me', async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer '))
        return res.status(401).json({ message: 'No autorizado' });
    const token = auth.split(' ')[1];
    try {
        const payload = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        const user = await prisma_1.prisma.usuario.findUnique({ where: { id: payload.id } });
        if (!user)
            return res.status(404).json({ message: 'Usuario no encontrado' });
        return res.json({ id: user.id, nombre: user.nombre, rol: user.rol });
    }
    catch {
        return res.status(401).json({ message: 'Token inválido' });
    }
});
//# sourceMappingURL=auth.js.map