/* eslint-disable @typescript-eslint/no-require-imports */
const sharp = require('sharp');

async function createFavicon() {
  const size = 512;
  const logoSize = Math.floor(size * 0.6); // Logo takes 60% of circle
  
  // Create purple circle SVG
  const circleSvg = `
    <svg width="${size}" height="${size}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:rgb(147,51,234);stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgb(168,85,247);stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="url(#grad)" />
    </svg>
  `;
  
  // Resize logo and composite on purple circle
  const logo = await sharp('public/Logo.png')
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  
  await sharp(Buffer.from(circleSvg))
    .composite([{
      input: logo,
      left: Math.floor((size - logoSize) / 2),
      top: Math.floor((size - logoSize) / 2)
    }])
    .png()
    .toFile('app/icon.png');
  
  console.log('✅ Favicon created with purple circle background!');
}

createFavicon().catch(console.error);
