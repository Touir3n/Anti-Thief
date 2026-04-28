import sharp from 'sharp';
async function run() {
  const meta = await sharp('public/icon-512.png').metadata();
  console.log('Dimensions:', meta.width, meta.height);
  const stats = await sharp('public/icon-512.png').stats();
  console.log('Dominant color:', stats.dominant);
}
run();
