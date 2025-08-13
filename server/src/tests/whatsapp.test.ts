import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, studentsTable, violationsTable } from '../db/schema';
import { type SendWhatsAppInput } from '../schema';
import { 
  sendWhatsAppMessage, 
  generateViolationMessage, 
  previewWhatsAppMessage, 
  markWhatsAppSent 
} from '../handlers/whatsapp';
import { eq } from 'drizzle-orm';

describe('WhatsApp handlers', () => {
  let testUserId: number;
  let testStudentId: number;
  let testViolationId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testteacher',
        password: 'hashedpassword',
        role: 'teacher'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test student
    const studentResult = await db.insert(studentsTable)
      .values({
        nisn: '1234567890',
        name: 'Ahmad Budi',
        class: '12 IPA 1',
        parent_name: 'Pak Ahmad',
        parent_whatsapp: '+6281234567890'
      })
      .returning()
      .execute();
    testStudentId = studentResult[0].id;

    // Create test violation
    const violationResult = await db.insert(violationsTable)
      .values({
        student_id: testStudentId,
        violation_type: 'Terlambat',
        location: 'Gerbang Sekolah',
        description: 'Terlambat 30 menit tanpa keterangan',
        photo_url: 'https://example.com/photo.jpg',
        violation_time: new Date('2024-01-15T07:30:00Z'),
        reported_by: testUserId,
        whatsapp_sent: false
      })
      .returning()
      .execute();
    testViolationId = violationResult[0].id;
  });

  afterEach(resetDB);

  describe('sendWhatsAppMessage', () => {
    const testInput: SendWhatsAppInput = {
      violation_id: 0, // Will be set in tests
      phone_number: '+6281234567890',
      message: 'Test WhatsApp message'
    };

    it('should send WhatsApp message successfully', async () => {
      const input = { ...testInput, violation_id: testViolationId };
      const result = await sendWhatsAppMessage(input);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(typeof result.messageId).toBe('string');
      expect(result.messageId).toMatch(/^wa_\d+_[a-z0-9]+$/);
      expect(result.error).toBeUndefined();
    });

    it('should update violation WhatsApp status after sending', async () => {
      const input = { ...testInput, violation_id: testViolationId };
      const result = await sendWhatsAppMessage(input);

      expect(result.success).toBe(true);

      // Verify database was updated
      const violations = await db.select()
        .from(violationsTable)
        .where(eq(violationsTable.id, testViolationId))
        .execute();

      expect(violations).toHaveLength(1);
      expect(violations[0].whatsapp_sent).toBe(true);
      expect(violations[0].whatsapp_sent_at).toBeInstanceOf(Date);
    });

    it('should fail for non-existent violation', async () => {
      const input = { ...testInput, violation_id: 99999 };
      const result = await sendWhatsAppMessage(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Violation not found');
      expect(result.messageId).toBeUndefined();
    });
  });

  describe('generateViolationMessage', () => {
    it('should generate properly formatted Indonesian message', async () => {
      // Verify the test violation exists first
      const testViolations = await db.select()
        .from(violationsTable)
        .where(eq(violationsTable.id, testViolationId))
        .execute();
      
      expect(testViolations).toHaveLength(1);
      const message = await generateViolationMessage(testViolationId);

      expect(message).toContain("Assalamu'alaikum Bapak/Ibu");
      expect(message).toContain('Ahmad Budi'); // Student name
      expect(message).toContain('12 IPA 1'); // Student class
      expect(message).toContain('1234567890'); // Student NISN
      expect(message).toContain('Terlambat'); // Violation type
      expect(message).toContain('Gerbang Sekolah'); // Location
      expect(message).toContain('Terlambat 30 menit tanpa keterangan'); // Description
      expect(message).toContain('https://example.com/photo.jpg'); // Photo URL
      expect(message).toContain('Senin, 15 Januari 2024'); // Indonesian date format
      expect(message).toMatch(/\d{2}\.\d{2}/); // Time format (flexible)
      expect(message).toContain('Hormat kami');
      expect(message).toContain('Sekolah');
    });

    it('should handle violation without description', async () => {
      // Create violation without description
      const violationResult = await db.insert(violationsTable)
        .values({
          student_id: testStudentId,
          violation_type: 'Tidak Berseragam',
          location: 'Kelas',
          description: null,
          photo_url: null,
          violation_time: new Date('2024-01-15T08:00:00Z'),
          reported_by: testUserId,
          whatsapp_sent: false
        })
        .returning()
        .execute();

      const message = await generateViolationMessage(violationResult[0].id);

      expect(message).not.toContain('Keterangan:');
      expect(message).not.toContain('Bukti foto:');
      expect(message).toContain('Tidak Berseragam');
    });

    it('should fail for non-existent violation', async () => {
      await expect(generateViolationMessage(99999)).rejects.toThrow(/violation not found/i);
    });
  });

  describe('previewWhatsAppMessage', () => {
    it('should generate preview with violation details', async () => {
      // Verify the test violation exists first
      const testViolations = await db.select()
        .from(violationsTable)
        .where(eq(violationsTable.id, testViolationId))
        .execute();
      
      expect(testViolations).toHaveLength(1);
      const preview = await previewWhatsAppMessage(testViolationId);

      expect(preview.message).toContain("Assalamu'alaikum Bapak/Ibu");
      expect(preview.recipient).toBe('+6281234567890');
      expect(preview.studentName).toBe('Ahmad Budi');
      expect(preview.violationType).toBe('Terlambat');
    });

    it('should fail for non-existent violation', async () => {
      await expect(previewWhatsAppMessage(99999)).rejects.toThrow(/violation not found/i);
    });
  });

  describe('markWhatsAppSent', () => {
    it('should mark violation as WhatsApp sent', async () => {
      const messageId = 'test_message_123';
      
      // Verify initial state
      let violations = await db.select()
        .from(violationsTable)
        .where(eq(violationsTable.id, testViolationId))
        .execute();
      
      expect(violations[0].whatsapp_sent).toBe(false);
      expect(violations[0].whatsapp_sent_at).toBe(null);

      // Mark as sent
      await markWhatsAppSent(testViolationId, messageId);

      // Verify updated state
      violations = await db.select()
        .from(violationsTable)
        .where(eq(violationsTable.id, testViolationId))
        .execute();

      expect(violations[0].whatsapp_sent).toBe(true);
      expect(violations[0].whatsapp_sent_at).toBeInstanceOf(Date);
      expect(violations[0].whatsapp_sent_at).not.toBe(null);
    });

    it('should update existing WhatsApp status', async () => {
      // First mark as sent
      await markWhatsAppSent(testViolationId, 'first_message');
      
      const firstUpdate = await db.select()
        .from(violationsTable)
        .where(eq(violationsTable.id, testViolationId))
        .execute();
      
      const firstTimestamp = firstUpdate[0].whatsapp_sent_at;

      // Wait a bit and mark as sent again
      await new Promise(resolve => setTimeout(resolve, 10));
      await markWhatsAppSent(testViolationId, 'second_message');

      const secondUpdate = await db.select()
        .from(violationsTable)
        .where(eq(violationsTable.id, testViolationId))
        .execute();

      expect(secondUpdate[0].whatsapp_sent).toBe(true);
      expect(secondUpdate[0].whatsapp_sent_at).toBeInstanceOf(Date);
      expect(secondUpdate[0].whatsapp_sent_at!.getTime()).toBeGreaterThan(firstTimestamp!.getTime());
    });
  });

  describe('integration test', () => {
    it('should complete full WhatsApp workflow', async () => {
      const input: SendWhatsAppInput = {
        violation_id: testViolationId,
        phone_number: '+6281234567890',
        message: 'Test message'
      };

      // 1. Generate preview
      const preview = await previewWhatsAppMessage(testViolationId);
      expect(preview.studentName).toBe('Ahmad Budi');
      expect(preview.recipient).toBe('+6281234567890');

      // 2. Send WhatsApp message
      const sendResult = await sendWhatsAppMessage(input);
      expect(sendResult.success).toBe(true);
      expect(sendResult.messageId).toBeDefined();

      // 3. Verify final state
      const violations = await db.select()
        .from(violationsTable)
        .where(eq(violationsTable.id, testViolationId))
        .execute();

      expect(violations[0].whatsapp_sent).toBe(true);
      expect(violations[0].whatsapp_sent_at).toBeInstanceOf(Date);
    });
  });
});