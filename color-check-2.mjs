import sharp from 'sharp';
async function run() {
  const meta = await sharp('public/icon-512.png').metadata();
  console.log('Final dimensions:', meta.width, meta.height);
  
  // check top left pixel
  const topLeft = await sharp('public/icon-512.png').extract({left:0,top:0,width:1,height:1}).raw().toBuffer();
  console.log('Top left rgb:', topLeft[0], topLeft[1], topLeft[2]);
  
  // check center pixel
  const center = await sharp('public/icon-512.png').extract({left:256,top:256,width:1,height:1}).raw().toBuffer();
  console.log('Center rgb:', center[0], center[1], center[2]);
}
run();
