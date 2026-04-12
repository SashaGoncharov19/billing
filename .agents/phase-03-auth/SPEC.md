# Фаза 03 — Authentication & Authorization

## Мета фази

Реалізувати повну систему аутентифікації (JWT + refresh tokens) та авторизації (RBAC) для Entity Seven платформи.

---

## Залежності

- ✅ Фаза 01 (project setup)
- ✅ Фаза 02 (database schema — таблиці users, memberships)

---

## Структура модуля в `apps/api/src/`

```
src/
├── modules/
│   └── auth/
│       ├── auth.router.ts        ← ElysiaJS router
│       ├── auth.service.ts       ← бізнес-логіка
│       ├── auth.schema.ts        ← zod схеми для input validation
│       ├── auth.types.ts         ← TypeScript типи
│       └── auth.test.ts          ← unit + integration тести
│
├── middleware/
│   ├── authenticate.ts           ← JWT verification middleware
│   ├── authorize.ts              ← RBAC middleware
│   └── rate-limit.ts             ← rate limiting
│
└── lib/
    ├── jwt.ts                    ← JWT утиліти
    ├── password.ts               ← password hashing
    └── cookie.ts                 ← cookie helpers
```

---

## Специфікація ендпоінтів

### `POST /api/v1/auth/register`

**Запит:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Валідація:**
- email: valid email format
- password: мін. 8 символів, хоча б 1 велика, 1 мала, 1 цифра
- name: 2-100 символів

**Відповідь (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "accessToken": "eyJ...",
  "expiresIn": 900
}
```

**Дії:**
1. Перевірка чи email вже існує → 409 Conflict
2. Хешування пароля (Argon2id)
3. Створення user в транзакції
4. Запис в audit_log: `user.registered`
5. Видача access token (15min) + refresh token (httpOnly cookie, 7d)

---

### `POST /api/v1/auth/login`

**Запит:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Відповідь (200):**
```json
{
  "user": { "id": "uuid", "email": "...", "theme": "light", "preferredLanguage": "en" },
  "accessToken": "eyJ...",
  "expiresIn": 900
}
```

**Дії:**
1. Знайти user по email (не розкривати "user не існує" — загальна помилка)
2. Verify password hash
3. Оновити `last_login_at` (якщо є поле) або audit log
4. Встановити refresh token в httpOnly secure cookie
5. Rate limit: 5 спроб за 15 хвилин з одного IP

**Помилки:**
- 401: "Invalid credentials" (однакове для неіснуючого email і неправильного пароля)
- 429: "Too many requests"

---

### `POST /api/v1/auth/logout`

**Auth required:** так

**Дії:**
1. Видалити refresh token з cookie
2. Внести refresh token в blacklist (Redis, TTL до expire)
3. Audit log: `user.logout`

---

### `POST /api/v1/auth/refresh`

**Запит:** refresh token з httpOnly cookie

**Відповідь (200):**
```json
{
  "accessToken": "eyJ...",
  "expiresIn": 900
}
```

**Дії:**
1. Прочитати refresh token з cookie
2. Перевірити що не в blacklist (Redis)
3. Verify JWT signature та expiry
4. Видати новий access token
5. Rotation: видати новий refresh token (старий відкликати)

---

### `GET /api/v1/auth/me`

**Auth required:** так

**Відповідь (200):**
```json
{
  "id": "uuid",
  "email": "...",
  "theme": "light",
  "preferredLanguage": "en",
  "memberships": [
    {
      "tenantId": "uuid",
      "tenantName": "Acme Corp",
      "role": "admin"
    }
  ]
}
```

---

## JWT Специфікація

### Access Token Payload

```typescript
interface AccessTokenPayload {
  sub: string         // user id
  email: string
  tenantId: string    // поточний tenant
  role: string        // роль в цьому tenant
  iat: number
  exp: number
  jti: string         // JWT ID (для revocation)
}
```

### Refresh Token

- Зберігається в httpOnly, Secure, SameSite=Strict cookie
- Назва cookie: `__refresh_token`
- TTL: 7 днів
- JWT signed з окремим секретом або тим самим (але з різним prefix)

---

export const authenticate = new Elysia({ name: 'authenticate' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env['JWT_SECRET']!
    })
  )
  .derive({ as: 'scoped' }, async ({ jwt, headers, status }) => {
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      return status(401, { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' })
    }

    const token = authHeader.slice(7)
    const payload = await jwt.verify(token)
    if (!payload) {
      return status(401, { code: 'TOKEN_EXPIRED', message: 'Access token expired or invalid' })
    }

    return {
      user: {
        id: (payload as any).sub,
        email: (payload as any).email,
        tenantId: (payload as any).tenantId,
        role: (payload as any).role,
      }
    }
  })

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .setJti(crypto.randomUUID())
    .sign(REFRESH_SECRET)
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, ACCESS_SECRET)
  return payload as AccessTokenPayload
}

export async function verifyRefreshToken(token: string) {
  const { payload } = await jwtVerify(token, REFRESH_SECRET)
  return payload
}
```

---

## `lib/password.ts`

```typescript
export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, {
    algorithm: 'argon2id',
    memoryCost: 65536,
    timeCost: 3,
  })
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return Bun.password.verify(password, hash)
}
```

---

## `middleware/authenticate.ts`

```typescript
import { Elysia } from 'elysia'
import { verifyAccessToken } from '../lib/jwt'

export const authenticate = new Elysia({ name: 'authenticate' })
  .derive({ as: 'scoped' }, async ({ headers, status }) => {
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      return status(401, { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' })
    }

    const token = authHeader.slice(7)
    try {
      const payload = await verifyAccessToken(token)
      return {
        user: {
          id: payload.sub,
          email: payload.email,
          tenantId: payload.tenantId,
          role: payload.role,
        }
      }
    } catch {
      return status(401, { code: 'TOKEN_EXPIRED', message: 'Access token expired or invalid' })
    }
  })
```

---

## `middleware/authorize.ts` — RBAC

```typescript
import { Elysia } from 'elysia'
import { authenticate } from './authenticate'

export type Role = 'owner' | 'admin' | 'member'

const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 3,
  admin: 2,
  member: 1,
}

export function requireRole(minRole: Role) {
  return new Elysia({ name: `require-role-${minRole}` })
    .use(authenticate)
    .derive({ as: 'scoped' }, async ({ user, status }) => {
      const userRoleLevel = ROLE_HIERARCHY[user.role as Role] ?? 0
      const requiredLevel = ROLE_HIERARCHY[minRole]

      if (userRoleLevel < requiredLevel) {
        return status(403, { code: 'FORBIDDEN', message: 'Insufficient permissions' })
      }

      return {}
    })
}
```

---

## Rate Limiting

Використовувати Redis для rate limiting:

```typescript
// middleware/rate-limit.ts
// Реалізувати sliding window rate limiter через Redis
// Для auth endpoints: 5 requests / 15min per IP
// Для API endpoints: 100 requests / 1min per user
// При перевищенні: 429 Too Many Requests + Retry-After header
```

---

## Error Format (СТАНДАРТ)

Всі помилки мають повертатися у форматі:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Human readable message",
  "details": {},
  "requestId": "uuid"
}
```

Коди помилок:
- `UNAUTHORIZED` — відсутній або невалідний токен
- `TOKEN_EXPIRED` — токен прострочений
- `FORBIDDEN` — недостатньо прав
- `VALIDATION_ERROR` — помилка валідації input
- `CONFLICT` — email вже існує
- `TOO_MANY_REQUESTS` — rate limit

---

## Тести

### Unit тести (`auth.service.test.ts`)

```typescript
describe('AuthService', () => {
  describe('register', () => {
    it('creates a user with hashed password')
    it('throws ConflictError if email already exists')
    it('creates audit log entry')
  })

  describe('login', () => {
    it('returns tokens on valid credentials')
    it('throws UnauthorizedError on invalid password')
    it('throws UnauthorizedError on non-existent email (same error)')
  })

  describe('refresh', () => {
    it('returns new access token for valid refresh token')
    it('throws if refresh token is in blacklist')
    it('rotates refresh token')
  })
})
```

### Integration тести

```typescript
describe('Auth API', () => {
  it('POST /auth/register — creates user and returns tokens')
  it('POST /auth/login — returns 401 for bad credentials')
  it('POST /auth/login — rate limited after 5 attempts')
  it('GET /auth/me — returns user info with valid token')
  it('GET /auth/me — returns 401 without token')
  it('POST /auth/refresh — refreshes access token')
  it('POST /auth/logout — invalidates refresh token')
})
```

---

## Безпека (NON-NEGOTIABLE)

1. **Argon2id** для хешування паролів (не bcrypt)
2. **httpOnly + Secure + SameSite=Strict** для refresh token cookie
3. **Короткий TTL** для access tokens (15 хвилин)
4. **Refresh token rotation** — старий відкликається при кожному refresh
5. **Однакова помилка** для "неправильний пароль" та "email не існує"
6. **Rate limiting** на логін ендпоінті
7. **Audit log** для всіх auth подій

---

## Definition of Done

- [ ] Всі 5 ендпоінтів реалізовані
- [ ] JWT access token (15min) видається при login/register
- [ ] Refresh token в httpOnly cookie (7d)
- [ ] `authenticate` middleware блокує без токена
- [ ] RBAC `requireRole()` middleware працює
- [ ] Rate limiting на login (5/15min per IP)
- [ ] Refresh token rotation реалізований
- [ ] Blacklist через Redis
- [ ] Unit тести проходять
- [ ] Integration тести проходять

---

## Наступна фаза

➡️ [Фаза 04 — Multi-Tenant System](../phase-04-tenants/SPEC.md)
