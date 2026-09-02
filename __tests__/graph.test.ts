import { buildCodebaseGraph } from '../lib/graph/build';
import type { RepositorySnapshot } from '../types/repository';

describe('Graph Generation', () => {
  it('generates graph from snapshot', () => {
    const snapshot: RepositorySnapshot = {
      metadata: { owner: 'test', name: 'repo', fullName: 'test/repo', url: '', defaultBranch: 'main' },
      stats: { totalFiles: 2, totalDirectories: 1, filteredFiles: 2, filteredDirectories: 1, ignoredCount: 0 },
      ingestedAt: new Date().toISOString(),
      tree: [], // not used by graph build directly
      entries: [
        { path: 'src', name: 'src', type: 'directory', depth: 1 },
        { path: 'src/index.ts', name: 'index.ts', type: 'file', depth: 2, parentPath: 'src' },
        { path: 'src/utils.ts', name: 'utils.ts', type: 'file', depth: 2, parentPath: 'src' },
      ],
      codeFiles: [
        {
          path: 'src/index.ts',
          language: 'TypeScript',
          parsed: true,
          imports: [{ source: './utils', isInternal: true, resolvedPath: 'src/utils.ts', names: [], kind: 'named' }, { source: 'react', isInternal: false, names: [], kind: 'default' }],
          exports: [],
          functions: [],
          classes: [],
        },
        {
          path: 'src/utils.ts',
          language: 'TypeScript',
          parsed: true,
          imports: [],
          exports: [],
          functions: [],
          classes: [],
        }
      ],
      dependencies: [
        { name: 'react', version: '18.0.0', type: 'prod' }
      ]
    };

    const graph = buildCodebaseGraph(snapshot);
    
    // Nodes: repo (1), dirs (1), files (2), deps (1)
    expect(graph.nodes).toHaveLength(5);
    
    const nodeIds = graph.nodes.map(n => n.id);
    expect(nodeIds).toContain('repo:test/repo');
    expect(nodeIds).toContain('dir:src');
    expect(nodeIds).toContain('file:src/index.ts');
    expect(nodeIds).toContain('file:src/utils.ts');
    expect(nodeIds).toContain('dep:react');
    
    // Edges: contains (3), imports (1), depends_on (1)
    const containsEdges = graph.edges.filter(e => e.type === 'contains');
    expect(containsEdges).toHaveLength(3); // repo->src, src->index, src->utils

    const importEdges = graph.edges.filter(e => e.type === 'imports');
    expect(importEdges).toHaveLength(1);
    expect(importEdges[0].source).toBe('file:src/index.ts');
    expect(importEdges[0].target).toBe('file:src/utils.ts');
    
    const dependsEdges = graph.edges.filter(e => e.type === 'depends_on');
    expect(dependsEdges).toHaveLength(1);
    expect(dependsEdges[0].source).toBe('file:src/index.ts');
    expect(dependsEdges[0].target).toBe('dep:react');
  });
});
