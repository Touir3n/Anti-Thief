import fs from 'fs';

function getDimension(filePath) {
  const buffer = fs.readFileSync(filePath);
  // PNG magic number and standard IHDR chunk
  if (buffer.toString('utf8', 1, 4) === 'PNG') {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    console.log(`${filePath}: ${width}x${height}`);
  } else {
    console.log(`${filePath}: Not a valid PNG or could not read`);
  }
}

getDimension('./public/icon-192-v2.png');
getDimension('./public/icon-512-v2.png');
