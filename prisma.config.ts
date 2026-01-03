// prisma.config.ts
import 'dotenv/config'; // <--- ESTA LÍNEA ES LA CLAVE, PRIMO
import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
});