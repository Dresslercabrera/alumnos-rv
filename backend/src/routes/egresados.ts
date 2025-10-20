import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { requireAuth } from '../middleware/auth';
import { config } from '../utils/config';
import { v4 as uuid } from 'uuid';

export const egresadosRouter = Router();

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

const egresadoSchema = z.object({
  institucion: z.string().min(1),
  dre: z.string().default('DRE HUÁNUCO'),
  nro_serie: z.string().optional(),
  fecha_registro_dre: z.string().optional(),
  tipo_doc: z.enum(['DNI', 'CE', 'PASAPORTE']),
  nro_doc: z.string().min(1),
  nombres: z.string().min(1),
  apellido_paterno: z.string().min(1),
  apellido_materno: z.string().min(1),
  sexo: z.enum(['M', 'F']),
  carrera: z.string().min(1),
  programa: z.string().optional(),
  nro_registro_inst: z.string().optional(),
  fecha_emision: z.string().optional(),
  tipo_titulo: z.enum(['ORIGINAL', 'DUPLICADO']),
  comentario: z.string().optional(),
  resolucionId: z.coerce.number(),
});

egresadosRouter.post(
  '/',
  requireAuth(['ADMIN_DRE', 'ESPECIALISTA_DRE']),
  upload.fields([
    { name: 'diploma_anverso', maxCount: 1 },
    { name: 'diploma_reverso', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    const parsed = egresadoSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Datos inválidos' });

    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const anverso = files?.['diploma_anverso']?.[0];
    const reverso = files?.['diploma_reverso']?.[0];

    const created = await prisma.egresado.create({
      data: {
        ...parsed.data,
        fecha_registro_dre: parsed.data.fecha_registro_dre ? new Date(parsed.data.fecha_registro_dre) : null,
        fecha_emision: parsed.data.fecha_emision ? new Date(parsed.data.fecha_emision) : null,
        diploma_anverso_url: anverso ? `/uploads/${anverso.filename}` : null,
        diploma_reverso_url: reverso ? `/uploads/${reverso.filename}` : null,
      } as any,
    });

    res.status(201).json(created);
  }
);

egresadosRouter.get('/by-resolucion/:id', requireAuth(), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const list = await prisma.egresado.findMany({ where: { resolucionId: id }, orderBy: { id: 'desc' } });
  res.json(list);
});


egresadosRouter.delete('/:id', requireAuth(['ADMIN_DRE', 'ESPECIALISTA_DRE']), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await prisma.egresado.delete({ where: { id } });
  res.json({ ok: true });
});
