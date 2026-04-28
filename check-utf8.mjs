import fs from 'fs';
const buf = fs.readFileSync('public/icon-512-original.png');
let count = 0;
for (let i = 0; i < buf.length - 2; i++) {
  if (buf[i] === 0xef && buf[i+1] === 0xbf && buf[i+2] === 0xbd) {
    count++;
  }
}
console.log('utf8 replacement chars:', count);
