const sharp = require('sharp');
sharp('src/logo-clean.jpg')
  .extract({ left: 160, top: 160, width: 1280, height: 1280 })
  .toFile('src/logo-cropped.jpg')
  .then(() => console.log('cropped'))
  .catch(console.error);
