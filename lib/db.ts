import { db } from './firebase'; // Import Firestore db instance

export { db };

// Note: The original handleDbError is removed as Firebase has its own error handling mechanisms.
// You might want to implement a new error handling strategy specific to Firestore if needed.
