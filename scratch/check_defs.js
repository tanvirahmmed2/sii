const fs = require('fs');
const content = fs.readFileSync('psql/website_tables.psql', 'utf8');

const tables = [
  'website_admission_form_fields',
  'website_admission_applicant_info',
  'website_admission_applicant_guardians',
  'website_admission_applicant_addresses',
  'website_student_form_fields',
  'website_student_info',
  'website_student_guardians',
  'website_student_addresses'
];

for (const t of tables) {
  const start = content.indexOf(`CREATE TABLE IF NOT EXISTS ${t}`);
  if (start !== -1) {
    const end = content.indexOf(');', start);
    console.log(content.slice(start, end + 2));
    console.log('-----------------------------------');
  } else {
    console.log(`NOT FOUND: ${t}`);
  }
}
