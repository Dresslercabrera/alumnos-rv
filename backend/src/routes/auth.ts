import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { config } from '../utils/config';

export const authRouter = Router();

const loginSchema = z.object({
  usuario: z.string().min(1),
  contrasena: z.string().min(1),
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Datos inválidos' });
  const { usuario, contrasena } = parsed.data;

  const user = await prisma.usuario.findFirst({
    where: {
      OR: [{ usuario }, { correo: usuario }],
      estado: 'ACTIVO',
    },
  });
  if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

  const ok = await bcrypt.compare(contrasena, user.contrasena);
  if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

  const token = jwt.sign({ id: user.id, rol: user.rol }, config.jwtSecret, { expiresIn: '8h' });
  return res.json({ token, user: { id: user.id, nombre: user.nombre, rol: user.rol } });
});

authRouter.post('/forgot', async (req: Request, res: Response) => {
  // For MVP: respond ok without sending email
  const usuario = String(req.body?.usuario || '');
  if (!usuario) return res.status(400).json({ message: 'Datos inválidos' });
  return res.json({ message: 'Si el usuario existe, se enviarán instrucciones' });
});

authRouter.get('/me', async (req: Request, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'No autorizado' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { id: number };
    const user = await prisma.usuario.findUnique({ where: { id: payload.id } });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    return res.json({ id: user.id, nombre: user.nombre, rol: user.rol });
  } catch {
    return res.status(401).json({ message: 'Token inválido' });
  }
});
