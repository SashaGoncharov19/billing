import { describe, it, expect, beforeEach } from 'bun:test'
import { AuthService } from '../../src/modules/auth/auth.service'
import { testDb, resetDb } from '../helpers/db'
import { users } from '@entityseven/db'
import { eq } from 'drizzle-orm'

describe('AuthService', () => {
  beforeEach(async () => {
    await resetDb()
  })

  describe('register', () => {
    it('creates a user with hashed password and provisions a tenant', async () => {
      const result = await AuthService.register({
        email: 'test@example.com',
        password: 'SecurePass123!',
        tenantName: 'Test',
      })

      expect(result.user.email).toBe('test@example.com')
      expect(result.tenant.name).toBe("Test")
      
      const userResult = await testDb.select().from(users).where(eq(users.email, 'test@example.com')).limit(1)
      const user = userResult[0]
      expect(user).toBeDefined()
      expect(user!.passwordHash).not.toBe('SecurePass123!')
    })

    it('throws CONFLICT if email already exists', async () => {
      await AuthService.register({ email: 'duplicate@example.com', password: 'Pass123!', tenantName: 'First' })

      await expect(
        AuthService.register({ email: 'duplicate@example.com', password: 'Different!', tenantName: 'Second' })
      ).rejects.toThrow('Email already exists')
    })
  })

  describe('login', () => {
    it('returns user on valid credentials', async () => {
      await AuthService.register({ email: 'login@example.com', password: 'ValidPass123!', tenantName: 'Login' })
      const user = await AuthService.login('login@example.com', 'ValidPass123!')

      expect(user.email).toBe('login@example.com')
    })

    it('throws same error for wrong password and non-existent email', async () => {
      const err1 = await AuthService.login('nonexistent@test.com', 'Pass123!').catch(e => e)
      const err2 = await AuthService.login('login@example.com', 'WrongPass!').catch(e => e)

      expect(err1.message).toBe('Invalid credentials')
      expect(err2.message).toBe('Invalid credentials')
    })
  })
})
