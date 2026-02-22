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

    // 1. Text-white fix
    content = content.replace(/className=(["'\`\{])(.*?)\1/g, (match, quote, classes) => {
        if (/bg-(blue|emerald|red|slate)-(600|700|800|900)/.test(classes) || /bg-slate-900/.test(classes)) {
            return match; // It's a solid button/background
        }
        let newClasses = classes.replace(/\btext-white\b/g, 'text-gray-900 dark:text-white');

        // Also let's make sure text-slate-900 has a dark mode equivalent
        newClasses = newClasses.replace(/\btext-slate-900\b(?! dark:text-)/g, 'text-slate-900 dark:text-slate-50');
        newClasses = newClasses.replace(/\bbg-white\b(?! dark:bg-)/g, 'bg-white dark:bg-slate-900');

        return `className=${quote}${newClasses}${quote}`;
    });

    // 2. Numeric step fix
    content = content.replace(/step="0\.01"/g, 'step="1"');
    content = content.replace(/<input([^>]*?)type="number"([^>]*?)>/g, (match, before, after) => {
        if (!/step=/.test(match)) {
            return `<input${before}type="number" step="1"${after}>`;
        }
        return match;
    });

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Modified:', file);
    }
});
