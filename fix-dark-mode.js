const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        let filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else if (filePath.endsWith('.tsx')) {
            results.push(filePath);
        }
    });
    return results;
}

const files = walk('./src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    content = content.replace(/className=(["'\`\{])([^"'\`\}]*?)\1/g, (match, quote, classes) => {
        let newClasses = classes;
        // Text colors
        newClasses = newClasses.replace(/\btext-slate-800\b(?! *dark:text-)/g, 'text-slate-800 dark:text-slate-50');
        newClasses = newClasses.replace(/\btext-slate-900\b(?! *dark:text-)/g, 'text-slate-900 dark:text-slate-50');
        newClasses = newClasses.replace(/\btext-slate-700\b(?! *dark:text-)/g, 'text-slate-700 dark:text-slate-200');
        newClasses = newClasses.replace(/\btext-slate-600\b(?! *dark:text-)/g, 'text-slate-600 dark:text-slate-300');
        newClasses = newClasses.replace(/\btext-slate-500\b(?! *dark:text-)/g, 'text-slate-500 dark:text-slate-400');

        // Borders
        newClasses = newClasses.replace(/\bborder-slate-200\b(?! *dark:border-)/g, 'border-slate-200 dark:border-slate-800');
        newClasses = newClasses.replace(/\bborder-slate-300\b(?! *dark:border-)/g, 'border-slate-300 dark:border-slate-700');
        newClasses = newClasses.replace(/\bborder-slate-100\b(?! *dark:border-)/g, 'border-slate-100 dark:border-slate-800/50');

        // Backgrounds (non-solid, i.e., card backgrounds)
        newClasses = newClasses.replace(/\bbg-white\b(?! *dark:bg-)/g, 'bg-white dark:bg-slate-900');
        newClasses = newClasses.replace(/\bbg-slate-50\b(?! *dark:bg-)/g, 'bg-slate-50 dark:bg-slate-800/50');

        return `className=${quote}${newClasses}${quote}`;
    });

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Modified:', file);
    }
});
