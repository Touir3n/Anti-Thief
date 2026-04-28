import sharp from 'sharp';
import fs from 'fs';

async function main() {
  const original = 'public/icon-512-original.png';
  if (!fs.existsSync(original)) {
    fs.copyFileSync('public/icon-512.png', original);
  }

  try {
    // 1. Trim the whitespace.
    // 2. Resize to completely fill the bounds, but we need to keep it square.
    //    Actually, let's resize it with 'contain' or 'cover'. If we just resize to 512x512, it might stretch.
    //    Let's contain it in 512x512 with a transparent background. Wait, if it's a square logo, trim will be close to square.
    
    await sharp(original)
      .trim({ background: '#ffffff', threshold: 10 }) // trim the white background
      .resize(512, 512, { 
        fit: 'contain', 
        background: { r: 0, g: 0, b: 0, alpha: 0 } // clear background
      })
      .toFile('public/icon-512.png');
      
    await sharp('public/icon-512.png')
      .resize(192, 192)
      .toFile('public/icon-192.png');
      
    await sharp('public/icon-512.png')
      .resize(180, 180)
      .toFile('public/apple-touch-icon.png');
    
    console.log('Finished precise trimming');
  } catch (err) {
    console.error(err);
  }
}
main();
