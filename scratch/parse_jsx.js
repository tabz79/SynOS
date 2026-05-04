
import fs from 'fs';
import { parse } from '@babel/parser';

const files = [
    'd:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend/src/features/pathology/PathologistTerminal.jsx',
    'd:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend/src/features/typing/TypistTerminal.jsx',
    'd:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend/src/features/delivery/DeliveryTerminal.jsx'
];

files.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        parse(content, {
            sourceType: 'module',
            plugins: ['jsx']
        });
        console.log(`File: ${file} - OK`);
    } catch (e) {
        console.log(`File: ${file} - ERROR: ${e.message}`);
    }
});
