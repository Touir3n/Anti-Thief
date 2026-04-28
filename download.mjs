import https from 'https';
import fs from 'fs';

https.get('https://ibb.co/Cs8tZjdD', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const match = data.match(/<link rel="image_src" href="(.*?)"/);
    if (match) {
      const imgUrl = match[1];
      console.log('Image URL:', imgUrl);
      https.get(imgUrl, (imgRes) => {
        const file = fs.createWriteStream('public/icon-512-original.png');
        imgRes.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('Downloaded image successfully!');
        });
      });
    } else {
      console.log('Failed to parse URL', data.slice(0, 500));
    }
  });
});
