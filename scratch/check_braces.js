
import fs from 'fs';

const files = [
    'd:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend/src/features/pathology/PathologistTerminal.jsx',
    'd:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend/src/features/typing/TypistTerminal.jsx',
    'd:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend/src/features/delivery/DeliveryTerminal.jsx'
];

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    console.log(`File: ${file}`);
    console.log(`  Braces: { ${openBraces}, } ${closeBraces} (diff: ${openBraces - closeBraces})`);
    console.log(`  Parens: ( ${openParens}, ) ${closeParens} (diff: ${openParens - closeParens})`);
});
