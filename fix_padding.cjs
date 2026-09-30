const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/expense/ExpenseEdit.jsx',
  'src/pages/settings/Settings.jsx',
  'src/pages/income/IncomeEdit.jsx',
  'src/pages/debt/DebtDetail.jsx',
  'src/pages/debt/DebtCreate.jsx',
  'src/pages/transactions/CancelledTransactions.jsx',
  'src/components/ui/FilterBar.jsx'
];

for (const file of files) {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Fix padding
    content = content.replace(/pl-9/g, '!pl-10');
    
    // Shift left absolute elements slightly for better spacing (especially Rp)
    content = content.replace(/absolute left-3 /g, 'absolute left-3.5 ');

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed: ${file}`);
  }
}
console.log('All files fixed');
