import { Jimp, rgbaToInt } from 'jimp';

async function processIcon() {
  try {
    const icon192 = await Jimp.read('public/icon-192.png');
    const icon512 = await Jimp.read('public/icon-512.png');

    // Create new images with solid dark blue background
    const bg192 = new Jimp({ width: 192, height: 192, color: '#091534' });
    const bg512 = new Jimp({ width: 512, height: 512, color: '#091534' });

    bg192.composite(icon192, 0, 0);
    bg512.composite(icon512, 0, 0);

    await bg192.write('public/icon-maskable-192.png');
    await bg512.write('public/icon-maskable-512.png');

    console.log("Maskable icons successfully created.");
  } catch (err) {
    console.error("Error creating maskable icons:", err);
  }
}

processIcon();
