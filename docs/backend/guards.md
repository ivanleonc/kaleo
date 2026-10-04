# Guards

Los guards en Kaleo se aplican **globalmente** desde `app.module.ts`. Se ejecutan en orden determinístico en cada request. Algunos pueden ser bypaseados con decoradores específicos.

## Orden de ejecución

```
Request llega
     ↓
1. ThrottlerGuard       → Rate limiting
     ↓
2. JwtAuthGuard         → Autenticación JWT
     ↓
3. PasswordChangedGuard → Cambio de contraseña obligatorio
     ↓
4. CompanyAccessGuard   → Validación multi-tenant
     ↓
5. PermissionsGuard     → Permisos granulares (por endpoint)
6. RolesGuard           → Roles del sistema (por endpoint)
```

Los guards 5 y 6 solo se activan si el endpoint tiene el decorador correspondiente.

---

## 1. `ThrottlerGuard`

**Propósito:** Previene abuso de la API con rate limiting.

**Configuración global:** 30 requests por minuto por IP.

**Configuración en auth:** Los endpoints sensibles tienen límites más estrictos:
- Login, Register: 5 req/60s
- Forgot password, Reset password: 3 req/60s
- Verify email: 10 req/60s

```ts
// Se configura en app.module.ts:
ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }])

// Límite específico por endpoint:
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('login')
async login(@Body() dto: LoginDto) { ... }
```

**Si se excede:** `429 Too Many Requests`

---

## 2. `JwtAuthGuard`

**Propósito:** Valida que cada request lleve un Bearer token válido y no revocado.

**Flujo:**
1. Extrae `Authorization: Bearer <token>` del header
2. Verifica la firma con `JWT_SECRET`
3. Verifica que el token no haya expirado
4. Verifica que el token no esté en la blacklist (`token_blacklist`)
5. Popula `req.user` con el payload del token

**Bypasear con `@Public()`:**

```ts
@Post('login')
@Public()  // No requiere token — endpoint público
async login(@Body() dto: LoginDto) { ... }
```

**Si falla:** `401 Unauthorized`

---

## 3. `PasswordChangedGuard`

**Propósito:** Bloquea a usuarios con `must_change_password = true` y los redirige a cambiar contraseña.

Cuando un miembro se invita al sistema, se le asigna una contraseña temporal. Este guard bloquea todos los endpoints hasta que cambie su contraseña.

**Bypasear con `@SkipPasswordChanged()`:**

```ts
@Post('change-temporary-password')
@SkipPasswordChanged()  // Permitido aunque must_change_password = true
async changeTemp(@Body() dto: ChangePasswordDto) { ... }
```

**Si se activa:** `403 Forbidden` con mensaje descriptivo

---

## 4. `CompanyAccessGuard`

**Propósito:** Valida que el usuario pertenezca a la empresa indicada en el header `x-company-id`.

**Flujo:**
1. Lee el header `x-company-id`
2. Si el usuario es `is_super_admin`: permite sin verificación (acceso virtual)
3. Verifica en `user_contexts` que `user_id + company_id` existe
4. Establece el companyId verificado en `req.companyId` para uso en controllers

**Cuándo no se aplica:** Endpoints marcados con `@Public()` (no tienen usuario en req).

**Si falla:**
- Header ausente: `400 Bad Request`
- Usuario no pertenece a la empresa: `403 Forbidden`

---

## 5. `PermissionsGuard`

**Propósito:** Verifica que el usuario tenga el permiso granular requerido por el endpoint.

**Uso:**

```ts
@Get()
@RequirePermissions(Permissions.USERS.READ)  // 'users:read'
list(@Headers('x-company-id') companyId: string) { ... }
```

**Lógica:**
- Lee el permiso desde el decorador `@RequirePermissions()`
- Si el usuario es Owner de la empresa: permite siempre (Owner bypasses)
- Si el usuario es `is_super_admin`: permite siempre
- Verifica el permiso en `user.companyPermissions[companyId]`

**Si falla:** `403 Forbidden`

---

## 6. `RolesGuard`

**Propósito:** Verifica que el usuario tenga el rol del sistema requerido.

**Uso:**

```ts
@Delete('roles/:id')
@Roles(SystemRoles.OWNER)  // Solo Owners pueden eliminar roles
remove(@Param('id') id: string) { ... }
```

**Lógica:**
- Lee el rol requerido desde `@Roles()`
- Verifica el rol del usuario en la empresa activa

**Si falla:** `403 Forbidden`

---

## 7. `SuperAdminGuard`

**Propósito:** Restringe endpoints exclusivamente a usuarios con `is_super_admin = true`.

**Uso:**

```ts
@Get('all')
@UseGuards(SuperAdminGuard)  // Solo super-admins
getAllCompanies() { ... }
```

**Diferencia con `@Roles(Owner)`:** `SuperAdminGuard` verifica el flag `is_super_admin` en la DB directamente (no desde el JWT), para evitar desincronización si el flag fue revocado recientemente.

---

## Resumen de decoradores disponibles

| Decorador | Efecto |
|---|---|
| `@Public()` | Bypasea `JwtAuthGuard` — endpoint sin autenticación |
| `@SkipPasswordChanged()` | Bypasea `PasswordChangedGuard` |
| `@RequirePermissions('código')` | Activa `PermissionsGuard` para ese endpoint |
| `@Roles(SystemRoles.OWNER)` | Activa `RolesGuard` para ese endpoint |
| `@CurrentUser()` | Inyecta `req.user` como parámetro de método |
| `@Audit({ skip: true })` | Omite el interceptor de auditoría |
| `@Audit({ skipDiff: true })` | Audita pero no calcula before/after diff |
