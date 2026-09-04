const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

async function generateAndroidIcons() {
  const svgPath = path.join(__dirname, '../src/logo.svg');
  const resDir = path.join(__dirname, '../android/app/src/main/res');

  if (!fs.existsSync(svgPath)) {
    console.log('src/logo.svg not found, skipping icon generation');
    return;
  }

  console.log(`Generating Android launcher icons from ${svgPath}...`);

  for (const [folder, size] of Object.entries(sizes)) {
    const targetFolder = path.join(resDir, folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const launcherDest = path.join(targetFolder, 'ic_launcher.png');
    const roundDest = path.join(targetFolder, 'ic_launcher_round.png');
    const foregroundDest = path.join(targetFolder, 'ic_launcher_foreground.png');

    // Generate square launcher icon with dark rounded background
    await sharp(svgPath)
      .trim()
      .resize(size, size, { fit: 'contain', background: { r: 12, g: 15, b: 23, alpha: 1 } })
      .png()
      .toFile(launcherDest);

    // Generate round launcher icon
    await sharp(svgPath)
      .trim()
      .resize(size, size, { fit: 'contain', background: { r: 12, g: 15, b: 23, alpha: 1 } })
      .png()
      .toFile(roundDest);

    // Foreground icon for adaptive icons
    await sharp(svgPath)
      .trim()
      .resize(Math.round(size * 0.72), Math.round(size * 0.72), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: Math.round(size * 0.14),
        bottom: Math.round(size * 0.14),
        left: Math.round(size * 0.14),
        right: Math.round(size * 0.14),
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(foregroundDest);
  }

  console.log('Successfully generated all Android mipmap launcher icons!');
}

generateAndroidIcons().catch((err) => {
  console.error('Error generating android icons:', err);
});
