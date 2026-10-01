/**
 * Filtro global de excepciones con integración de Sentry.
 *
 * Responsabilidades:
 *  1. Capturar errores inesperados (5xx) y enviarlos a Sentry con contexto
 *     de request (URL, método, userId si existe, request-id).
 *  2. Devolver respuestas de error consistentes sin filtrar stacks en prod.
 *  3. No capturar excepciones HTTP intencionadas (4xx): son comportamiento
 *     esperado y saturarían el dashboard de Sentry con falsos positivos.
 *
 * Activación: define SENTRY_DSN en las env vars de Render.
 * Sin DSN el filtro funciona igual pero no envía eventos.
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const isClientError = status >= 400 && status < 500;

    // Solo reportamos errores inesperados (5xx) a Sentry.
    // Los 4xx son comportamiento esperado de la aplicación.
    if (!isClientError) {
      const requestId = (req.headers['x-request-id'] as string) || 'unknown';
      const userId = (req as any).user?.id || 'anonymous';

      Sentry.withScope((scope) => {
        scope.setTag('request_id', requestId);
        scope.setTag('http_method', req.method);
        scope.setTag('url', req.url);
        scope.setUser({ id: userId });
        scope.setExtra('body', sanitizeBody(req.body));
        scope.setExtra('status_code', status);
        Sentry.captureException(exception);
      });

      this.logger.error(
        `[${req.method}] ${req.url} → ${status} | request-id: ${requestId} | user: ${userId}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const responseBody: Record<string, unknown> = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
    };

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        responseBody.message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        Object.assign(responseBody, exceptionResponse);
      }
    } else {
      // En producción no filtramos el stack; Nest por defecto tampoco lo hace.
      responseBody.message = 'Error interno del servidor. El equipo técnico fue notificado.';
    }

    res.status(status).json(responseBody);
  }
}

/** Redacta campos sensibles antes de enviarlos como contexto a Sentry. */
function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const sensitive = new Set(['password', 'passwordHash', 'password_hash', 'token', 'refreshToken', 'accessToken', 'secret']);
  return Object.fromEntries(
    Object.entries(body as Record<string, unknown>).map(([k, v]) =>
      sensitive.has(k) ? [k, '[REDACTED]'] : [k, v],
    ),
  );
}
