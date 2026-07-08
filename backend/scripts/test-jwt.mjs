import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const secret = process.env.SUPABASE_JWT_SECRET;
console.log('JWT Secret loaded:', secret ? `YES (${secret.length} chars)` : 'NO - missing!');

// Supabase JWTs can be signed with either the raw secret or its base64 decoded version.
// Let's check both by trying to decode a dummy token structure.

// Create a test token using the current secret to verify it works at least for signing
try {
  const testToken = jwt.sign(
    { sub: 'test-user-id', email: 'test@test.com', role: 'authenticated' },
    secret,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
  console.log('✅ JWT signing works with current secret');

  // Now verify it
  const decoded = jwt.verify(testToken, secret, { algorithms: ['HS256'] });
  console.log('✅ JWT verification works with current secret');
  console.log('Decoded sub:', decoded.sub);
} catch (err) {
  console.error('❌ JWT signing/verification failed:', err.message);
}

// Check if the secret might need to be base64 decoded (Supabase uses base64url encoded secret)
try {
  const decodedSecret = Buffer.from(secret, 'base64');
  const testToken2 = jwt.sign(
    { sub: 'test-user-id', email: 'test@test.com', role: 'authenticated' },
    decodedSecret,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
  const decoded2 = jwt.verify(testToken2, decodedSecret, { algorithms: ['HS256'] });
  console.log('✅ JWT also works with base64-DECODED secret');
} catch (err) {
  console.log('ℹ️  Base64-decoded secret variant:', err.message);
}
