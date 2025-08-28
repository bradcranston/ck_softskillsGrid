const fs = require('fs');
const path = require('path');

// Read the source files
const indexHTML = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const indexJS = fs.readFileSync(path.join(__dirname, '../src/index.js'), 'utf8');
const styleCSS = fs.readFileSync(path.join(__dirname, '../src/style.css'), 'utf8');
const dataJSON = fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8');

console.log('📖 Reading files:');
console.log(`  - index.html (${indexHTML.length} chars)`);
console.log(`  - index.js (${indexJS.length} chars)`);
console.log(`  - style.css (${styleCSS.length} chars)`);
console.log(`  - data.json (${dataJSON.length} chars)`);

// Create the consolidated HTML
let consolidatedHTML = indexHTML;

// Replace the CSS import with inline styles
const cssReplaced = consolidatedHTML.replace(
  /<style>\s*@import\s*["']\.\/src\/style\.css["'];\s*<\/style>/,
  `<style>${styleCSS}</style>`
);

if (cssReplaced !== consolidatedHTML) {
  console.log('✅ CSS replacement successful');
  consolidatedHTML = cssReplaced;
} else {
  console.log('❌ CSS replacement failed');
}

// Replace the script placeholder with the actual JavaScript
// First, modify the JavaScript to embed the assessment data
const modifiedJS = indexJS.replace(
  /const response = await fetch\('\.\/data\.json'\);\s*const assessmentData = await response\.json\(\);/,
  `const assessmentData = ${dataJSON};`
);

const jsReplaced = consolidatedHTML.replace(
  /<script>[\s\S]*?INLINE_JS_PLACEHOLDER[\s\S]*?<\/script>/,
  `<script>
${modifiedJS}
</script>`
);

if (jsReplaced !== consolidatedHTML) {
  console.log('✅ JavaScript replacement successful');
  consolidatedHTML = jsReplaced;
} else {
  console.log('❌ JavaScript replacement failed');
  // Try to find the pattern manually
  const scriptMatch = consolidatedHTML.match(/<script>[\s\S]*?INLINE_JS_PLACEHOLDER[\s\S]*?<\/script>/);
  if (scriptMatch) {
    console.log('🔍 Found script pattern:', scriptMatch[0].substring(0, 100) + '...');
  } else {
    console.log('🔍 Script pattern not found');
  }
}

// Ensure the dist directory exists
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Write the consolidated file
fs.writeFileSync(path.join(distDir, 'index.html'), consolidatedHTML);

console.log('✅ Consolidated assessment interface created: dist/index.html');
console.log('📦 Single file contains all HTML, CSS, JavaScript, and assessment data inline');

// Verify the output
const outputSize = fs.statSync(path.join(distDir, 'index.html')).size;
console.log(`📏 File size: ${Math.round(outputSize / 1024)}KB`);

// Check if JavaScript was included
if (consolidatedHTML.includes('window.loadTable')) {
  console.log('✅ JavaScript successfully inlined');
} else {
  console.log('❌ JavaScript not found in output');
}

// Check if assessment data was embedded
if (consolidatedHTML.includes('Attendance & Punctuality')) {
  console.log('✅ Assessment data successfully embedded');
} else {
  console.log('❌ Assessment data not found in output');
}
