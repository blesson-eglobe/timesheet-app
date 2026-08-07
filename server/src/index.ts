import app from './app';
import { env } from './config/env';
import { pool } from './config/db';

async function main() {
  // Test DB connection
  try {
    await pool.query('SELECT 1');
    console.log('✅ MySQL connected');
  } catch (err) {
    console.error('❌ MySQL connection failed:', err);
    process.exit(1);
  }

  app.listen(env.port, () => {
    console.log(`🚀 Server running on http://localhost:${env.port}`);
    console.log(`   Environment: ${env.nodeEnv}`);
  });
}

main();
