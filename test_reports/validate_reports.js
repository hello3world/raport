// Script to validate all test reports
const fs = require('fs');
const path = require('path');

const reportFiles = [
    'test_report_tec.json',
    'test_report_zsv.json',
    'test_report_pcx.json',
    'test_report_erc.json'
];

console.log('Validating test reports...\n');

let allValid = true;

reportFiles.forEach(file => {
    try {
        const filePath = path.join(__dirname, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        console.log(`✅ ${file} - VALID`);
    } catch (error) {
        console.log(`❌ ${file} - INVALID: ${error.message}`);
        allValid = false;
    }
});

console.log('\n' + (allValid ? 'All reports are valid!' : 'Some reports have errors!'));