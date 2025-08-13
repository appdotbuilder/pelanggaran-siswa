import { serial, text, pgTable, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table for admin and teacher authentication
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(), // Will store hashed password
  role: text('role', { enum: ['admin', 'teacher'] }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Students table with complete student information
export const studentsTable = pgTable('students', {
  id: serial('id').primaryKey(),
  nisn: text('nisn').notNull().unique(), // National Student Identification Number
  name: text('name').notNull(),
  class: text('class').notNull(),
  parent_name: text('parent_name').notNull(),
  parent_whatsapp: text('parent_whatsapp').notNull(), // Parent's WhatsApp number
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Violations table for recording student violations
export const violationsTable = pgTable('violations', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').notNull().references(() => studentsTable.id),
  violation_type: text('violation_type').notNull(),
  location: text('location').notNull(),
  description: text('description'), // Nullable field for additional details
  photo_url: text('photo_url'), // Nullable URL to the evidence photo
  violation_time: timestamp('violation_time').notNull(),
  reported_by: integer('reported_by').notNull().references(() => usersTable.id),
  whatsapp_sent: boolean('whatsapp_sent').default(false).notNull(), // Status if WhatsApp message was sent
  whatsapp_sent_at: timestamp('whatsapp_sent_at'), // When WhatsApp message was sent
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations between tables
export const usersRelations = relations(usersTable, ({ many }) => ({
  violations: many(violationsTable),
}));

export const studentsRelations = relations(studentsTable, ({ many }) => ({
  violations: many(violationsTable),
}));

export const violationsRelations = relations(violationsTable, ({ one }) => ({
  student: one(studentsTable, {
    fields: [violationsTable.student_id],
    references: [studentsTable.id],
  }),
  reporter: one(usersTable, {
    fields: [violationsTable.reported_by],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect; // For SELECT operations
export type NewUser = typeof usersTable.$inferInsert; // For INSERT operations

export type Student = typeof studentsTable.$inferSelect; // For SELECT operations
export type NewStudent = typeof studentsTable.$inferInsert; // For INSERT operations

export type Violation = typeof violationsTable.$inferSelect; // For SELECT operations
export type NewViolation = typeof violationsTable.$inferInsert; // For INSERT operations

// Export all tables and relations for proper query building
export const tables = { 
  users: usersTable, 
  students: studentsTable, 
  violations: violationsTable 
};