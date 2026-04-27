import { readFileSync } from 'fs';

const file = '/vercel/share/v0-project/components/TimelineModule.tsx';
const content = readFileSync(file, 'utf-8');
const lines = content.split('\n');

// Track tag stack only inside JSX (rough heuristic: count tags within return statements)
// Simpler: collect every <Tag> open (non-self-closing) and </Tag> close occurrences
// and produce a stack to find unmatched tags.

const tagPattern = /<(\/?)([A-Za-z][\w.]*)([^>]*?)(\/?)>/g;
const stack = [];
let match;
let lineNumber = 1;
let charIndex = 0;

// Build a line lookup
const lineStarts = [0];
for (let i = 0; i < content.length; i++) {
  if (content[i] === '\n') lineStarts.push(i + 1);
}

function getLine(idx) {
  let lo = 0, hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid] <= idx) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

// Only consider TimelineModule's first function: lines 378 to 1474
const FUNC_START = lineStarts[377]; // line 378 0-indexed = 377
const FUNC_END = lineStarts[1473]; // line 1474

while ((match = tagPattern.exec(content)) !== null) {
  const start = match.index;
  if (start < FUNC_START || start > FUNC_END) continue;
  const [full, slash, tagName, attrs, selfSlash] = match;
  const line = getLine(start);
  const isClose = slash === '/';
  const isSelfClose = selfSlash === '/';
  if (isClose) {
    if (stack.length === 0) {
      console.log(`UNMATCHED CLOSE </${tagName}> at line ${line}`);
      continue;
    }
    const top = stack[stack.length - 1];
    if (top.tag === tagName) {
      stack.pop();
    } else {
      console.log(`MISMATCH: expected </${top.tag}> (opened line ${top.line}) but found </${tagName}> at line ${line}`);
      // pop anyway
      stack.pop();
    }
  } else if (!isSelfClose) {
    stack.push({ tag: tagName, line });
  }
}

console.log('\nRemaining open tags (unclosed):');
for (const t of stack) {
  console.log(`  <${t.tag}> opened at line ${t.line}`);
}
