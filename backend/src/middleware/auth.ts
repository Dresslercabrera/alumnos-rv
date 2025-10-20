import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config';

export interface AuthPayload {
  id: number;
  rol: 'ADMIN_DRE' | 'ESPECIALISTA_DRE' | 'USUARIO_CONSULTA';
}

export const requireAuth = (roles?: AuthPayload['rol'][]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No autorizado' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
      (req as any).user = payload;
      if (roles && !roles.includes(payload.rol)) {
        return res.status(403).json({ message: 'Permisos insuficientes' });
      }
      next();
    } catch {
      return res.status(401).json({ message: 'Token inválido' });
    }
  };
};
