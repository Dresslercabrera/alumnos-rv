import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './utils/config';
import { logger } from './utils/logger';
import { prisma } from './utils/prisma';
import { auditMiddleware } from './middleware/audit';
import { authRouter } from './routes/auth';
import { resolucionesRouter } from './routes/resoluciones';
import { documentosRouter } from './routes/documentos';
import { egresadosRouter } from './routes/egresados';
import { reportesRouter } from './routes/reportes';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.origin, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(process.cwd(), config.uploadDir)));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'dre-hco-titula' });
});

app.use(auditMiddleware);

app.use('/api/auth', authRouter);
app.use('/api/resoluciones', resolucionesRouter);
app.use('/api/documentos', documentosRouter);
app.use('/api/egresados', egresadosRouter);
app.use('/api/reportes', reportesRouter);

// Global Error Handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal Server Error' });
});

const start = async () => {
  const port = config.port;
  try {
    await prisma.$connect();
    app.listen(port, () => {
      logger.info(`Server listening on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

start();
