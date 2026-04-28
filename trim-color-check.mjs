import sharp from 'sharp';
async function run() {
  const buf = await sharp('public/icon-trimmed.png').extract({left:0,top:0,width:1,height:1}).raw().toBuffer();
  console.log('Top left (trimmed) rgb:', buf[0], buf[1], buf[2]);
  
  const buf2 = await sharp('public/icon-trimmed.png').extract({left:450,top:450,width:1,height:1}).raw().toBuffer();
  console.log('Bottom right (trimmed) rgb:', buf2[0], buf2[1], buf2[2]);
  
  const center = await sharp('public/icon-trimmed.png').extract({left:226,top:237,width:1,height:1}).raw().toBuffer();
  console.log('Center (trimmed) rgb:', center[0], center[1], center[2]);
}
run();
