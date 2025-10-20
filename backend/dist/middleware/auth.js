"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../utils/config");
const requireAuth = (roles) => {
    return (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No autorizado' });
        }
        const token = authHeader.split(' ')[1];
        try {
            const payload = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
            req.user = payload;
            if (roles && !roles.includes(payload.rol)) {
                return res.status(403).json({ message: 'Permisos insuficientes' });
            }
            next();
        }
        catch {
            return res.status(401).json({ message: 'Token inválido' });
        }
    };
};
exports.requireAuth = requireAuth;
//# sourceMappingURL=auth.js.map