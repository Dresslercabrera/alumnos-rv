"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./utils/config");
const logger_1 = require("./utils/logger");
const prisma_1 = require("./utils/prisma");
const audit_1 = require("./middleware/audit");
const auth_1 = require("./routes/auth");
const resoluciones_1 = require("./routes/resoluciones");
const documentos_1 = require("./routes/documentos");
const egresados_1 = require("./routes/egresados");
const reportes_1 = require("./routes/reportes");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: config_1.config.origin, credentials: true }));
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '5mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), config_1.config.uploadDir)));
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'dre-hco-titula' });
});
app.use(audit_1.auditMiddleware);
app.use('/api/auth', auth_1.authRouter);
app.use('/api/resoluciones', resoluciones_1.resolucionesRouter);
app.use('/api/documentos', documentos_1.documentosRouter);
app.use('/api/egresados', egresados_1.egresadosRouter);
app.use('/api/reportes', reportes_1.reportesRouter);
// Global Error Handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, _req, res, _next) => {
    logger_1.logger.error(err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Internal Server Error' });
});
const start = async () => {
    const port = config_1.config.port;
    try {
        await prisma_1.prisma.$connect();
        app.listen(port, () => {
            logger_1.logger.info(`Server listening on port ${port}`);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server', error);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=index.js.map