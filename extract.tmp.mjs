import ts from 'typescript';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

// Vytáhne uvedené deklarace nejvyšší úrovně do nového souboru.
// Chování se nemění: přesouvá se přesný text včetně komentářů, importy se
// zkopírují (nepoužité named importy překladač zahodí, runtime je nedotčen).
const [source, target, ...names] = process.argv.slice(2);
const src = readFileSync(source, 'utf8');
const sf = ts.createSourceFile(source, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

const wanted = new Set(names);
const picked = [];
const imports = [];
for (const st of sf.statements) {
  if (ts.isImportDeclaration(st)) { imports.push(st.getText(sf)); continue; }
  let name = st.name?.text;
  if (!name && ts.isVariableStatement(st)) name = st.declarationList.declarations[0].name.getText(sf);
  if (name && wanted.has(name)) picked.push({ name, start: st.getFullStart(), end: st.getEnd(), text: src.slice(st.getFullStart(), st.getEnd()) });
}
const missing = names.filter(n => !picked.some(p => p.name === n));
if (missing.length) { console.error('CHYBÍ:', missing.join(', ')); process.exit(1); }

// Nový soubor
const srcDir = path.dirname(source);
const tgtDir = path.dirname(target);
const rebase = spec => {
  if (!spec.startsWith('.')) return spec;
  let next = path.relative(tgtDir, path.resolve(srcDir, spec));
  if (!next.startsWith('.')) next = './' + next;
  return next;
};
const fixed = imports.map(text => text.replace(/(['"])(\.[^'"]*)\1/, (m, q, spec) => `${q}${rebase(spec)}${q}`));
const body = picked.map(p => p.text.replace(/^\n+/, '')).join('\n\n');
const exported = body.replace(/^(interface|type|const|function|class) /gm, 'export $1 ');
mkdirSync(path.dirname(target), { recursive: true });
writeFileSync(target, `'use client';\n\n${fixed.join('\n')}\n\n${exported}\n`);

// Původní soubor bez přesunutých deklarací
let out = src;
for (const p of [...picked].sort((a, b) => b.start - a.start)) out = out.slice(0, p.start) + out.slice(p.end);
const importPath = './' + path.relative(path.dirname(source), target).replace(/\.tsx?$/, '');
const anchor = imports[imports.length - 1];
out = out.replace(anchor, `${anchor}\nimport { ${picked.map(p => p.name).join(', ')} } from '${importPath}';`);
writeFileSync(source, out);
console.log(`${target}: ${picked.map(p => p.name).join(', ')}`);
