import fs from 'fs';
const buf = fs.readFileSync('public/icon-512-original.png');
console.log(buf.slice(0, 10));
