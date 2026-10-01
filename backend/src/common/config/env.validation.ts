/**
 * Esquema de validación de variables de entorno.
 *
 * Se ejecuta al arrancar: si falta una variable o tiene un valor inválido,
 * el servidor lanza un error descriptivo y no arranca a medias.
 *
 * Reglas de diseño:
 * - Variables OBLIGATORIAS para arrancar: sin default, `.required()`.
 * - Variables con fallback seguro: `.default()`.
 * - Variables opt-in (Sentry, Swagger): no obligatorias.
 */
import Joi from 'joi';

export const envValidationSchema = Joi.object({
  // ─── Core (obligatorias) ────────────────────────────────────────────────
  NODE_ENV: Joi.string()
    .valid('development', 'sandbox', 'staging', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
  JWT_SECRET: Joi.string().min(32).required(),

  // ─── CORS / Frontend ────────────────────────────────────────────────────
  // Coma-separado. En producción: URL real del front.
  CORS_ORIGIN: Joi.string().required(),
  FRONTEND_URL: Joi.string().uri().required(),

  // ─── Email (al menos una opción en producción) ──────────────────────────
  BREVO_API_KEY: Joi.string().optional(),
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().port().optional(),
  SMTP_SECURE: Joi.boolean().optional(),
  SMTP_USER: Joi.string().email({ tlds: { allow: false } }).optional(),
  SMTP_PASS: Joi.string().optional(),
  EMAIL_FROM: Joi.string().optional(),

  // ─── Swagger (opt-in, apagado por defecto) ───────────────────────────────
  SWAGGER_ENABLED: Joi.string().valid('true', 'false').default('false'),
  SWAGGER_USER: Joi.string().optional(),
  SWAGGER_PASSWORD: Joi.string().optional(),

  // ─── Observabilidad (opt-in) ─────────────────────────────────────────────
  SENTRY_DSN: Joi.string().uri({ scheme: ['https'] }).optional(),
  APP_VERSION: Joi.string().optional(),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
    .optional(),
}).options({ allowUnknown: true }); // Permite vars del host no declaradas (ej. PATH, HOME)
