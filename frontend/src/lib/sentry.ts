/**
 * Sentry SDK — observabilidad de errores frontend.
 *
 * Activación: define VITE_SENTRY_DSN en Cloudflare Pages.
 * Sin esa variable la función no hace nada y el bundle no agrega overhead.
 *
 * Uso: llamar initSentry(app, router) ANTES de app.mount().
 */
import * as Sentry from '@sentry/vue';
import type { App } from 'vue';
import type { Router } from 'vue-router';

export function initSentry(app: App, router: Router): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

  // Sin DSN no hacemos nada: dev-mode o deploys que no quieren telemetría.
  if (!dsn) return;

  Sentry.init({
    app,
    dsn,
    // Integración de router: traza navegaciones como spans.
    integrations: [
      Sentry.browserTracingIntegration({ router }),
      // Replay graba sesiones cuando ocurre un error (1% en prod, 100% en errores).
      Sentry.replayIntegration({
        maskAllText: true,      // Oculta contenido sensible (PII)
        blockAllMedia: true,
      }),
    ],
    // Muestras de performance: 10 % de requests en producción.
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Replay: 0 % de sesiones normales, 100 % cuando hay error.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    // Entorno y release para agrupar eventos.
    environment: import.meta.env.PROD ? 'production' : 'development',
    release: import.meta.env.VITE_APP_VERSION as string | undefined,
    // No capturar errores de extensiones del navegador.
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      /^Loading chunk .+ failed/,
    ],
    // No mandar eventos de localhost.
    beforeSend(event) {
      if (!import.meta.env.PROD) return null;
      return event;
    },
  });
}
