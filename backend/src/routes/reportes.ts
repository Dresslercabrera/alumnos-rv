import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export const reportesRouter = Router();

reportesRouter.get('/general', async (req: Request, res: Response) => {
  const { desde, hasta, institucion, carrera, tipo_titulo } = req.query as Record<string, string>;
  const where: any = {};
  if (desde || hasta) where.fecha_resolucion = { gte: desde ? new Date(desde) : undefined, lte: hasta ? new Date(hasta) : undefined };
  const resoluciones = await prisma.resolucion.findMany({
    where,
    include: {
      egresados: {
        where: {
          ...(institucion ? { institucion } : {}),
          ...(carrera ? { carrera } : {}),
          ...(tipo_titulo ? { tipo_titulo: tipo_titulo as any } : {}),
        },
      },
    },
    orderBy: { fecha_resolucion: 'asc' },
  });
  res.json(resoluciones);
});

reportesRouter.get('/stats', async (_req: Request, res: Response) => {
  const byMonth = await prisma.$queryRawUnsafe<any[]>(
    `SELECT to_char("fecha_resolucion", 'YYYY-MM') AS mes, COUNT(*)::int AS total FROM "Resolucion" GROUP BY mes ORDER BY mes;`
  );
  const byInstitucion = await prisma.egresado.groupBy({ by: ['institucion'], _count: { _all: true } });
  const byTipoTitulo = await prisma.egresado.groupBy({ by: ['tipo_titulo'], _count: { _all: true } });
  res.json({ byMonth, byInstitucion, byTipoTitulo });
});

reportesRouter.get('/export/excel', async (req: Request, res: Response) => {
  const { desde, hasta } = req.query as Record<string, string>;
  const where: any = {};
  if (desde || hasta) where.fecha_resolucion = { gte: desde ? new Date(desde) : undefined, lte: hasta ? new Date(hasta) : undefined };
  const resoluciones = await prisma.resolucion.findMany({ where, include: { egresados: true } });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Títulos');
  ws.addRow([
    'Nro Resolución',
    'Fecha Resolución',
    'Estado',
    'Institución',
    'DRE',
    'Tipo Doc',
    'Nro Doc',
    'Nombres',
    'Apellidos',
    'Carrera',
    'Tipo Título',
  ]);

  for (const r of resoluciones) {
    for (const e of r.egresados) {
      ws.addRow([
        r.nro_resolucion,
        r.fecha_resolucion.toISOString().slice(0, 10),
        r.estado,
        e.institucion,
        e.dre,
        e.tipo_doc,
        e.nro_doc,
        e.nombres,
        `${e.apellido_paterno} ${e.apellido_materno}`,
        e.carrera,
        e.tipo_titulo,
      ]);
    }
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="titulos.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});

reportesRouter.get('/export/pdf', async (req: Request, res: Response) => {
  const { desde, hasta } = req.query as Record<string, string>;
  const where: any = {};
  if (desde || hasta) where.fecha_resolucion = { gte: desde ? new Date(desde) : undefined, lte: hasta ? new Date(hasta) : undefined };
  const resoluciones = await prisma.resolucion.findMany({ where, include: { egresados: true } });

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="titulos.pdf"');
  doc.pipe(res);

  doc.fontSize(16).text('Reporte de Títulos - DRE HUÁNUCO');
  doc.moveDown();

  for (const r of resoluciones) {
    doc.fontSize(12).text(`Resolución ${r.nro_resolucion} - ${r.fecha_resolucion.toISOString().slice(0, 10)} - ${r.estado}`);
    for (const e of r.egresados) {
      doc.fontSize(10).text(
        `  ${e.institucion} | ${e.tipo_doc} ${e.nro_doc} | ${e.nombres} ${e.apellido_paterno} ${e.apellido_materno} | ${e.carrera} | ${e.tipo_titulo}`
      );
    }
    doc.moveDown();
  }

  doc.end();
});
