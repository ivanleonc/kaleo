# Rotación de secretos

> **Alcance:** `JWT_SECRET` y password de la base de datos en producción.
> **Regla:** rotar un secreto invalida sesiones o conexiones; hacerlo en ventana controlada y verificar después.

## Orden recomendado

1. TLS desplegado y health check en verde.
2. Rotar `JWT_SECRET`.
3. Rotar password de base de datos.
4. Verificar login, health y auditoría.

No rotar ambos a la vez: si algo falla, no sabrás cuál fue.

## 1. Rotar `JWT_SECRET`

### Impacto

- Todos los access y refresh tokens emitidos dejan de ser válidos.
- Los usuarios deben iniciar sesión de nuevo.
- No se pierden datos.

### Pasos

1. Generar un secreto nuevo (mínimo 32 caracteres):

```bash
openssl rand -base64 48
```

2. En Render → servicio backend → **Environment** → editar `JWT_SECRET` → guardar.
   Render redeploya automáticamente.

3. Actualizar el archivo local `backend/.env.production` con el mismo valor (solo para `dev:prod`).

4. Usar un valor **distinto** en `backend/.env.development`. Nunca compartir el secreto entre ambientes.

5. Verificar:

```bash
curl -s https://<api>/health
```

- Login con un usuario real.
- `GET /api/auth/me` con el token nuevo.
- Un token viejo debe responder `401`.

### Rollback

Si el login falla, restaurar el valor anterior en Render y redeployar. Los tokens viejos vuelven a ser válidos.

## 2. Rotar password de base de datos

### Impacto

- La aplicación pierde la conexión hasta que Render tenga la nueva `DATABASE_URL`.
- Ventana de indisponibilidad de segundos a minutos.
- No se pierden datos.

### Pasos

1. Supabase → proyecto producción → **Database Settings** → **Reset database password**.
2. Copiar la nueva password.
3. Construir la nueva `DATABASE_URL` con el **transaction pooler** (`:6543`) y el usuario `postgres.<ref>`.
4. En Render → **Environment** → actualizar `DATABASE_URL` → guardar.
5. Actualizar `backend/.env.production` local.
6. Verificar health y login.

Si la password contiene caracteres especiales, URL-encodearla.

### Rollback

Supabase no muestra la password anterior. Si algo falla, resetear de nuevo y actualizar Render en el mismo paso. Tener el dashboard abierto y hacerlo rápido.

## 3. Rotar secretos de staging

Staging tiene su propio `JWT_SECRET` y su propia password. Rotarlos no afecta producción.

## 4. Verificación final

- [ ] `GET /health` devuelve `database: up`.
- [ ] Login funciona.
- [ ] `GET /api/auth/me` funciona con token nuevo.
- [ ] Un token anterior devuelve `401`.
- [ ] `GET /api/features` responde con `x-company-id`.
- [ ] No hay errores de TLS ni de autenticación en Render.
- [ ] El usuario afectado fue avisado del cierre de sesiones.

## Buenos hábitos

- Secretos distintos por ambiente.
- Nunca pegar secretos en issues, chats o commits.
- Rotar también si alguien deja el equipo o si un secreto se expuso.
- Guardar el procedimiento y la fecha de rotación.
