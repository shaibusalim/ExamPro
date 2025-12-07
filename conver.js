const fs = require('fs');

// Path to your Firebase service account JSON file
const filePath = './serviceAccountKey.json';

const jsonFile = fs.readFileSync(filePath);
const base64 = Buffer.from(jsonFile).toString('base64');

console.log(base64);
