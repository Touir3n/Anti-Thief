import sharp from 'sharp';
async function run() {
  await sharp('public/icon-512.png')
    .trim({ threshold: 40 })
    .toFile('public/icon-trimmed.png');
    
  const meta = await sharp('public/icon-trimmed.png').metadata();
  console.log('Trimmed dimensions:', meta.width, meta.height);
}
run();
