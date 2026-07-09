const ts = require('typescript');
const fs = require('fs');
const content = fs.readFileSync('/home/z/my-project/lumina-stream/tsconfig.json', 'utf8');
const c = ts.parseConfigFileTextToJson('tsconfig.json', content);
const p = ts.parseJsonConfigFileContent(c.config, ts.sys, '/home/z/my-project/lumina-stream');
const pr = ts.createProgram(p.fileNames, p.options);
const d = ts.getPreEmitDiagnostics(pr);
const srcErrors = d.filter(x => x.file && x.file.fileName.includes('/src/'));
console.log('Errors in src/:', srcErrors.length);
srcErrors.slice(0, 20).forEach(x => {
  const msg = ts.flattenDiagnosticMessageText(x.messageText, '\n');
  const file = x.file.fileName.replace(/.*\/src\//, 'src/');
  const line = ts.getLineAndCharacterOfPosition(x.file, x.start || 0);
  console.log(file + ':' + (line.line + 1) + ' - ' + msg);
});