import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dir = path.join(__dirname, '..', '..', '..', 'src');

function processDir(currentDir) {
    const files = fs.readdirSync(currentDir);
    let anyChanges = false;
    files.forEach(f => {
        const fullPath = path.join(currentDir, f);
        if (fs.statSync(fullPath).isDirectory()) {
            if (f !== 'node_modules' && f !== 'dist' && f !== '.git') {
                const subChanges = processDir(fullPath);
                if (subChanges) anyChanges = true;
            }
        } else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            const orig = content;

            content = content.replace(/'class_teacher',\s*'subject_teacher'/g, "'faculty'");
            content = content.replace(/'institute_admin',\s*'class_teacher',\s*'super_admin'/g, "'institute_admin', 'faculty', 'super_admin'");
            content = content.replace(/['"]class_teacher['"]/g, "'faculty'");
            content = content.replace(/['"]subject_teacher['"]/g, "'faculty'");

            if (content !== orig) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated', fullPath);
                anyChanges = true;
            }
        }
    });
    return anyChanges;
}

processDir(dir);
console.log('Done scanning front-end');
