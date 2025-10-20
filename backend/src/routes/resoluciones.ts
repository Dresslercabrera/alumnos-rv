import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { requireAuth } from '../middleware/auth';

export const resolucionesRouter = Router();

const createSchema = z.object({
  nro_resolucion: z.string().min(1),
  fecha_resolucion: z.string().datetime().or(z.string().min(1)),
});

resolucionesRouter.post('/', requireAuth(['ADMIN_DRE', 'ESPECIALISTA_DRE']), async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Datos inválidos' });
  const { nro_resolucion, fecha_resolucion } = parsed.data;
  const fecha = new Date(fecha_resolucion);
  const record = await prisma.resolucion.create({
    data: {
      nro_resolucion,
      fecha_resolucion: fecha,
      creadoPorId: (req as any).user.id,
    },
  });
  res.status(201).json(record);
});

resolucionesRouter.get('/', requireAuth(), async (_req: Request, res: Response) => {
  const data = await prisma.resolucion.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(data);
});

resolucionesRouter.get('/:id', requireAuth(), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const record = await prisma.resolucion.findUnique({ where: { id }, include: { documentos: true, egresados: true } });
  if (!record) return res.status(404).json({ message: 'No encontrado' });
  res.json(record);
});

const updateEstadoSchema = z.object({ estado: z.enum(['EN_PROCESO', 'COMPLETADO', 'RECHAZADO', 'APROBADO']) });

resolucionesRouter.patch('/:id/estado', requireAuth(['ADMIN_DRE', 'ESPECIALISTA_DRE']), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const parsed = updateEstadoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Datos inválidos' });
  const updated = await prisma.resolucion.update({ where: { id }, data: { estado: parsed.data.estado } });
  res.json(updated);
});
