import { db } from '../db';
import { violationsTable, studentsTable, usersTable } from '../db/schema';
import { type Violation, type CreateViolationInput, type UpdateViolationInput, type GetViolationsInput } from '../schema';
import { eq, desc, and, SQL } from 'drizzle-orm';

export async function getViolations(input?: GetViolationsInput): Promise<Violation[]> {
  try {
    // Build the complete query without variable reassignment
    const results = await (() => {
      const baseQuery = db.select().from(violationsTable);
      
      // Apply filtering if student_id provided
      if (input?.student_id !== undefined) {
        return baseQuery
          .where(eq(violationsTable.student_id, input.student_id))
          .orderBy(desc(violationsTable.violation_time))
          .limit(input?.limit ?? 1000)
          .offset(input?.offset ?? 0)
          .execute();
      }
      
      // No filtering - just ordering and pagination
      return baseQuery
        .orderBy(desc(violationsTable.violation_time))
        .limit(input?.limit ?? 1000)
        .offset(input?.offset ?? 0)
        .execute();
    })();

    return results;
  } catch (error) {
    console.error('Failed to get violations:', error);
    throw error;
  }
}

export async function getViolationById(id: number): Promise<Violation | null> {
  try {
    const results = await db.select()
      .from(violationsTable)
      .where(eq(violationsTable.id, id))
      .limit(1)
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to get violation by ID:', error);
    throw error;
  }
}

export async function createViolation(input: CreateViolationInput): Promise<Violation> {
  try {
    // Verify student exists
    const student = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, input.student_id))
      .limit(1)
      .execute();

    if (student.length === 0) {
      throw new Error(`Student with ID ${input.student_id} not found`);
    }

    // Verify reporter (user) exists
    const reporter = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.reported_by))
      .limit(1)
      .execute();

    if (reporter.length === 0) {
      throw new Error(`User with ID ${input.reported_by} not found`);
    }

    // Insert violation record
    const result = await db.insert(violationsTable)
      .values({
        student_id: input.student_id,
        violation_type: input.violation_type,
        location: input.location,
        description: input.description,
        photo_url: input.photo_url,
        violation_time: input.violation_time,
        reported_by: input.reported_by,
        whatsapp_sent: false,
        whatsapp_sent_at: null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Violation creation failed:', error);
    throw error;
  }
}

export async function updateViolation(input: UpdateViolationInput): Promise<Violation> {
  try {
    // Check if violation exists
    const existing = await db.select()
      .from(violationsTable)
      .where(eq(violationsTable.id, input.id))
      .limit(1)
      .execute();

    if (existing.length === 0) {
      throw new Error(`Violation with ID ${input.id} not found`);
    }

    // If student_id is being updated, verify the new student exists
    if (input.student_id !== undefined) {
      const student = await db.select()
        .from(studentsTable)
        .where(eq(studentsTable.id, input.student_id))
        .limit(1)
        .execute();

      if (student.length === 0) {
        throw new Error(`Student with ID ${input.student_id} not found`);
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.student_id !== undefined) updateData.student_id = input.student_id;
    if (input.violation_type !== undefined) updateData.violation_type = input.violation_type;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.photo_url !== undefined) updateData.photo_url = input.photo_url;
    if (input.violation_time !== undefined) updateData.violation_time = input.violation_time;
    if (input.whatsapp_sent !== undefined) {
      updateData.whatsapp_sent = input.whatsapp_sent;
      // Set whatsapp_sent_at when marking as sent
      if (input.whatsapp_sent && !existing[0].whatsapp_sent) {
        updateData.whatsapp_sent_at = new Date();
      }
    }

    const result = await db.update(violationsTable)
      .set(updateData)
      .where(eq(violationsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Violation update failed:', error);
    throw error;
  }
}

export async function deleteViolation(id: number): Promise<void> {
  try {
    // Check if violation exists
    const existing = await db.select()
      .from(violationsTable)
      .where(eq(violationsTable.id, id))
      .limit(1)
      .execute();

    if (existing.length === 0) {
      throw new Error(`Violation with ID ${id} not found`);
    }

    await db.delete(violationsTable)
      .where(eq(violationsTable.id, id))
      .execute();
  } catch (error) {
    console.error('Violation deletion failed:', error);
    throw error;
  }
}

export async function getViolationsByStudent(studentId: number): Promise<Violation[]> {
  try {
    // Verify student exists
    const student = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, studentId))
      .limit(1)
      .execute();

    if (student.length === 0) {
      throw new Error(`Student with ID ${studentId} not found`);
    }

    const results = await db.select()
      .from(violationsTable)
      .where(eq(violationsTable.student_id, studentId))
      .orderBy(desc(violationsTable.violation_time))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get violations by student:', error);
    throw error;
  }
}