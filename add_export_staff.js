const fs = require('fs');
const file = 'web/src/pages/StaffPage.tsx';
const text = fs.readFileSync(file, 'utf8');

// Find line 495 area: closing </div> of batch filter div
// We need to insert export button before line 496 "              </div>"  and line 497 "            </div>"
// Strategy: find the pattern around chevron-down + payBatch
const lines = text.split('\n');
let insertIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('bi-chevron-down') && lines[i].includes('payBatch')) {
    // The closing div of the batch filter wrapper is one line after
    insertIdx = i + 2; // After </div> of the relative wrapper
    console.log(`Found chevron at line ${i+1}, inserting at line ${insertIdx+1}`);
    console.log('Lines around:', lines.slice(i, i+5).join('\n'));
    break;
  }
}

if (insertIdx === -1) {
  // Try different pattern
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('payBatchFilter') && lines[i].includes('All Batches')) {
      console.log(`Found All Batches dropdown at line ${i+1}`);
    }
  }
  console.log('Could not find insertion point');
  process.exit(1);
}

const exportButton = [
  '',
  '                 <button',
  '                   onClick={() => {',
  '                     const allConfirmed = registrations.filter(r => r.status === \'Confirmed\');',
  '                     const balanceStudents = allConfirmed.map(r => {',
  '                       const course = courses.find(c => c.title === r.courseSelected);',
  '                       const netFee = Math.max(0, (course?.totalFee || 0) - (r.discount_amount || 0));',
  '                       const paid = payments.filter(p => p.registration_id === r.id).reduce((s, p) => s + p.amount_paid, 0);',
  '                       const balance = Math.max(0, netFee - paid);',
  '                       return { ...r, netFee, paid, balance };',
  '                     }).filter(r => r.balance > 0);',
  '                     const header = \'ID,Name,Mobile,Course,Batch,Net Fee,Paid,Balance\';',
  '                     const csvRows = balanceStudents.map(r =>',
  '                       `${r.id},"${r.fullName}",${r.mobileNumber},"${r.courseSelected}","${r.preferredBatchTime}",${r.netFee},${r.paid},${r.balance}`',
  '                     );',
  '                     const csv = [header, ...csvRows].join(\'\\n\');',
  '                     const blob = new Blob([csv], { type: \'text/csv\' });',
  '                     const url = URL.createObjectURL(blob);',
  '                     const a = document.createElement(\'a\');',
  '                     a.href = url;',
  "                     a.download = `balance-fees-${new Date().toISOString().split('T')[0]}.csv`;",
  '                     a.click();',
  '                     URL.revokeObjectURL(url);',
  '                   }}',
  '                   className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-2 text-xs font-black text-amber-700 hover:bg-amber-600 hover:text-white transition-all whitespace-nowrap"',
  '                 >',
  '                   <Send size={14} />',
  '                   Export Balance',
  '                 </button>',
];

lines.splice(insertIdx, 0, ...exportButton);
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Export button inserted successfully!');
