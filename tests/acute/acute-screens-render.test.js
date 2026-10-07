import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Formulář a fronta se tu skutečně vykreslí. Zároveň se hlídá, že si
// nepřitáhly runtime závislost na databázi ani na React kontextech —
// obě komponenty jsou čisté funkce props, aby šly v druhém kroku napojit
// na databázi bez přepisování.

const compile = (path, requireStub) => {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: path.split('/').pop(),
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const module = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(requireStub, module.exports, module);
  return module.exports;
};

const domain = compile('../../lib/acute-requests.ts', name => {
  assert.fail(`Doménová logika nesmí nic importovat: ${name}`);
});

const icons = new Proxy({}, { get: () => () => React.createElement('span') });

/** Hooky nahrazené tak, aby šlo komponentu vykreslit jedním průchodem. */
const reactStub = {
  __esModule: true,
  default: React,
  createElement: React.createElement,
  Fragment: React.Fragment,
  useMemo: compute => compute(),
  useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
  useCallback: fn => fn,
  useEffect: () => {},
  useRef: value => ({ current: value }),
};

const allowed = {
  react: reactStub,
  'lucide-react': icons,
  '../../lib/acute-requests': domain,
};

const Form = compile('../../components/acute/AcuteRequestForm.tsx', name => {
  if (name === '../../contexts/AcuteRequestsContext') return {}; // jen typy
  if (name in allowed) return allowed[name];
  assert.fail(`Formulář si přitáhl neočekávanou závislost: ${name}`);
}).default;

const Queue = compile('../../components/acute/AcuteQueue.tsx', name => {
  if (name === './AcuteRequestForm') return {}; // jen typy
  if (name in allowed) return allowed[name];
  assert.fail(`Fronta si přitáhla neočekávanou závislost: ${name}`);
}).default;

const departments = [
  { id: 'chir', name: 'Chirurgie', accent_color: '#F97316' },
  { id: 'tra', name: 'Traumatologie', accent_color: '#06B6D4' },
];
const windows = domain.DEFAULT_URGENCY_WINDOWS;
const T0 = Date.parse('2026-10-07T08:00:00.000Z');
const at = minutes => new Date(T0 + minutes * 60_000).toISOString();

test('formulář nabídne všechny tři stupně s jejich okny a nabídku oddělení', () => {
  const markup = renderToStaticMarkup(React.createElement(Form, {
    departments, windows, onSubmit: () => {},
  }));
  for (const level of domain.URGENCY_LEVELS) {
    assert.ok(markup.includes(level.label), `chybí stupeň ${level.label}`);
    assert.ok(markup.includes(level.meaning), `chybí vysvětlení stupně ${level.label}`);
  }
  assert.ok(markup.includes('okno 30 min') && markup.includes('okno 6 h') && markup.includes('okno 24 h'),
    'u každého stupně musí být vidět jeho okno');
  assert.ok(markup.includes('Chirurgie') && markup.includes('Traumatologie'));
  assert.ok(markup.includes('Příjmení pacienta') && markup.includes('Oddělení pacienta'));
  // Volný text je jediná cesta, kudy se do databáze dostanou údaje, které tam nemají být.
  assert.match(markup, /Jen typ výkonu, bez údajů o pacientovi/);
  // Rodné číslo ani diagnóza se nezadávají vůbec.
  assert.ok(!/rodné číslo|diagnóz/i.test(markup), 'formulář nesmí nabízet údaje, které se neukládají');
});

test('bez nastavených oddělení formulář řekne, co je potřeba doplnit', () => {
  const markup = renderToStaticMarkup(React.createElement(Form, {
    departments: [], windows, onSubmit: () => {},
  }));
  assert.match(markup, /nemá nastavená žádná oddělení/);
});

test('prázdná fronta má informativní stav, ne prázdnou plochu', () => {
  const markup = renderToStaticMarkup(React.createElement(Queue, {
    requests: [], departments, windows, nowMs: T0, onMove: () => {},
  }));
  assert.match(markup, /Žádné akutní požadavky/);
});

test('fronta ukáže pozici, stupeň, oddělení, příjmení a stav okna', () => {
  const requests = [{
    id: 'a', urgency: 'urgentni', procedure: 'Apendektomie', departmentId: 'chir',
    patientSurname: 'Marek', patientWard: '3B', estimatedMinutes: 60,
    createdAt: at(0), state: 'zadan', order: 1,
  }];
  const markup = renderToStaticMarkup(React.createElement(Queue, {
    requests, departments, windows, nowMs: T0 + 30 * 60_000, onMove: () => {},
  }));
  assert.ok(markup.includes('Apendektomie'));
  assert.ok(markup.includes('Urgentní'));
  assert.ok(markup.includes('Chirurgie'));
  assert.ok(markup.includes('Marek, 3B'));
  assert.match(markup, /v okně/);
  assert.match(markup, /čeká 30 min/);
});

test('posunutá položka nese stopu: odkud, kam, proč a kdy', () => {
  const requests = [
    {
      id: 'a', urgency: 'urgentni', procedure: 'Osteosyntéza', departmentId: 'tra',
      patientSurname: 'Šimek', patientWard: '1A', estimatedMinutes: 120,
      createdAt: at(0), state: 'zadan', order: 2,
      move: { reason: 'sal-obsazen', fromPosition: 1, toPosition: 2, at: at(15) },
    },
    {
      id: 'b', urgency: 'odkladny', procedure: 'Cholecystektomie', departmentId: 'chir',
      patientSurname: 'Hrubá', patientWard: '3B', estimatedMinutes: 90,
      createdAt: at(5), state: 'zadan', order: 1,
    },
  ];
  const markup = renderToStaticMarkup(React.createElement(Queue, {
    requests, departments, windows, nowMs: T0 + 40 * 60_000, onMove: () => {},
  }));
  assert.match(markup, /Pořadí změněno z 1\. na 2\./, 'posun musí být vidět v textu, ne jen v barvě');
  assert.ok(markup.includes('Sál obsazen'), 'důvod posunu musí být vidět');
});

test('odchylka od stupně je vidět i bez zápisu o posunu', () => {
  // Urgentní stojí za odkladným, aniž by ho někdo ručně posouval.
  const requests = [
    {
      id: 'odkladny', urgency: 'odkladny', procedure: 'Cholecystektomie', departmentId: 'chir',
      patientSurname: 'Hrubá', patientWard: '3B', estimatedMinutes: 90,
      createdAt: at(0), state: 'zadan', order: 1,
    },
    {
      id: 'urgentni', urgency: 'urgentni', procedure: 'Apendektomie', departmentId: 'chir',
      patientSurname: 'Marek', patientWard: '3B', estimatedMinutes: 60,
      createdAt: at(10), state: 'zadan', order: 2,
    },
  ];
  const markup = renderToStaticMarkup(React.createElement(Queue, {
    requests, departments, windows, nowMs: T0 + 20 * 60_000, onMove: () => {},
  }));
  assert.match(markup, /Stojí o 1 pozici dál, než odpovídá stupni/);
});

test('vypršelé okno se pojmenuje a ukáže přesah', () => {
  const requests = [{
    id: 'a', urgency: 'neodkladny', procedure: 'Revize pro krvácení', departmentId: 'chir',
    patientSurname: 'Konečná', patientWard: 'JIP 2', estimatedMinutes: 75,
    createdAt: at(0), state: 'zadan', order: 1,
  }];
  const markup = renderToStaticMarkup(React.createElement(Queue, {
    requests, departments, windows, nowMs: T0 + 50 * 60_000, onMove: () => {},
  }));
  assert.match(markup, /okno vypršelo/);
  assert.match(markup, /přesah 20 min/);
});
