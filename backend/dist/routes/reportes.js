"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportesRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../utils/prisma");
const exceljs_1 = __importDefault(require("exceljs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
exports.reportesRouter = (0, express_1.Router)();
exports.reportesRouter.get('/general', async (req, res) => {
    const { desde, hasta, institucion, carrera, tipo_titulo } = req.query;
    const where = {};
    if (desde || hasta)
        where.fecha_resolucion = { gte: desde ? new Date(desde) : undefined, lte: hasta ? new Date(hasta) : undefined };
    const resoluciones = await prisma_1.prisma.resolucion.findMany({
        where,
        include: {
            egresados: {
                where: {
                    ...(institucion ? { institucion } : {}),
                    ...(carrera ? { carrera } : {}),
                    ...(tipo_titulo ? { tipo_titulo: tipo_titulo } : {}),
                },
            },
        },
        orderBy: { fecha_resolucion: 'asc' },
    });
    res.json(resoluciones);
});
exports.reportesRouter.get('/stats', async (_req, res) => {
    const byMonth = await prisma_1.prisma.$queryRawUnsafe(`SELECT to_char("fecha_resolucion", 'YYYY-MM') AS mes, COUNT(*)::int AS total FROM "Resolucion" GROUP BY mes ORDER BY mes;`);
    const byInstitucion = await prisma_1.prisma.egresado.groupBy({ by: ['institucion'], _count: { _all: true } });
    const byTipoTitulo = await prisma_1.prisma.egresado.groupBy({ by: ['tipo_titulo'], _count: { _all: true } });
    res.json({ byMonth, byInstitucion, byTipoTitulo });
});
exports.reportesRouter.get('/export/excel', async (req, res) => {
    const { desde, hasta } = req.query;
    const where = {};
    if (desde || hasta)
        where.fecha_resolucion = { gte: desde ? new Date(desde) : undefined, lte: hasta ? new Date(hasta) : undefined };
    const resoluciones = await prisma_1.prisma.resolucion.findMany({ where, include: { egresados: true } });
    const wb = new exceljs_1.default.Workbook();
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
exports.reportesRouter.get('/export/pdf', async (req, res) => {
    const { desde, hasta } = req.query;
    const where = {};
    if (desde || hasta)
        where.fecha_resolucion = { gte: desde ? new Date(desde) : undefined, lte: hasta ? new Date(hasta) : undefined };
    const resoluciones = await prisma_1.prisma.resolucion.findMany({ where, include: { egresados: true } });
    const doc = new pdfkit_1.default({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="titulos.pdf"');
    doc.pipe(res);
    doc.fontSize(16).text('Reporte de Títulos - DRE HUÁNUCO');
    doc.moveDown();
    for (const r of resoluciones) {
        doc.fontSize(12).text(`Resolución ${r.nro_resolucion} - ${r.fecha_resolucion.toISOString().slice(0, 10)} - ${r.estado}`);
        for (const e of r.egresados) {
            doc.fontSize(10).text(`  ${e.institucion} | ${e.tipo_doc} ${e.nro_doc} | ${e.nombres} ${e.apellido_paterno} ${e.apellido_materno} | ${e.carrera} | ${e.tipo_titulo}`);
        }
        doc.moveDown();
    }
    doc.end();
});
//# sourceMappingURL=reportes.js.map