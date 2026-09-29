const fs = require('fs');
const path = require('path');

const mappings = {
  // Backgrounds
  'bg-slate-950': 'bg-slate-50 dark:bg-slate-950',
  'bg-slate-900': 'bg-white dark:bg-slate-900',
  'bg-slate-800': 'bg-slate-100 dark:bg-slate-800',
  'bg-slate-700': 'bg-slate-200 dark:bg-slate-700',
  'bg-slate-950/50': 'bg-slate-50/50 dark:bg-slate-950/50',
  'bg-slate-900/80': 'bg-white/80 dark:bg-slate-900/80',
  
  // Texts
  'text-slate-100': 'text-slate-900 dark:text-slate-100',
  'text-slate-200': 'text-slate-800 dark:text-slate-200',
  'text-slate-300': 'text-slate-700 dark:text-slate-300',
  'text-slate-400': 'text-slate-600 dark:text-slate-400',
  // text-slate-500 is roughly center, maybe keep it or map slightly
  
  // Borders
  'border-white/5': 'border-slate-200 dark:border-white/5',
  'border-white/10': 'border-slate-300 dark:border-white/10',
  
  // Whites
  'text-white': 'text-slate-900 dark:text-white',
  'hover:text-white': 'hover:text-slate-900 dark:hover:text-white',
  
  // Divide
  'divide-white/5': 'divide-slate-200 dark:divide-white/5',
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
      
      // We only want to replace whole words that are inside className strings.
      // But a simple global replace is usually fine if we sort by length to avoid partial matches
      // and ensure we don't replace ones that already have dark: prefix.
      
      for (const [key, value] of Object.entries(mappings)) {
        // Regex: match the exact key, not preceded by "dark:"
        const escapedKey = key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
        const regex = new RegExp(`(?<!dark:)${escapedKey}(?!/)`, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, value);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDirectory(path.join(__dirname, 'src'));
console.log('Done refactoring');
