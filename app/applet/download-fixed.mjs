import https from 'https';
import fs from 'fs';

https.get('https://i.ibb.co/LhRPWTwH/IMG-e3af17e87d8205260ae97dffd53772d4-V.jpg', (res) => {
  const file = fs.createWriteStream('src/logo.jpg');
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Downloaded image successfully!');
    const buf = fs.readFileSync('src/logo.jpg');
    console.log('first bytes:', buf.slice(0, 10));
  });
});
