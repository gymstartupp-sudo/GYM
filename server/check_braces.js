const fs = require('fs');

const content = fs.readFileSync('../client/src/index.css', 'utf8');

let braceCount = 0;
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let char of line) {
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount < 0) {
        console.log(`Extra closing brace at line ${i + 1}: ${line}`);
      }
    }
  }
}

console.log(`Final brace count: ${braceCount}`);
if (braceCount === 0) {
  console.log("All braces are perfectly matched!");
} else {
  console.log("Brace mismatch detected!");
}
