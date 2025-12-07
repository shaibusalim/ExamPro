require('dotenv').config();
const admin = require('firebase-admin');

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  console.error('ERROR: Missing Firebase Admin SDK environment variables.');
  console.error('Please ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in your .env file.');
  process.exit(1);
}

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const firestore = admin.firestore();

  // Attempt to fetch a document from a collection (replace with a known collection/doc if possible)
  // This will test if the credentials are valid for a read operation
  firestore.collection('testCollection').doc('testDoc').get()
    .then(doc => {
      if (doc.exists) {
        console.log('Firebase Admin SDK initialized and authenticated successfully! Document data:', doc.data());
      } else {
        console.log('Firebase Admin SDK initialized and authenticated successfully! Test document does not exist, but authentication succeeded.');
      }
      console.log('Firebase Admin SDK is working correctly.');
    })
    .catch(error => {
      console.error('Firebase Admin SDK initialization/authentication failed during Firestore read:', error.message);
      console.error('This indicates an issue with your credentials or permissions.');
    });

} catch (error) {
  console.error('Firebase Admin SDK initialization failed:', error.message);
  console.error('This often indicates malformed credentials in your .env file.');
}
