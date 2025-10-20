"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
require("dotenv/config");
exports.config = {
    port: Number(process.env.PORT || 4000),
    jwtSecret: process.env.JWT_SECRET || 'change_this_secret',
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    origin: process.env.ORIGIN || 'http://localhost:3000',
};
//# sourceMappingURL=config.js.map