import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { requireAuth } from '../middleware/auth';
import { config } from '../utils/config';
import { v4 as uuid } from 'uuid';

export const documentosRouter = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Solo PDF'));
    cb(null, true);
  },
});

const createSchema = z.object({
  tipo: z.enum(['RESOLUCION_REGISTRO', 'OFICIO', 'SUSTENTO']),
  descripcion: z.string().min(1),
  resolucionId: z.coerce.number(),
});

documentosRouter.post('/', requireAuth(['ADMIN_DRE', 'ESPECIALISTA_DRE']), upload.single('archivo'), async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Datos inválidos' });
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ message: 'Archivo requerido (PDF)' });

  const created = await prisma.documento.create({
    data: {
      tipo: parsed.data.tipo as any,
      descripcion: parsed.data.descripcion,
      archivoUrl: `/uploads/${file.filename}`,
      resolucionId: parsed.data.resolucionId,
    },
  });
  res.status(201).json(created);
});


documentosRouter.get('/by-resolucion/:id', requireAuth(), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const list = await prisma.documento.findMany({ where: { resolucionId: id }, orderBy: { id: 'desc' } });
  res.json(list);
});


documentosRouter.delete('/:id', requireAuth(['ADMIN_DRE', 'ESPECIALISTA_DRE']), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await prisma.documento.delete({ where: { id } });
  res.json({ ok: true });
});
