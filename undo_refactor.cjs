const fs = require('fs');
const path = require('path');

const mappings = {
  'text-slate-900 dark:text-white': 'text-white',
  'hover:text-slate-900 dark:hover:text-white': 'hover:text-white',
};

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      for (const [key, value] of Object.entries(mappings)) {
        const escapedKey = key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&');
        const regex = new RegExp(escapedKey, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, value);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Reverted: ${fullPath}`);
      }
    }
  }
}

processDirectory(path.join(__dirname, 'src'));
console.log('Done reverting text-white');
