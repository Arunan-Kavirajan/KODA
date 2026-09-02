import { extractDependencies } from '../lib/repository/dependencies';

describe('Dependency Extraction', () => {
  it('extracts dependencies from package.json', () => {
    const pkgJson = JSON.stringify({
      dependencies: {
        'react': '^18.2.0',
        'next': '13.4.0'
      },
      devDependencies: {
        'typescript': '~5.0.0'
      },
      peerDependencies: {
        'lodash': '4.x'
      }
    });

    const deps = extractDependencies(pkgJson, 'package.json');
    expect(deps).toHaveLength(4);
    
    const reactDep = deps.find(d => d.name === 'react');
    expect(reactDep).toMatchObject({ name: 'react', version: '^18.2.0', kind: 'production' });

    const tsDep = deps.find(d => d.name === 'typescript');
    expect(tsDep).toMatchObject({ name: 'typescript', version: '~5.0.0', kind: 'development' });
  });

  it('returns empty array for non-package.json files or invalid json', () => {
    expect(extractDependencies('import react from "react";', 'index.ts')).toEqual([]);
    expect(extractDependencies('invalid json', 'package.json')).toEqual([]);
  });
});
