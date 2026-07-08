const fs = require('fs');
const sharp = require('sharp');
const inPath = 'run-stats-mockup.svg';
const outPath = 'run-stats-mockup.png';
(async ()=>{
  try{
    const input = fs.readFileSync(inPath);
    await sharp(input).png({compressionLevel:9}).toFile(outPath);
    console.log('wrote', outPath);
  }catch(e){
    console.error(e);
    process.exit(1);
  }
})();