import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { studentsTable, usersTable, violationsTable } from '../db/schema';
import { type CreateStudentInput, type UpdateStudentInput, type BulkCreateStudentsInput } from '../schema';
import { 
  getStudents, 
  getStudentById, 
  createStudent, 
  updateStudent, 
  deleteStudent, 
  bulkCreateStudents,
  getExcelTemplate
} from '../handlers/students';
import { eq } from 'drizzle-orm';

// Test data
const testStudentInput: CreateStudentInput = {
  nisn: '1234567890',
  name: 'Test Student',
  class: 'XII-A',
  parent_name: 'Test Parent',
  parent_whatsapp: '081234567890'
};

const testStudentInput2: CreateStudentInput = {
  nisn: '0987654321',
  name: 'Another Student',
  class: 'XI-B',
  parent_name: 'Another Parent',
  parent_whatsapp: '089876543210'
};

const bulkTestInput: BulkCreateStudentsInput = {
  students: [
    {
      nisn: '1111111111',
      name: 'Bulk Student 1',
      class: 'X-A',
      parent_name: 'Parent 1',
      parent_whatsapp: '081111111111'
    },
    {
      nisn: '2222222222',
      name: 'Bulk Student 2',
      class: 'X-B',
      parent_name: 'Parent 2',
      parent_whatsapp: '082222222222'
    }
  ]
};

describe('Student Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createStudent', () => {
    it('should create a student successfully', async () => {
      const result = await createStudent(testStudentInput);

      expect(result.nisn).toBe('1234567890');
      expect(result.name).toBe('Test Student');
      expect(result.class).toBe('XII-A');
      expect(result.parent_name).toBe('Test Parent');
      expect(result.parent_whatsapp).toBe('081234567890');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save student to database', async () => {
      const result = await createStudent(testStudentInput);

      const dbStudents = await db.select()
        .from(studentsTable)
        .where(eq(studentsTable.id, result.id))
        .execute();

      expect(dbStudents).toHaveLength(1);
      expect(dbStudents[0].nisn).toBe('1234567890');
      expect(dbStudents[0].name).toBe('Test Student');
      expect(dbStudents[0].class).toBe('XII-A');
      expect(dbStudents[0].parent_name).toBe('Test Parent');
      expect(dbStudents[0].parent_whatsapp).toBe('081234567890');
    });

    it('should throw error for duplicate NISN', async () => {
      await createStudent(testStudentInput);

      await expect(createStudent(testStudentInput)).rejects.toThrow();
    });
  });

  describe('getStudents', () => {
    it('should return empty array when no students exist', async () => {
      const result = await getStudents();

      expect(result).toEqual([]);
    });

    it('should return all students ordered by name', async () => {
      await createStudent(testStudentInput2); // "Another Student"
      await createStudent(testStudentInput);  // "Test Student"

      const result = await getStudents();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Another Student'); // Should be first alphabetically
      expect(result[1].name).toBe('Test Student');
    });

    it('should return complete student information', async () => {
      await createStudent(testStudentInput);

      const result = await getStudents();

      expect(result).toHaveLength(1);
      const student = result[0];
      expect(student.nisn).toBe('1234567890');
      expect(student.name).toBe('Test Student');
      expect(student.class).toBe('XII-A');
      expect(student.parent_name).toBe('Test Parent');
      expect(student.parent_whatsapp).toBe('081234567890');
      expect(student.id).toBeDefined();
      expect(student.created_at).toBeInstanceOf(Date);
      expect(student.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('getStudentById', () => {
    it('should return null for non-existent student', async () => {
      const result = await getStudentById(999);

      expect(result).toBeNull();
    });

    it('should return student by ID', async () => {
      const created = await createStudent(testStudentInput);

      const result = await getStudentById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(created.id);
      expect(result!.nisn).toBe('1234567890');
      expect(result!.name).toBe('Test Student');
      expect(result!.class).toBe('XII-A');
      expect(result!.parent_name).toBe('Test Parent');
      expect(result!.parent_whatsapp).toBe('081234567890');
    });
  });

  describe('updateStudent', () => {
    it('should update specific fields only', async () => {
      const created = await createStudent(testStudentInput);

      const updateInput: UpdateStudentInput = {
        id: created.id,
        name: 'Updated Name',
        class: 'Updated Class'
      };

      const result = await updateStudent(updateInput);

      expect(result.id).toBe(created.id);
      expect(result.name).toBe('Updated Name');
      expect(result.class).toBe('Updated Class');
      expect(result.nisn).toBe('1234567890'); // Should remain unchanged
      expect(result.parent_name).toBe('Test Parent'); // Should remain unchanged
      expect(result.parent_whatsapp).toBe('081234567890'); // Should remain unchanged
      expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('should update all fields when provided', async () => {
      const created = await createStudent(testStudentInput);

      const updateInput: UpdateStudentInput = {
        id: created.id,
        nisn: '9999999999',
        name: 'New Name',
        class: 'New Class',
        parent_name: 'New Parent',
        parent_whatsapp: '089999999999'
      };

      const result = await updateStudent(updateInput);

      expect(result.nisn).toBe('9999999999');
      expect(result.name).toBe('New Name');
      expect(result.class).toBe('New Class');
      expect(result.parent_name).toBe('New Parent');
      expect(result.parent_whatsapp).toBe('089999999999');
    });

    it('should throw error for non-existent student', async () => {
      const updateInput: UpdateStudentInput = {
        id: 999,
        name: 'Updated Name'
      };

      await expect(updateStudent(updateInput)).rejects.toThrow(/Student not found/i);
    });
  });

  describe('deleteStudent', () => {
    it('should delete student successfully', async () => {
      const created = await createStudent(testStudentInput);

      await deleteStudent(created.id);

      const dbStudents = await db.select()
        .from(studentsTable)
        .where(eq(studentsTable.id, created.id))
        .execute();

      expect(dbStudents).toHaveLength(0);
    });

    it('should throw error for non-existent student', async () => {
      await expect(deleteStudent(999)).rejects.toThrow(/Student not found/i);
    });

    it('should prevent deletion when student has violations', async () => {
      const created = await createStudent(testStudentInput);

      // Create a user to reference in violation
      const user = await db.insert(usersTable)
        .values({
          username: 'testuser',
          password: 'hashed_password',
          role: 'teacher'
        })
        .returning()
        .execute();

      // Create a violation for the student
      await db.insert(violationsTable)
        .values({
          student_id: created.id,
          violation_type: 'Late',
          location: 'Classroom',
          description: 'Test violation',
          photo_url: null,
          violation_time: new Date(),
          reported_by: user[0].id,
          whatsapp_sent: false,
          whatsapp_sent_at: null
        })
        .execute();

      await expect(deleteStudent(created.id)).rejects.toThrow(/Cannot delete student with existing violations/i);
    });
  });

  describe('bulkCreateStudents', () => {
    it('should create multiple students successfully', async () => {
      const result = await bulkCreateStudents(bulkTestInput);

      expect(result).toHaveLength(2);
      
      expect(result[0].nisn).toBe('1111111111');
      expect(result[0].name).toBe('Bulk Student 1');
      expect(result[0].class).toBe('X-A');
      expect(result[0].parent_name).toBe('Parent 1');
      expect(result[0].parent_whatsapp).toBe('081111111111');

      expect(result[1].nisn).toBe('2222222222');
      expect(result[1].name).toBe('Bulk Student 2');
      expect(result[1].class).toBe('X-B');
      expect(result[1].parent_name).toBe('Parent 2');
      expect(result[1].parent_whatsapp).toBe('082222222222');
    });

    it('should save all students to database', async () => {
      const result = await bulkCreateStudents(bulkTestInput);

      const dbStudents = await db.select()
        .from(studentsTable)
        .execute();

      expect(dbStudents).toHaveLength(2);
      const nisnList = dbStudents.map(s => s.nisn);
      expect(nisnList).toContain('1111111111');
      expect(nisnList).toContain('2222222222');
    });

    it('should handle duplicate NISN in bulk creation', async () => {
      const duplicateInput: BulkCreateStudentsInput = {
        students: [
          bulkTestInput.students[0],
          bulkTestInput.students[0] // Duplicate NISN
        ]
      };

      await expect(bulkCreateStudents(duplicateInput)).rejects.toThrow();
    });
  });

  describe('getExcelTemplate', () => {
    it('should return Excel template as Buffer', async () => {
      const result = await getExcelTemplate();

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should contain proper headers', async () => {
      const result = await getExcelTemplate();
      const content = result.toString('utf-8');

      expect(content).toContain('NISN');
      expect(content).toContain('Nama Siswa');
      expect(content).toContain('Kelas');
      expect(content).toContain('Nama Orang Tua');
      expect(content).toContain('Nomor WA Orang Tua');
    });

    it('should contain sample data', async () => {
      const result = await getExcelTemplate();
      const content = result.toString('utf-8');

      expect(content).toContain('Contoh Siswa');
      expect(content).toContain('XII-A');
      expect(content).toContain('Contoh Orang Tua');
    });
  });
});