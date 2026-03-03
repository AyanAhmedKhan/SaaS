import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dir = path.join(__dirname, '..', 'routes');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => path.join(dir, f));

let anyChanges = false;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    // Replace middleware authorize arrays
    content = content.replace(/'class_teacher',\s*'subject_teacher'/g, "'faculty'");
    content = content.replace(/'institute_admin',\s*'class_teacher',\s*'super_admin'/g, "'institute_admin', 'faculty', 'super_admin'");

    // Replace IF checks with OR conditions
    content = content.replace(/req\.user\.role === 'class_teacher' \|\| req\.user\.role === 'subject_teacher'/g, "req.user.role === 'faculty'");
    content = content.replace(/user\.role === 'class_teacher' \|\| user\.role === 'subject_teacher'/g, "user.role === 'faculty'");

    // Replace Array.includes
    content = content.replace(/\['class_teacher',\s*'subject_teacher'\]\.includes\((req\.)?user\.role\)/g, "$1user.role === 'faculty'");

    // Replace literal string roles that are NOT column names
    content = content.replace(/'class_teacher'/g, "'faculty'");
    content = content.replace(/'subject_teacher'/g, "'faculty'");

    if (content !== originalContent) {
        fs.writeFileSync(file, content);
        console.log('Updated', path.basename(file));
        anyChanges = true;
    }
});
if (!anyChanges) console.log('No routes needed updating.');
