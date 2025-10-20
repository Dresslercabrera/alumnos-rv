"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolucionesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../middleware/auth");
exports.resolucionesRouter = (0, express_1.Router)();
const createSchema = zod_1.z.object({
    nro_resolucion: zod_1.z.string().min(1),
    fecha_resolucion: zod_1.z.string().datetime().or(zod_1.z.string().min(1)),
});
exports.resolucionesRouter.post('/', (0, auth_1.requireAuth)(['ADMIN_DRE', 'ESPECIALISTA_DRE']), async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ message: 'Datos inválidos' });
    const { nro_resolucion, fecha_resolucion } = parsed.data;
    const fecha = new Date(fecha_resolucion);
    const record = await prisma_1.prisma.resolucion.create({
        data: {
            nro_resolucion,
            fecha_resolucion: fecha,
            creadoPorId: req.user.id,
        },
    });
    res.status(201).json(record);
});
exports.resolucionesRouter.get('/', (0, auth_1.requireAuth)(), async (_req, res) => {
    const data = await prisma_1.prisma.resolucion.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(data);
});
exports.resolucionesRouter.get('/:id', (0, auth_1.requireAuth)(), async (req, res) => {
    const id = Number(req.params.id);
    const record = await prisma_1.prisma.resolucion.findUnique({ where: { id }, include: { documentos: true, egresados: true } });
    if (!record)
        return res.status(404).json({ message: 'No encontrado' });
    res.json(record);
});
const updateEstadoSchema = zod_1.z.object({ estado: zod_1.z.enum(['EN_PROCESO', 'COMPLETADO', 'RECHAZADO', 'APROBADO']) });
exports.resolucionesRouter.patch('/:id/estado', (0, auth_1.requireAuth)(['ADMIN_DRE', 'ESPECIALISTA_DRE']), async (req, res) => {
    const id = Number(req.params.id);
    const parsed = updateEstadoSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ message: 'Datos inválidos' });
    const updated = await prisma_1.prisma.resolucion.update({ where: { id }, data: { estado: parsed.data.estado } });
    res.json(updated);
});
//# sourceMappingURL=resoluciones.js.map