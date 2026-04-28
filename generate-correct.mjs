import https from 'https';
import fs from 'fs';
import sharp from 'sharp';

const url = 'https://i.ibb.co/LhRPWTwH/IMG-e3af17e87d8205260ae97dffd53772d4-V.jpg';

https.get(url, (res) => {
  const chunks = [];
  res.on('data', chunk => chunks.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    
    // Generate true PNGs with sharp
    sharp(buffer)
      .resize(192, 192)
      .png()
      .toFile('public/icon-192.png')
      .then(() => console.log('Generated icon-192.png'));
      
    sharp(buffer)
      .resize(512, 512)
      .png()
      .toFile('public/icon-512.png')
      .then(() => console.log('Generated icon-512.png'));
      
    sharp(buffer)
      .resize(180, 180)
      .png()
      .toFile('public/apple-touch-icon.png')
      .then(() => console.log('Generated apple-touch-icon.png'));
      
  });
}).on('error', (e) => {
  console.error(e);
});
