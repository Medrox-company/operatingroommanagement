import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';

// Local render/handler tests: no database or clinical messages are sent.
const source = readFileSync(new URL('../../components/RoomNoticeComposer.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

function nodes(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, predicate));
  if (!React.isValidElement(tree)) return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props.children, predicate)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (React.isValidElement(tree)) return text(tree.props.children);
  return typeof tree === 'string' ? tree : '';
}
function harness(targetRoomId) {
  const state = [];
  let cursor = 0;
  const sent = [];
  let closed = 0;
  const exports = {};
  new Function('require', 'exports', compiled)(name => {
    if (name === 'react') return { __esModule: true, default: React, useId: () => 'message', useState: initial => {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    } };
    if (name === 'framer-motion') return { motion: { div: 'div' } };
    if (name === './mobile/mobile-notice-composer.css') return {};
    if (name === 'lucide-react') return Object.fromEntries(['Megaphone', 'X', 'Send', 'Loader2', 'Check'].map(icon => [icon, icon]));
    throw new Error(`Unexpected dependency ${name}`);
  }, exports);
  const props = { rooms: [{ id: 'a', name: 'Sál A' }, { id: 'b', name: 'Sál B' }], targetRoomId,
    onClose: () => closed++, onSend: async (...args) => { sent.push(args); } };
  const render = () => { cursor = 0; return exports.default(props); };
  return { render, props, sent, closed: () => closed };
}
const sendButton = tree => nodes(tree, node => node.type === 'button' && text(node).trim() === 'Odeslat')[0];

test('room-specific composer shows only a focused text field and sends exclusively to its target', async () => {
  const app = harness('b');
  let tree = app.render();
  assert.match(text(tree), /Sál B/);
  assert.doesNotMatch(text(tree), /Sál A|Vybrat vše|Operační sály/);
  const field = nodes(tree, node => node.type === 'textarea')[0];
  assert.equal(field.props.autoFocus, true);
  assert.equal(sendButton(tree).props.disabled, true);
  field.props.onChange({ target: { value: '  Připravte sál  ' } });
  tree = app.render();
  await sendButton(tree).props.onClick();
  assert.deepEqual(app.sent, [[['b'], 'Připravte sál']]);
  assert.equal(app.closed(), 1);
});

test('a removed target disables sending instead of falling back to other rooms', async () => {
  const app = harness('b');
  nodes(app.render(), node => node.type === 'textarea')[0].props.onChange({ target: { value: 'Zpráva' } });
  app.props.rooms = app.props.rooms.filter(room => room.id !== 'b');
  const button = sendButton(app.render());
  assert.equal(button.props.disabled, true);
  await button.props.onClick();
  assert.deepEqual(app.sent, []);
});

test('the general composer retains its multiple-room selection', async () => {
  const app = harness(undefined);
  const tree = app.render();
  nodes(tree, node => node.type === 'button' && text(node) === 'Vybrat vše')[0].props.onClick();
  nodes(tree, node => node.type === 'textarea')[0].props.onChange({ target: { value: 'Společná zpráva' } });
  await sendButton(app.render()).props.onClick();
  assert.deepEqual(app.sent, [[['a', 'b'], 'Společná zpráva']]);
});
