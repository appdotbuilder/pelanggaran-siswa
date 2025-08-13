import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type CreateUserInput } from '../schema';
import { login, createUser, getCurrentUser } from '../handlers/auth';
import { eq } from 'drizzle-orm';

// Test input for creating a user
const testCreateUserInput: CreateUserInput = {
  username: 'testuser',
  password: 'password123',
  role: 'teacher'
};

// Test input for admin user
const testCreateAdminInput: CreateUserInput = {
  username: 'admin',
  password: 'adminpass456',
  role: 'admin'
};

// Test input for login
const testLoginInput: LoginInput = {
  username: 'testuser',
  password: 'password123'
};

describe('auth handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createUser', () => {
    it('should create a new user with hashed password', async () => {
      const result = await createUser(testCreateUserInput);

      // Verify returned user data
      expect(result.username).toEqual('testuser');
      expect(result.role).toEqual('teacher');
      expect(result.password).toEqual(''); // Password should not be returned
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save user to database with hashed password', async () => {
      const result = await createUser(testCreateUserInput);

      // Query database to verify user was saved
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(users).toHaveLength(1);
      const savedUser = users[0];
      
      expect(savedUser.username).toEqual('testuser');
      expect(savedUser.role).toEqual('teacher');
      expect(savedUser.password).not.toEqual('password123'); // Password should be hashed
      expect(savedUser.password.length).toBeGreaterThan(20); // Hashed passwords are longer
      expect(savedUser.created_at).toBeInstanceOf(Date);
      expect(savedUser.updated_at).toBeInstanceOf(Date);
    });

    it('should create admin user', async () => {
      const result = await createUser(testCreateAdminInput);

      expect(result.username).toEqual('admin');
      expect(result.role).toEqual('admin');
      expect(result.password).toEqual('');
      expect(result.id).toBeDefined();
    });

    it('should throw error for duplicate username', async () => {
      // Create first user
      await createUser(testCreateUserInput);

      // Attempt to create another user with same username
      await expect(createUser(testCreateUserInput))
        .rejects.toThrow(/username already exists/i);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create a test user before each login test
      await createUser(testCreateUserInput);
    });

    it('should successfully authenticate valid credentials', async () => {
      const result = await login(testLoginInput);

      expect(result.username).toEqual('testuser');
      expect(result.role).toEqual('teacher');
      expect(result.password).toEqual(''); // Password should not be returned
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should throw error for invalid username', async () => {
      const invalidLoginInput: LoginInput = {
        username: 'nonexistent',
        password: 'password123'
      };

      await expect(login(invalidLoginInput))
        .rejects.toThrow(/invalid username or password/i);
    });

    it('should throw error for invalid password', async () => {
      const invalidPasswordInput: LoginInput = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      await expect(login(invalidPasswordInput))
        .rejects.toThrow(/invalid username or password/i);
    });

    it('should authenticate admin user correctly', async () => {
      // Create admin user
      await createUser(testCreateAdminInput);

      const adminLoginInput: LoginInput = {
        username: 'admin',
        password: 'adminpass456'
      };

      const result = await login(adminLoginInput);

      expect(result.username).toEqual('admin');
      expect(result.role).toEqual('admin');
      expect(result.password).toEqual('');
    });
  });

  describe('getCurrentUser', () => {
    let testUserId: number;

    beforeEach(async () => {
      // Create a test user and get its ID
      const createdUser = await createUser(testCreateUserInput);
      testUserId = createdUser.id;
    });

    it('should return user data for valid user ID', async () => {
      const result = await getCurrentUser(testUserId);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(testUserId);
      expect(result!.username).toEqual('testuser');
      expect(result!.role).toEqual('teacher');
      expect(result!.password).toEqual(''); // Password should not be returned
      expect(result!.created_at).toBeInstanceOf(Date);
      expect(result!.updated_at).toBeInstanceOf(Date);
    });

    it('should return null for non-existent user ID', async () => {
      const result = await getCurrentUser(99999);

      expect(result).toBeNull();
    });

    it('should return admin user correctly', async () => {
      // Create admin user
      const adminUser = await createUser(testCreateAdminInput);

      const result = await getCurrentUser(adminUser.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(adminUser.id);
      expect(result!.username).toEqual('admin');
      expect(result!.role).toEqual('admin');
      expect(result!.password).toEqual('');
    });
  });

  describe('password hashing verification', () => {
    it('should verify that password is properly hashed and can be verified', async () => {
      const user = await createUser(testCreateUserInput);

      // Get the hashed password from database
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, user.id))
        .execute();

      const hashedPassword = users[0].password;

      // Verify that the original password matches the hash
      const isValid = await Bun.password.verify('password123', hashedPassword);
      expect(isValid).toBe(true);

      // Verify that wrong password doesn't match
      const isInvalid = await Bun.password.verify('wrongpassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });
  });
});