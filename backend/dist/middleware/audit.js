"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditMiddleware = void 0;
const prisma_1 = require("../utils/prisma");
const auditMiddleware = async (req, _res, next) => {
    // Defer writing audit for mutating and auth actions using res.on('finish')
    const start = Date.now();
    req.once('close', () => {
        // noop
    });
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const actionMap = {
        GET: 'VER',
        POST: 'INSERTAR',
        PUT: 'ACTUALIZAR',
        PATCH: 'ACTUALIZAR',
        DELETE: 'ELIMINAR',
    };
    const modulo = req.path.startsWith('/api/auth')
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
                    const usuarioId = req.user?.id ?? null;
                    const descripcion = `${req.method} ${req.originalUrl} ${_resStatusDesc()}`;
                    await prisma_1.prisma.auditoria.create({
                        data: {
                            usuarioId: usuarioId ?? undefined,
                            accion: accion,
                            modulo: modulo,
                            descripcion,
                            ip,
                        },
                    });
                }
                catch {
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
exports.auditMiddleware = auditMiddleware;
//# sourceMappingURL=audit.js.map