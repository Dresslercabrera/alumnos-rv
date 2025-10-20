"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.egresadosRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../middleware/auth");
const config_1 = require("../utils/config");
const uuid_1 = require("uuid");
exports.egresadosRouter = (0, express_1.Router)();
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, config_1.config.uploadDir),
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${(0, uuid_1.v4)()}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 4 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf')
            return cb(new Error('Solo PDF'));
        cb(null, true);
    },
});
const egresadoSchema = zod_1.z.object({
    institucion: zod_1.z.string().min(1),
    dre: zod_1.z.string().default('DRE HUÁNUCO'),
    nro_serie: zod_1.z.string().optional(),
    fecha_registro_dre: zod_1.z.string().optional(),
    tipo_doc: zod_1.z.enum(['DNI', 'CE', 'PASAPORTE']),
    nro_doc: zod_1.z.string().min(1),
    nombres: zod_1.z.string().min(1),
    apellido_paterno: zod_1.z.string().min(1),
    apellido_materno: zod_1.z.string().min(1),
    sexo: zod_1.z.enum(['M', 'F']),
    carrera: zod_1.z.string().min(1),
    programa: zod_1.z.string().optional(),
    nro_registro_inst: zod_1.z.string().optional(),
    fecha_emision: zod_1.z.string().optional(),
    tipo_titulo: zod_1.z.enum(['ORIGINAL', 'DUPLICADO']),
    comentario: zod_1.z.string().optional(),
    resolucionId: zod_1.z.coerce.number(),
});
exports.egresadosRouter.post('/', (0, auth_1.requireAuth)(['ADMIN_DRE', 'ESPECIALISTA_DRE']), upload.fields([
    { name: 'diploma_anverso', maxCount: 1 },
    { name: 'diploma_reverso', maxCount: 1 },
]), async (req, res) => {
    const parsed = egresadoSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ message: 'Datos inválidos' });
    const files = req.files;
    const anverso = files?.['diploma_anverso']?.[0];
    const reverso = files?.['diploma_reverso']?.[0];
    const created = await prisma_1.prisma.egresado.create({
        data: {
            ...parsed.data,
            fecha_registro_dre: parsed.data.fecha_registro_dre ? new Date(parsed.data.fecha_registro_dre) : null,
            fecha_emision: parsed.data.fecha_emision ? new Date(parsed.data.fecha_emision) : null,
            diploma_anverso_url: anverso ? `/uploads/${anverso.filename}` : null,
            diploma_reverso_url: reverso ? `/uploads/${reverso.filename}` : null,
        },
    });
    res.status(201).json(created);
});
exports.egresadosRouter.get('/by-resolucion/:id', (0, auth_1.requireAuth)(), async (req, res) => {
    const id = Number(req.params.id);
    const list = await prisma_1.prisma.egresado.findMany({ where: { resolucionId: id }, orderBy: { id: 'desc' } });
    res.json(list);
});
exports.egresadosRouter.delete('/:id', (0, auth_1.requireAuth)(['ADMIN_DRE', 'ESPECIALISTA_DRE']), async (req, res) => {
    const id = Number(req.params.id);
    await prisma_1.prisma.egresado.delete({ where: { id } });
    res.json({ ok: true });
});
//# sourceMappingURL=egresados.js.map