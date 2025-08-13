import { db } from '../db';
import { violationsTable, studentsTable, usersTable } from '../db/schema';
import { type SendWhatsAppInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function sendWhatsAppMessage(input: SendWhatsAppInput): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // In a real implementation, this would integrate with WhatsApp Business API
    // For now, we'll simulate sending and update the database
    
    // Validate that the violation exists
    const violation = await db.select()
      .from(violationsTable)
      .where(eq(violationsTable.id, input.violation_id))
      .limit(1)
      .execute();
    
    if (violation.length === 0) {
      return {
        success: false,
        error: 'Violation not found'
      };
    }
    
    // Simulate WhatsApp API call - in production, integrate with actual WhatsApp Business API
    const messageId = `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Update violation record to mark WhatsApp as sent
    await markWhatsAppSent(input.violation_id, messageId);
    
    return {
      success: true,
      messageId
    };
  } catch (error) {
    console.error('WhatsApp send failed:', error);
    return {
      success: false,
      error: 'Failed to send WhatsApp message'
    };
  }
}

export async function generateViolationMessage(violationId: number): Promise<string> {
  try {
    // Fetch violation with related student data
    const results = await db.select()
      .from(violationsTable)
      .innerJoin(studentsTable, eq(violationsTable.student_id, studentsTable.id))
      .where(eq(violationsTable.id, violationId))
      .limit(1)
      .execute();
    
    if (results.length === 0) {
      throw new Error('Violation not found');
    }
    
    const result = results[0];
    // In drizzle joins, data is accessed via table names from schema
    const violation = (result as any).violations;
    const student = (result as any).students;
    
    // Format date and time in Indonesian locale
    const violationDate = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(violation.violation_time);
    
    const violationTime = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(violation.violation_time);
    
    // Generate formatted message
    let message = `Assalamu'alaikum Bapak/Ibu,

Kami dari pihak sekolah ingin memberitahukan bahwa anak Bapak/Ibu:

Nama: ${student.name}
Kelas: ${student.class}
NISN: ${student.nisn}

Telah melakukan pelanggaran pada:
Hari/Tanggal: ${violationDate}
Waktu: ${violationTime}
Jenis Pelanggaran: ${violation.violation_type}
Lokasi: ${violation.location}`;

    // Add description if provided
    if (violation.description) {
      message += `\nKeterangan: ${violation.description}`;
    }
    
    // Add photo link if available
    if (violation.photo_url) {
      message += `\n\nBukti foto: ${violation.photo_url}`;
    }
    
    message += `\n\nMohon untuk memberikan pembinaan kepada anak Bapak/Ibu di rumah.

Terima kasih atas perhatiannya.

Hormat kami,
Sekolah`;
    
    return message;
  } catch (error) {
    console.error('Generate violation message failed:', error);
    throw error;
  }
}

export async function previewWhatsAppMessage(violationId: number): Promise<{ 
  message: string; 
  recipient: string; 
  studentName: string; 
  violationType: string; 
}> {
  try {
    // Fetch violation with related student data
    const results = await db.select()
      .from(violationsTable)
      .innerJoin(studentsTable, eq(violationsTable.student_id, studentsTable.id))
      .where(eq(violationsTable.id, violationId))
      .limit(1)
      .execute();
    
    if (results.length === 0) {
      throw new Error('Violation not found');
    }
    
    const result = results[0];
    // In drizzle joins, data is accessed via table names from schema
    const violation = (result as any).violations;
    const student = (result as any).students;
    
    // Generate the message
    const message = await generateViolationMessage(violationId);
    
    return {
      message,
      recipient: student.parent_whatsapp,
      studentName: student.name,
      violationType: violation.violation_type
    };
  } catch (error) {
    console.error('Preview WhatsApp message failed:', error);
    throw error;
  }
}

export async function markWhatsAppSent(violationId: number, messageId: string): Promise<void> {
  try {
    // Update violation record to mark WhatsApp as sent
    await db.update(violationsTable)
      .set({
        whatsapp_sent: true,
        whatsapp_sent_at: new Date()
      })
      .where(eq(violationsTable.id, violationId))
      .execute();
  } catch (error) {
    console.error('Mark WhatsApp sent failed:', error);
    throw error;
  }
}