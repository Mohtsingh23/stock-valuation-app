// Generate PWA icons from SVG
const fs = require('fs');
const { createCanvas } = require('canvas');
const SVG = fs.readFileSync('./public/icons/icon.svg', 'utf-8');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Parse SVG and draw - simplified version
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.125);
  ctx.fill();
  
  // Draw chart line
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size * 0.047;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(size * 0.3125, size * 0.6875);
  ctx.lineTo(size * 0.40625, size * 0.5);
  ctx.lineTo(size * 0.5, size * 0.59375);
  ctx.lineTo(size * 0.6875, size * 0.3125);
  ctx.stroke();
  
  // Draw points
  const points = [
    { x: size * 0.3125, y: size * 0.6875, color: 'white' },
    { x: size * 0.40625, y: size * 0.5, color: '#22c55e' },
    { x: size * 0.5, y: size * 0.59375, color: '#f97316' },
    { x: size * 0.6875, y: size * 0.3125, color: '#22c55e' }
  ];
  
  points.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size * 0.023, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // Draw rupee symbol
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.094}px system-ui`;
  ctx.textAlign = 'center';
  ctx.fillText('₹', size / 2, size * 0.859);
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`./public/icons/icon-${size}x${size}.png`, buffer);
  console.log(`Generated icon-${size}x${size}.png`);
});

console.log('All icons generated!');