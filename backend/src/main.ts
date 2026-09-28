import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { timingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module.js';

function swaggerBasicAuth(req: Request, res: Response, next: NextFunction) {
  const user = process.env.SWAGGER_USER || '';
  const password = process.env.SWAGGER_PASSWORD || '';
  if (!user || !password) {
    res.status(503).send('Documentación deshabilitada');
    return;
  }

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) {
    res.setHeader('WWW-Authenticate', 'Basic realm="api-docs"');
    res.status(401).send('Autenticación requerida');
    return;
  }

  let decoded = '';
  try {
    decoded = Buffer.from(encoded, 'base64').toString('utf-8');
  } catch {
    res.status(401).send('Credenciales inválidas');
    return;
  }

  const separator = decoded.indexOf(':');
  const providedUser = separator >= 0 ? decoded.slice(0, separator) : decoded;
  const providedPassword = separator >= 0 ? decoded.slice(separator + 1) : '';
  const userBuffer = Buffer.from(providedUser);
  const expectedUserBuffer = Buffer.from(user);
  const passwordBuffer = Buffer.from(providedPassword);
  const expectedPasswordBuffer = Buffer.from(password);

  const userOk = userBuffer.length === expectedUserBuffer.length
    && timingSafeEqual(userBuffer, expectedUserBuffer);
  const passwordOk = passwordBuffer.length === expectedPasswordBuffer.length
    && timingSafeEqual(passwordBuffer, expectedPasswordBuffer);

  if (!userOk || !passwordOk) {
    res.status(401).send('Credenciales inválidas');
    return;
  }
  next();
}

async function bootstrap() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  const app = await NestFactory.create(AppModule);

  // Tras proxy (Render/Cloudflare): IPs reales en req.ip para auditoría
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(helmet({
    // Swagger UI necesita scripts/estilos inline: se relaja CSP solo en docs
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  const config = new DocumentBuilder()
    .setTitle('SaaS API')
    .setDescription('API para el sistema SaaS multi-tenant. Endpoints públicos: register, login, refresh, forgot-password, reset-password. Todos los demás requieren Bearer token. Header obligatorio: x-company-id (UUID de la empresa activa).')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();
  // Documentación: apagada por defecto en producción salvo flag explícito.
  // Cuando está encendida exige Basic Auth (usuario/clave por env, rotables).
  if (process.env.SWAGGER_ENABLED === 'true') {
    const document = SwaggerModule.createDocument(app, config);
    const httpAdapter = app.getHttpAdapter().getInstance();
    httpAdapter.use('/api/docs', swaggerBasicAuth);
    httpAdapter.use('/api/docs-json', swaggerBasicAuth);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
