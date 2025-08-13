import { db } from '../db';
import { studentsTable, violationsTable } from '../db/schema';
import { type Student, type CreateStudentInput, type UpdateStudentInput, type BulkCreateStudentsInput } from '../schema';
import { eq, sql } from 'drizzle-orm';

export async function getStudents(): Promise<Student[]> {
  try {
    const results = await db.select()
      .from(studentsTable)
      .orderBy(studentsTable.name)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch students:', error);
    throw error;
  }
}

export async function getStudentById(id: number): Promise<Student | null> {
  try {
    const results = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch student by ID:', error);
    throw error;
  }
}

export async function createStudent(input: CreateStudentInput): Promise<Student> {
  try {
    const results = await db.insert(studentsTable)
      .values({
        nisn: input.nisn,
        name: input.name,
        class: input.class,
        parent_name: input.parent_name,
        parent_whatsapp: input.parent_whatsapp
      })
      .returning()
      .execute();

    return results[0];
  } catch (error) {
    console.error('Failed to create student:', error);
    throw error;
  }
}

export async function updateStudent(input: UpdateStudentInput): Promise<Student> {
  try {
    // Build update object with only provided fields
    const updateData: Partial<{
      nisn: string;
      name: string;
      class: string;
      parent_name: string;
      parent_whatsapp: string;
      updated_at: Date;
    }> = {
      updated_at: new Date()
    };

    if (input.nisn !== undefined) updateData.nisn = input.nisn;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.class !== undefined) updateData.class = input.class;
    if (input.parent_name !== undefined) updateData.parent_name = input.parent_name;
    if (input.parent_whatsapp !== undefined) updateData.parent_whatsapp = input.parent_whatsapp;

    const results = await db.update(studentsTable)
      .set(updateData)
      .where(eq(studentsTable.id, input.id))
      .returning()
      .execute();

    if (results.length === 0) {
      throw new Error('Student not found');
    }

    return results[0];
  } catch (error) {
    console.error('Failed to update student:', error);
    throw error;
  }
}

export async function deleteStudent(id: number): Promise<void> {
  try {
    // Check if student has violations
    const violations = await db.select({ count: sql<number>`count(*)` })
      .from(violationsTable)
      .where(eq(violationsTable.student_id, id))
      .execute();

    if (violations[0].count > 0) {
      throw new Error('Cannot delete student with existing violations');
    }

    const results = await db.delete(studentsTable)
      .where(eq(studentsTable.id, id))
      .returning({ id: studentsTable.id })
      .execute();

    if (results.length === 0) {
      throw new Error('Student not found');
    }
  } catch (error) {
    console.error('Failed to delete student:', error);
    throw error;
  }
}

export async function bulkCreateStudents(input: BulkCreateStudentsInput): Promise<Student[]> {
  try {
    const results = await db.insert(studentsTable)
      .values(input.students.map(student => ({
        nisn: student.nisn,
        name: student.name,
        class: student.class,
        parent_name: student.parent_name,
        parent_whatsapp: student.parent_whatsapp
      })))
      .returning()
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to bulk create students:', error);
    throw error;
  }
}

export async function getExcelTemplate(): Promise<Buffer> {
  try {
    // Create a simple CSV template that can be opened in Excel
    const headers = 'NISN,Nama Siswa,Kelas,Nama Orang Tua,Nomor WA Orang Tua\n';
    const sampleRow = '1234567890,Contoh Siswa,XII-A,Contoh Orang Tua,081234567890\n';
    const csvContent = headers + sampleRow;
    
    return Buffer.from(csvContent, 'utf-8');
  } catch (error) {
    console.error('Failed to generate Excel template:', error);
    throw error;
  }
}