import { resolveImport, buildFilePathSet } from '../lib/code/resolver';

describe('Import Resolution', () => {
  const filePaths = buildFilePathSet([
    'src/index.ts',
    'src/utils/index.ts',
    'src/utils/helpers.ts',
    'src/components/Button.tsx',
  ]);

  it('resolves internal absolute-like relative paths', () => {
    const result = resolveImport('./utils/helpers', 'src/index.ts', filePaths);
    expect(result.isInternal).toBe(true);
    expect(result.resolvedPath).toBe('src/utils/helpers.ts');
  });

  it('resolves internal index files', () => {
    const result = resolveImport('./utils', 'src/index.ts', filePaths);
    expect(result.isInternal).toBe(true);
    expect(result.resolvedPath).toBe('src/utils/index.ts');
  });

  it('resolves relative paths going up', () => {
    const result = resolveImport('../components/Button', 'src/utils/helpers.ts', filePaths);
    expect(result.isInternal).toBe(true);
    expect(result.resolvedPath).toBe('src/components/Button.tsx');
  });

  it('identifies external packages', () => {
    const result = resolveImport('react', 'src/index.ts', filePaths);
    expect(result.isInternal).toBe(false);
    expect(result.resolvedPath).toBeUndefined();
  });
  
  it('falls back to internal without path if file not found but looks relative', () => {
    const result = resolveImport('./not-found', 'src/index.ts', filePaths);
    expect(result.isInternal).toBe(true);
    expect(result.resolvedPath).toBeUndefined();
  });
});
