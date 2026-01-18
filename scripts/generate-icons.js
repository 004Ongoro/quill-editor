const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, '..', 'assets', 'icons');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Function to create an icon
function createIcon(size, fileName) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#007acc');
  gradient.addColorStop(1, '#005a9e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Draw a "Q" in the center
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.6}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Q', size / 2, size / 2);
  
  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(assetsDir, fileName), buffer);
}

// Create macOS .icns (requires multiple sizes)
const sizes = [16, 32, 64, 128, 256, 512, 1024];
sizes.forEach(size => {
  createIcon(size, `icon_${size}x${size}.png`);
});

// Create Windows .ico placeholder
createIcon(256, 'icon.ico.png');

// Create Linux icon
createIcon(512, 'icon.png');
