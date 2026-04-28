import sharp from 'sharp';
async function run() {
  await sharp('public/icon-512-original.png')
      .resize(192, 192, { fit: 'contain' })
      .toFile('public/icon-192.png');
  await sharp('public/icon-512-original.png')
      .resize(180, 180, { fit: 'contain' })
      .toFile('public/apple-touch-icon.png');
}
run();
