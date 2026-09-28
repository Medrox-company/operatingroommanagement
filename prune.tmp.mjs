import ts from 'typescript';
import { readFileSync, writeFileSync } from 'node:fs';
// Odstraní z nově vzniklých souborů importy, které se v nich nepoužívají.
// Side-effect importy (bez jmen) zůstávají vždy.
for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const used = new Set();
  const collect = node => {
    if (ts.isIdentifier(node)) used.add(node.text);
    ts.forEachChild(node, collect);
  };
  for (const st of sf.statements) if (!ts.isImportDeclaration(st)) collect(st);
  const edits = [];
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !st.importClause) continue;
    const clause = st.importClause;
    const keepDefault = clause.name && used.has(clause.name.text);
    let named = null;
    if (clause.namedBindings) {
      if (ts.isNamespaceImport(clause.namedBindings)) {
        if (used.has(clause.namedBindings.name.text)) continue;
      } else {
        named = clause.namedBindings.elements.filter(el => used.has(el.name.text));
        if (named.length === clause.namedBindings.elements.length && (!clause.name || keepDefault)) continue;
      }
    } else if (keepDefault) continue;
    const spec = st.moduleSpecifier.getText(sf);
    const typeOnly = clause.isTypeOnly ? 'type ' : '';
    const parts = [];
    if (keepDefault) parts.push(clause.name.text);
    if (named && named.length) parts.push(`{ ${named.map(el => el.getText(sf)).join(', ')} }`);
    const text = parts.length ? `import ${typeOnly}${parts.join(', ')} from ${spec};` : '';
    edits.push({ start: st.getStart(sf), end: st.getEnd(), text, drop: !parts.length });
  }
  let out = src;
  for (const e of edits.sort((a, b) => b.start - a.start)) {
    let start = e.start, end = e.end;
    if (e.drop) { while (out[end] === '\n') end += 1; }
    out = out.slice(0, start) + e.text + out.slice(end);
  }
  if (out !== src) { writeFileSync(file, out); console.log(`upraveno: ${file}`); }
}
