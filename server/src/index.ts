import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  loginInputSchema, 
  createUserInputSchema,
  createStudentInputSchema,
  updateStudentInputSchema,
  bulkCreateStudentsInputSchema,
  createViolationInputSchema,
  updateViolationInputSchema,
  getViolationsInputSchema,
  sendWhatsAppInputSchema,
  uploadPhotoInputSchema
} from './schema';

// Import handlers
import { login, createUser, getCurrentUser } from './handlers/auth';
import { 
  getStudents, 
  getStudentById, 
  createStudent, 
  updateStudent, 
  deleteStudent,
  bulkCreateStudents,
  getExcelTemplate
} from './handlers/students';
import { 
  getViolations, 
  getViolationById, 
  createViolation, 
  updateViolation, 
  deleteViolation,
  getViolationsByStudent
} from './handlers/violations';
import { 
  sendWhatsAppMessage, 
  generateViolationMessage, 
  previewWhatsAppMessage,
  markWhatsAppSent
} from './handlers/whatsapp';
import { 
  uploadPhoto, 
  getPhoto, 
  deletePhoto, 
  validatePhotoFormat,
  generatePhotoThumbnail
} from './handlers/photos';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication procedures
  auth: router({
    login: publicProcedure
      .input(loginInputSchema)
      .mutation(({ input }) => login(input)),
    
    createUser: publicProcedure
      .input(createUserInputSchema)
      .mutation(({ input }) => createUser(input)),
    
    getCurrentUser: publicProcedure
      .input(z.number())
      .query(({ input }) => getCurrentUser(input))
  }),

  // Student management procedures
  students: router({
    getAll: publicProcedure
      .query(() => getStudents()),
    
    getById: publicProcedure
      .input(z.number())
      .query(({ input }) => getStudentById(input)),
    
    create: publicProcedure
      .input(createStudentInputSchema)
      .mutation(({ input }) => createStudent(input)),
    
    update: publicProcedure
      .input(updateStudentInputSchema)
      .mutation(({ input }) => updateStudent(input)),
    
    delete: publicProcedure
      .input(z.number())
      .mutation(({ input }) => deleteStudent(input)),
    
    bulkCreate: publicProcedure
      .input(bulkCreateStudentsInputSchema)
      .mutation(({ input }) => bulkCreateStudents(input)),
    
    getExcelTemplate: publicProcedure
      .query(() => getExcelTemplate())
  }),

  // Violation management procedures
  violations: router({
    getAll: publicProcedure
      .input(getViolationsInputSchema.optional())
      .query(({ input }) => getViolations(input)),
    
    getById: publicProcedure
      .input(z.number())
      .query(({ input }) => getViolationById(input)),
    
    getByStudent: publicProcedure
      .input(z.number())
      .query(({ input }) => getViolationsByStudent(input)),
    
    create: publicProcedure
      .input(createViolationInputSchema)
      .mutation(({ input }) => createViolation(input)),
    
    update: publicProcedure
      .input(updateViolationInputSchema)
      .mutation(({ input }) => updateViolation(input)),
    
    delete: publicProcedure
      .input(z.number())
      .mutation(({ input }) => deleteViolation(input))
  }),

  // WhatsApp integration procedures
  whatsapp: router({
    send: publicProcedure
      .input(sendWhatsAppInputSchema)
      .mutation(({ input }) => sendWhatsAppMessage(input)),
    
    generateMessage: publicProcedure
      .input(z.number())
      .query(({ input }) => generateViolationMessage(input)),
    
    preview: publicProcedure
      .input(z.number())
      .query(({ input }) => previewWhatsAppMessage(input)),
    
    markSent: publicProcedure
      .input(z.object({ violationId: z.number(), messageId: z.string() }))
      .mutation(({ input }) => markWhatsAppSent(input.violationId, input.messageId))
  }),

  // Photo management procedures
  photos: router({
    upload: publicProcedure
      .input(uploadPhotoInputSchema)
      .mutation(({ input }) => uploadPhoto(input)),
    
    get: publicProcedure
      .input(z.string())
      .query(({ input }) => getPhoto(input)),
    
    delete: publicProcedure
      .input(z.string())
      .mutation(({ input }) => deletePhoto(input)),
    
    validate: publicProcedure
      .input(z.string())
      .query(({ input }) => validatePhotoFormat(input)),
    
    generateThumbnail: publicProcedure
      .input(z.string())
      .query(({ input }) => generatePhotoThumbnail(input))
  })
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
  console.log(`Student Violation Management System API is ready!`);
}

start();