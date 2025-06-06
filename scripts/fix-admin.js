// Script to set up an admin user with proper private key handling
const admin = require('firebase-admin');
const fs = require('fs');

// Read the .env.local file directly
const envFile = fs.readFileSync('.env.local', 'utf8');

// Extract the project ID
const projectIdMatch = envFile.match(/NEXT_PUBLIC_FIREBASE_PROJECT_ID=(.+)/);
const projectId = projectIdMatch ? projectIdMatch[1].trim() : null;

// Extract the client email
const clientEmailMatch = envFile.match(/NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL=(.+)/);
const clientEmail = clientEmailMatch ? clientEmailMatch[1].trim() : null;

// Extract the private key - this is more complex due to newlines
const privateKeyStart = envFile.indexOf('NEXT_PUBLIC_FIREBASE_PRIVATE_KEY="') + 'NEXT_PUBLIC_FIREBASE_PRIVATE_KEY="'.length;
const privateKeyEnd = envFile.indexOf('"', privateKeyStart);
const privateKeyRaw = envFile.substring(privateKeyStart, privateKeyEnd);
const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

console.log("Project ID:", projectId ? "Available" : "Missing");
console.log("Client Email:", clientEmail ? "Available" : "Missing");
console.log("Private Key:", privateKey ? "Available (length: " + privateKey.length + ")" : "Missing");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing required environment variables");
  process.exit(1);
}

try {
  // Initialize Firebase Admin
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  
  console.log("Firebase Admin initialized successfully");
  
  // First create the user if it doesn't exist
  admin.auth().createUser({
    email: 'test@test.com',
    password: 'password123',
    displayName: 'Test Admin',
  })
  .then(userRecord => {
    console.log('User created successfully:', userRecord.uid);
    return admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
  })
  .then(() => {
    console.log('Admin claim set successfully for test@test.com');
    process.exit(0);
  })
  .catch(error => {
    // If user already exists, try to set admin claim
    if (error.code === 'auth/email-already-exists') {
      console.log('User already exists, setting admin claim...');
      admin.auth().getUserByEmail('test@test.com')
        .then(user => {
          return admin.auth().setCustomUserClaims(user.uid, { admin: true });
        })
        .then(() => {
          console.log('Admin claim set successfully for test@test.com');
          process.exit(0);
        })
        .catch(err => {
          console.error('Error setting admin claim:', err);
          process.exit(1);
        });
    } else {
      console.error('Error creating user:', error);
      process.exit(1);
    }
  });
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  process.exit(1);
}