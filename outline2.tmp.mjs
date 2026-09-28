import ts from 'typescript';
import { readFileSync } from 'node:fs';
const file = process.argv[2];
const src = readFileSync(file,'utf8');
const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const line = p => sf.getLineAndCharacterOfPosition(p).line + 1;
for (const st of sf.statements) {
  let name='';
  if (st.name?.text) name=st.name.text;
  else if (ts.isVariableStatement(st)) name=st.declarationList.declarations.map(d=>d.name.getText(sf)).join(',');
  const kind=ts.SyntaxKind[st.kind].replace('Declaration','').replace('Statement','');
  if (kind==='Import') continue;
  console.log(`${String(line(st.getStart(sf))).padStart(5)}-${String(line(st.getEnd())).padEnd(5)} ${kind.padEnd(10)} ${name}`);
}
