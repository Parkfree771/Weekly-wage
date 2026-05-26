import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!connectionString) {
  // eslint-disable-next-line no-console
  console.warn('[neon] DATABASE_URL is not set');
}

export const sql = neon(connectionString || '');
