import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../../lib/statistics-room-scope.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
new Function('exports', 'module', code)(module.exports, module);
export const roomScope = module.exports;
