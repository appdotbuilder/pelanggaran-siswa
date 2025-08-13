import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, studentsTable, violationsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { 
  type CreateViolationInput, 
  type UpdateViolationInput, 
  type GetViolationsInput 
} from '../schema';
import {
  getViolations,
  getViolationById,
  createViolation,
  updateViolation,
  deleteViolation,
  getViolationsByStudent
} from '../handlers/violations';

// Test data setup
let testUser: any;
let testStudent: any;

const setupTestData = async () => {
  // Create test user (reporter)
  const userResult = await db.insert(usersTable)
    .values({
      username: 'test_teacher',
      password: 'hashedpassword',
      role: 'teacher' as const
    })
    .returning()
    .execute();
  testUser = userResult[0];

  // Create test student
  const studentResult = await db.insert(studentsTable)
    .values({
      nisn: '1234567890',
      name: 'John Doe',
      class: '10A',
      parent_name: 'Jane Doe',
      parent_whatsapp: '+1234567890'
    })
    .returning()
    .execute();
  testStudent = studentResult[0];
};

const testViolationInput: CreateViolationInput = {
  student_id: 0, // Will be set to testStudent.id
  violation_type: 'Late to class',
  location: 'Classroom 10A',
  description: 'Student arrived 15 minutes late',
  photo_url: 'https://example.com/photo.jpg',
  violation_time: new Date('2023-12-01T08:15:00Z'),
  reported_by: 0 // Will be set to testUser.id
};

describe('violations handlers', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
    testViolationInput.student_id = testStudent.id;
    testViolationInput.reported_by = testUser.id;
  });

  afterEach(resetDB);

  describe('createViolation', () => {
    it('should create a violation successfully', async () => {
      const result = await createViolation(testViolationInput);

      expect(result.student_id).toEqual(testStudent.id);
      expect(result.violation_type).toEqual('Late to class');
      expect(result.location).toEqual('Classroom 10A');
      expect(result.description).toEqual('Student arrived 15 minutes late');
      expect(result.photo_url).toEqual('https://example.com/photo.jpg');
      expect(result.reported_by).toEqual(testUser.id);
      expect(result.whatsapp_sent).toEqual(false);
      expect(result.whatsapp_sent_at).toBeNull();
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create violation with null optional fields', async () => {
      const input = {
        ...testViolationInput,
        description: null,
        photo_url: null
      };

      const result = await createViolation(input);

      expect(result.description).toBeNull();
      expect(result.photo_url).toBeNull();
      expect(result.violation_type).toEqual('Late to class');
    });

    it('should throw error for non-existent student', async () => {
      const input = {
        ...testViolationInput,
        student_id: 99999
      };

      await expect(createViolation(input)).rejects.toThrow(/student with id 99999 not found/i);
    });

    it('should throw error for non-existent reporter', async () => {
      const input = {
        ...testViolationInput,
        reported_by: 99999
      };

      await expect(createViolation(input)).rejects.toThrow(/user with id 99999 not found/i);
    });

    it('should save violation to database', async () => {
      const result = await createViolation(testViolationInput);

      const violations = await db.select()
        .from(violationsTable)
        .where(eq(violationsTable.id, result.id))
        .execute();

      expect(violations).toHaveLength(1);
      expect(violations[0].student_id).toEqual(testStudent.id);
      expect(violations[0].violation_type).toEqual('Late to class');
    });
  });

  describe('getViolationById', () => {
    it('should get violation by ID', async () => {
      const created = await createViolation(testViolationInput);
      const result = await getViolationById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.student_id).toEqual(testStudent.id);
      expect(result!.violation_type).toEqual('Late to class');
    });

    it('should return null for non-existent violation', async () => {
      const result = await getViolationById(99999);
      expect(result).toBeNull();
    });
  });

  describe('getViolations', () => {
    it('should get all violations without filters', async () => {
      await createViolation(testViolationInput);
      const secondInput = {
        ...testViolationInput,
        violation_type: 'Uniform violation'
      };
      await createViolation(secondInput);

      const result = await getViolations();

      expect(result).toHaveLength(2);
      // Should be ordered by violation_time descending (newest first)
      expect(result[0].violation_time >= result[1].violation_time).toBe(true);
    });

    it('should filter violations by student_id', async () => {
      // Create another student and violation
      const anotherStudent = await db.insert(studentsTable)
        .values({
          nisn: '0987654321',
          name: 'Jane Smith',
          class: '10B',
          parent_name: 'John Smith',
          parent_whatsapp: '+0987654321'
        })
        .returning()
        .execute();

      await createViolation(testViolationInput);
      await createViolation({
        ...testViolationInput,
        student_id: anotherStudent[0].id
      });

      const input: GetViolationsInput = {
        student_id: testStudent.id
      };

      const result = await getViolations(input);

      expect(result).toHaveLength(1);
      expect(result[0].student_id).toEqual(testStudent.id);
    });

    it('should apply pagination with limit and offset', async () => {
      // Create multiple violations
      for (let i = 0; i < 5; i++) {
        await createViolation({
          ...testViolationInput,
          violation_type: `Violation ${i}`,
          violation_time: new Date(Date.now() + i * 1000)
        });
      }

      const input: GetViolationsInput = {
        limit: 2,
        offset: 1
      };

      const result = await getViolations(input);

      expect(result).toHaveLength(2);
      // Should skip the first (newest) violation due to offset=1
    });

    it('should return empty array when no violations match filter', async () => {
      await createViolation(testViolationInput);

      const input: GetViolationsInput = {
        student_id: 99999
      };

      const result = await getViolations(input);
      expect(result).toHaveLength(0);
    });
  });

  describe('updateViolation', () => {
    it('should update violation fields', async () => {
      const created = await createViolation(testViolationInput);

      const updateInput: UpdateViolationInput = {
        id: created.id,
        violation_type: 'Updated violation type',
        location: 'Updated location',
        description: 'Updated description'
      };

      const result = await updateViolation(updateInput);

      expect(result.violation_type).toEqual('Updated violation type');
      expect(result.location).toEqual('Updated location');
      expect(result.description).toEqual('Updated description');
      expect(result.student_id).toEqual(testStudent.id); // Unchanged
      expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('should update whatsapp_sent status and set timestamp', async () => {
      const created = await createViolation(testViolationInput);
      expect(created.whatsapp_sent).toEqual(false);
      expect(created.whatsapp_sent_at).toBeNull();

      const updateInput: UpdateViolationInput = {
        id: created.id,
        whatsapp_sent: true
      };

      const result = await updateViolation(updateInput);

      expect(result.whatsapp_sent).toEqual(true);
      expect(result.whatsapp_sent_at).toBeInstanceOf(Date);
      expect(result.whatsapp_sent_at!.getTime()).toBeGreaterThan(created.created_at.getTime());
    });

    it('should update student_id when valid student provided', async () => {
      const created = await createViolation(testViolationInput);

      // Create another student
      const anotherStudent = await db.insert(studentsTable)
        .values({
          nisn: '0987654321',
          name: 'Jane Smith',
          class: '10B',
          parent_name: 'John Smith',
          parent_whatsapp: '+0987654321'
        })
        .returning()
        .execute();

      const updateInput: UpdateViolationInput = {
        id: created.id,
        student_id: anotherStudent[0].id
      };

      const result = await updateViolation(updateInput);

      expect(result.student_id).toEqual(anotherStudent[0].id);
    });

    it('should throw error for non-existent violation', async () => {
      const updateInput: UpdateViolationInput = {
        id: 99999,
        violation_type: 'Updated type'
      };

      await expect(updateViolation(updateInput)).rejects.toThrow(/violation with id 99999 not found/i);
    });

    it('should throw error when updating to non-existent student', async () => {
      const created = await createViolation(testViolationInput);

      const updateInput: UpdateViolationInput = {
        id: created.id,
        student_id: 99999
      };

      await expect(updateViolation(updateInput)).rejects.toThrow(/student with id 99999 not found/i);
    });
  });

  describe('deleteViolation', () => {
    it('should delete violation successfully', async () => {
      const created = await createViolation(testViolationInput);

      await deleteViolation(created.id);

      // Verify deletion
      const result = await getViolationById(created.id);
      expect(result).toBeNull();
    });

    it('should throw error for non-existent violation', async () => {
      await expect(deleteViolation(99999)).rejects.toThrow(/violation with id 99999 not found/i);
    });
  });

  describe('getViolationsByStudent', () => {
    it('should get all violations for a student', async () => {
      // Create multiple violations for the same student
      await createViolation(testViolationInput);
      await createViolation({
        ...testViolationInput,
        violation_type: 'Second violation',
        violation_time: new Date(Date.now() + 1000)
      });

      // Create violation for another student
      const anotherStudent = await db.insert(studentsTable)
        .values({
          nisn: '0987654321',
          name: 'Jane Smith',
          class: '10B',
          parent_name: 'John Smith',
          parent_whatsapp: '+0987654321'
        })
        .returning()
        .execute();

      await createViolation({
        ...testViolationInput,
        student_id: anotherStudent[0].id
      });

      const result = await getViolationsByStudent(testStudent.id);

      expect(result).toHaveLength(2);
      expect(result.every(v => v.student_id === testStudent.id)).toBe(true);
      // Should be ordered by violation_time descending
      expect(result[0].violation_time >= result[1].violation_time).toBe(true);
    });

    it('should throw error for non-existent student', async () => {
      await expect(getViolationsByStudent(99999)).rejects.toThrow(/student with id 99999 not found/i);
    });

    it('should return empty array when student has no violations', async () => {
      const anotherStudent = await db.insert(studentsTable)
        .values({
          nisn: '0987654321',
          name: 'Jane Smith',
          class: '10B',
          parent_name: 'John Smith',
          parent_whatsapp: '+0987654321'
        })
        .returning()
        .execute();

      const result = await getViolationsByStudent(anotherStudent[0].id);
      expect(result).toHaveLength(0);
    });
  });
});