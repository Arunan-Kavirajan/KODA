import { extractImports, extractExports } from '../lib/code/imports';

describe('Import and Export Extraction', () => {
  describe('extractImports', () => {
    it('extracts JS/TS imports', () => {
      const source = `
import React from 'react';
import { useState, useEffect } from 'react';
import * as utils from './utils';
import './style.css';
      `;
      const imports = extractImports(source, 'TypeScript');
      expect(imports).toHaveLength(4);
      
      expect(imports[0]).toMatchObject({ source: 'react', defaultImport: 'React', isInternal: false, kind: 'default' });
      expect(imports[1]).toMatchObject({ source: 'react', names: ['useState', 'useEffect'], isInternal: false, kind: 'named' });
      expect(imports[2]).toMatchObject({ source: './utils', namespaceImport: 'utils', isInternal: true, kind: 'namespace' });
      expect(imports[3]).toMatchObject({ source: './style.css', isInternal: true, kind: 'side-effect' });
    });

    it('extracts Python imports', () => {
      const source = `
import os
import sys as system
from datetime import datetime, timedelta
      `;
      const imports = extractImports(source, 'Python');
      expect(imports).toHaveLength(3);
      
      expect(imports[0]).toMatchObject({ source: 'os', isInternal: false, kind: 'default' });
      expect(imports[1]).toMatchObject({ source: 'sys', isInternal: false, kind: 'default' });
      expect(imports[2]).toMatchObject({ source: 'datetime', names: ['datetime', 'timedelta'], kind: 'named' });
    });
  });

  describe('extractExports', () => {
    it('extracts JS/TS exports', () => {
      const source = `
export const myConst = 1;
export function myFunc() {}
export default class MyClass {}
export { named1, named2 };
export * from './module';
      `;
      const exports = extractExports(source, 'TypeScript');
      expect(exports).toHaveLength(6); // myConst, myFunc, default, named1, named2, *
      
      const names = exports.map(e => e.name);
      expect(names).toContain('myConst');
      expect(names).toContain('myFunc');
      expect(names).toContain('default');
      expect(names).toContain('named1');
      expect(names).toContain('named2');
      expect(names).toContain('*');
    });
  });
});
