import sharp from 'sharp';
import fs from 'fs';

async function main() {
  const size = Math.round(512 / 1.45);
  const offset = Math.round((512 - size) / 2);
  
  // Read original to buffer
  const buffer = fs.readFileSync('public/icon-512.png');
  
  try {
    await sharp(buffer)
      .extract({ width: size, height: size, left: offset, top: offset })
      .resize(512, 512)
      .toFile('public/icon-512-new.png');
      
    await sharp(buffer)
      .extract({ width: size, height: size, left: offset, top: offset })
      .resize(192, 192)
      .toFile('public/icon-192-new.png');
      
    await sharp(buffer)
      .extract({ width: size, height: size, left: offset, top: offset })
      .resize(180, 180)
      .toFile('public/apple-touch-icon-new.png');
      
    fs.renameSync('public/icon-512-new.png', 'public/icon-512.png');
    fs.renameSync('public/icon-192-new.png', 'public/icon-192.png');
    fs.renameSync('public/apple-touch-icon-new.png', 'public/apple-touch-icon.png');
    
    console.log('Finished cropping icons');
  } catch (err) {
    console.error(err);
  }
}
main();
