import sharp from 'sharp';
async function run() {
  try {
    const meta = await sharp('public/icon-512-original.png').metadata();
    console.log('Original metadata:', meta);
  } catch (err) {
    console.error('Error on original:', err);
  }
}
run();
