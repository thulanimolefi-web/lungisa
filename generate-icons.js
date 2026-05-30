const sharp = require('sharp');
const path = require('path');

const SOURCE = path.join(__dirname, 'public/icons/source.png');
const OUT = path.join(__dirname, 'public/icons');
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function run() {
  for (const size of SIZES) {
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 196, g: 98, b: 45, alpha: 1 } })
      .png()
      .toFile(path.join(OUT, `icon-${size}x${size}.png`));
    console.log(`✓ icon-${size}x${size}.png`);
  }
  console.log('Done!');
}
run().catch(console.error);