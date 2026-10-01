/**
 * Middleware de logging estructurado por request.
 *
 * Para cada petición HTTP:
 *  1. Asigna un `x-request-id` único (UUID v4) si el cliente no trae uno.
 *     El ID se devuelve en la respuesta para correlacionar con Sentry.
 *  2. Loguea la entrada (método + URL + IP) y la salida (status + duración)
 *     en formato JSON estructurado vía pino.
 *
 * En desarrollo (`NODE_ENV !== 'production'`) el log se muestra en texto
 * legible (pino pretty-print off, pero estructurado igual para poder usar jq).
 *
 * El request-id se expone en `req.headers['x-request-id']` para que:
 *  - El filtro de Sentry lo adjunte como tag.
 *  - Los auditores puedan correlacionar `audit_logs` con errores de Sentry.
 */
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  // Excluir los campos internos de pino del output — mantener solo los
  // que aporten valor en el dashboard de Render/Sentry.
  base: { service: 'saas-api', env: process.env.NODE_ENV || 'development' },
  // En producción el output es JSON puro (para Render / Datadog / Loki).
  // En dev se puede pasar por `| pino-pretty` para legibilidad.
  timestamp: pino.stdTimeFunctions.isoTime,
});

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // 1. Asignar/propagar request-id
    const requestId =
      (req.headers['x-request-id'] as string | undefined)?.trim() || randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    const startMs = Date.now();

    // Redactar paths sensibles del log de entrada
    const url = req.originalUrl || req.url;
    const isSensitive = url.includes('/auth/login') || url.includes('/auth/register');

    logger.info({
      type: 'request',
      requestId,
      method: req.method,
      url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      // No loguear el body en endpoints sensibles (contraseñas)
      ...(isSensitive ? {} : { bodyKeys: req.body ? Object.keys(req.body) : [] }),
    });

    // 2. Loguear la respuesta al terminar
    res.on('finish', () => {
      const durationMs = Date.now() - startMs;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

      logger[level]({
        type: 'response',
        requestId,
        method: req.method,
        url,
        statusCode: res.statusCode,
        durationMs,
      });
    });

    next();
  }
}
