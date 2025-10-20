"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentosRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../middleware/auth");
const config_1 = require("../utils/config");
const uuid_1 = require("uuid");
exports.documentosRouter = (0, express_1.Router)();
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
const createSchema = zod_1.z.object({
    tipo: zod_1.z.enum(['RESOLUCION_REGISTRO', 'OFICIO', 'SUSTENTO']),
    descripcion: zod_1.z.string().min(1),
    resolucionId: zod_1.z.coerce.number(),
});
exports.documentosRouter.post('/', (0, auth_1.requireAuth)(['ADMIN_DRE', 'ESPECIALISTA_DRE']), upload.single('archivo'), async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ message: 'Datos inválidos' });
    const file = req.file;
    if (!file)
        return res.status(400).json({ message: 'Archivo requerido (PDF)' });
    const created = await prisma_1.prisma.documento.create({
        data: {
            tipo: parsed.data.tipo,
            descripcion: parsed.data.descripcion,
            archivoUrl: `/uploads/${file.filename}`,
            resolucionId: parsed.data.resolucionId,
        },
    });
    res.status(201).json(created);
});
exports.documentosRouter.get('/by-resolucion/:id', (0, auth_1.requireAuth)(), async (req, res) => {
    const id = Number(req.params.id);
    const list = await prisma_1.prisma.documento.findMany({ where: { resolucionId: id }, orderBy: { id: 'desc' } });
    res.json(list);
});
exports.documentosRouter.delete('/:id', (0, auth_1.requireAuth)(['ADMIN_DRE', 'ESPECIALISTA_DRE']), async (req, res) => {
    const id = Number(req.params.id);
    await prisma_1.prisma.documento.delete({ where: { id } });
    res.json({ ok: true });
});
//# sourceMappingURL=documentos.js.map