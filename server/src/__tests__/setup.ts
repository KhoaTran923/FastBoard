import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

process.env.JWT_SECRET = 'test-jwt-secret-for-tests';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-tests';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
