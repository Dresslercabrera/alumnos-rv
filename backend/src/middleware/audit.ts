import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';

export const auditMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  // Defer writing audit for mutating and auth actions using res.on('finish')
  const start = Date.now();
  req.once('close', () => {
    // noop
  });

  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';

  const actionMap: Record<string, 'VER' | 'INSERTAR' | 'ACTUALIZAR' | 'ELIMINAR'> = {
    GET: 'VER',
    POST: 'INSERTAR',
    PUT: 'ACTUALIZAR',
    PATCH: 'ACTUALIZAR',
    DELETE: 'ELIMINAR',
  };

  const modulo: 'USUARIOS' | 'RESOLUCIONES' | 'DOCUMENTOS' | 'EGRESADOS' | 'REPORTES' | 'AUTENTICACION' =
    req.path.startsWith('/api/auth')
      ? 'AUTENTICACION'
      : req.path.startsWith('/api/resoluciones')
      ? 'RESOLUCIONES'
      : req.path.startsWith('/api/documentos')
      ? 'DOCUMENTOS'
      : req.path.startsWith('/api/egresados')
      ? 'EGRESADOS'
      : req.path.startsWith('/api/reportes')
      ? 'REPORTES'
      : 'AUTENTICACION';

  const accion = actionMap[req.method] || 'VER';

  // After response finishes, write audit
  _resOnFinish();

  function _resOnFinish() {
    // We attach after the current middleware stack
    setImmediate(() => {
      const onFinish = async () => {
        try {
          const usuarioId = (req as any).user?.id ?? null;
          const descripcion = `${req.method} ${req.originalUrl} ${_resStatusDesc()}`;
          await prisma.auditoria.create({
            data: {
              usuarioId: usuarioId ?? undefined,
              accion: accion as any,
              modulo: modulo as any,
              descripcion,
              ip,
            },
          });
        } catch {
          // swallow audit errors
        }
      };
      _res.once('finish', onFinish);
    });
  }

  function _resStatusDesc() {
    const duration = Date.now() - start;
    return `status=${_res.statusCode} time_ms=${duration}`;
  }

  next();
};
