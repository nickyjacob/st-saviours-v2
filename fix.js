const fs = require('fs');
let content = fs.readFileSync('components/PitchCalendar.tsx', 'utf8');
const lines = content.split('\n');
const fixed = lines.map(line => {
  if (line.includes('days.map')) {
    return line.replace(/\[days\.map\]\(http:\/\/days\.map\)/g, 'days.map');
  }
  return line;
});
fs.writeFileSync('components/PitchCalendar.tsx', fixed.join('\n'), 'utf8');
console.log('Fixed');
