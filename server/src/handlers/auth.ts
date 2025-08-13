import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User, type CreateUserInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function login(input: LoginInput): Promise<User> {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid username or password');
    }

    const user = users[0];

    // Verify password using Bun's built-in password verification
    const isValidPassword = await Bun.password.verify(input.password, user.password);
    
    if (!isValidPassword) {
      throw new Error('Invalid username or password');
    }

    // Return user data without password
    return {
      id: user.id,
      username: user.username,
      password: '', // Never return password in response
      role: user.role as 'admin' | 'teacher',
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Check if username already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('Username already exists');
    }

    // Hash password using Bun's built-in password hashing
    const hashedPassword = await Bun.password.hash(input.password);

    // Insert new user
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        password: hashedPassword,
        role: input.role
      })
      .returning()
      .execute();

    const user = result[0];

    // Return user data without password
    return {
      id: user.id,
      username: user.username,
      password: '', // Never return password in response
      role: user.role as 'admin' | 'teacher',
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}

export async function getCurrentUser(userId: number): Promise<User | null> {
  try {
    // Find user by ID
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    // Return user data without password
    return {
      id: user.id,
      username: user.username,
      password: '', // Never return password in response
      role: user.role as 'admin' | 'teacher',
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Get current user failed:', error);
    throw error;
  }
}

export async function setupAdminUser(): Promise<{ success: boolean; message: string }> {
  try {
    // Check if admin user already exists
    const existingAdmins = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'user'))
      .execute();

    if (existingAdmins.length > 0) {
      const admin = existingAdmins[0];
      if (admin.role === 'admin') {
        return {
          success: true,
          message: 'Admin user already exists'
        };
      }
    }

    // Create admin user using existing createUser function
    const adminInput: CreateUserInput = {
      username: 'user',
      password: 'user',
      role: 'admin'
    };

    await createUser(adminInput);

    return {
      success: true,
      message: 'Admin user created successfully'
    };
  } catch (error) {
    console.error('Setup admin user failed:', error);
    return {
      success: false,
      message: 'Failed to setup admin user: ' + (error instanceof Error ? error.message : 'Unknown error')
    };
  }
}