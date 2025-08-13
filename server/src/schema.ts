import { z } from 'zod';

// User schema for admin/teacher authentication
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  password: z.string(), // Will be hashed
  role: z.enum(['admin', 'teacher']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Student schema with complete student information
export const studentSchema = z.object({
  id: z.number(),
  nisn: z.string(), // National Student Identification Number
  name: z.string(),
  class: z.string(),
  parent_name: z.string(),
  parent_whatsapp: z.string(), // Parent's WhatsApp number
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Student = z.infer<typeof studentSchema>;

// Violation schema for recording student violations
export const violationSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  violation_type: z.string(),
  location: z.string(),
  description: z.string().nullable(),
  photo_url: z.string().nullable(), // URL to the evidence photo
  violation_time: z.coerce.date(),
  reported_by: z.number(), // User ID who reported the violation
  whatsapp_sent: z.boolean(), // Status if WhatsApp message was sent
  whatsapp_sent_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Violation = z.infer<typeof violationSchema>;

// Login input schema
export const loginInputSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Create user input schema
export const createUserInputSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(['admin', 'teacher'])
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Create student input schema
export const createStudentInputSchema = z.object({
  nisn: z.string().min(1, "NISN is required"),
  name: z.string().min(1, "Student name is required"),
  class: z.string().min(1, "Class is required"),
  parent_name: z.string().min(1, "Parent name is required"),
  parent_whatsapp: z.string().min(1, "Parent WhatsApp number is required")
});

export type CreateStudentInput = z.infer<typeof createStudentInputSchema>;

// Bulk create students input schema for Excel upload
export const bulkCreateStudentsInputSchema = z.object({
  students: z.array(createStudentInputSchema)
});

export type BulkCreateStudentsInput = z.infer<typeof bulkCreateStudentsInputSchema>;

// Update student input schema
export const updateStudentInputSchema = z.object({
  id: z.number(),
  nisn: z.string().optional(),
  name: z.string().optional(),
  class: z.string().optional(),
  parent_name: z.string().optional(),
  parent_whatsapp: z.string().optional()
});

export type UpdateStudentInput = z.infer<typeof updateStudentInputSchema>;

// Create violation input schema
export const createViolationInputSchema = z.object({
  student_id: z.number(),
  violation_type: z.string().min(1, "Violation type is required"),
  location: z.string().min(1, "Location is required"),
  description: z.string().nullable(),
  photo_url: z.string().nullable(),
  violation_time: z.coerce.date(),
  reported_by: z.number() // User ID who is reporting the violation
});

export type CreateViolationInput = z.infer<typeof createViolationInputSchema>;

// Update violation input schema
export const updateViolationInputSchema = z.object({
  id: z.number(),
  student_id: z.number().optional(),
  violation_type: z.string().optional(),
  location: z.string().optional(),
  description: z.string().nullable().optional(),
  photo_url: z.string().nullable().optional(),
  violation_time: z.coerce.date().optional(),
  whatsapp_sent: z.boolean().optional()
});

export type UpdateViolationInput = z.infer<typeof updateViolationInputSchema>;

// Get violations query input schema
export const getViolationsInputSchema = z.object({
  student_id: z.number().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

export type GetViolationsInput = z.infer<typeof getViolationsInputSchema>;

// WhatsApp message input schema
export const sendWhatsAppInputSchema = z.object({
  violation_id: z.number(),
  phone_number: z.string(),
  message: z.string()
});

export type SendWhatsAppInput = z.infer<typeof sendWhatsAppInputSchema>;

// Photo upload input schema
export const uploadPhotoInputSchema = z.object({
  file_data: z.string(), // Base64 encoded image data
  file_name: z.string()
});

export type UploadPhotoInput = z.infer<typeof uploadPhotoInputSchema>;