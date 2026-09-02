import { detectLanguage, isAnalyzableLanguage, isTextExtension } from '../lib/code/language';

describe('Language Detection', () => {
  it('detects common languages correctly', () => {
    expect(detectLanguage('app.tsx')).toBe('TSX');
    expect(detectLanguage('index.ts')).toBe('TypeScript');
    expect(detectLanguage('main.py')).toBe('Python');
    expect(detectLanguage('script.js')).toBe('JavaScript');
    expect(detectLanguage('style.css')).toBe('CSS');
    expect(detectLanguage('unknown.xyz')).toBe('unknown');
    expect(detectLanguage('no-extension')).toBe('unknown');
  });

  it('identifies analyzable languages', () => {
    expect(isAnalyzableLanguage('TypeScript')).toBe(true);
    expect(isAnalyzableLanguage('TSX')).toBe(true);
    expect(isAnalyzableLanguage('Python')).toBe(true);
    expect(isAnalyzableLanguage('CSS')).toBe(false);
    expect(isAnalyzableLanguage('unknown')).toBe(false);
  });

  it('identifies text extensions', () => {
    expect(isTextExtension('file.txt')).toBe(true);
    expect(isTextExtension('file.ts')).toBe(true);
    expect(isTextExtension('.gitignore')).toBe(true);
    expect(isTextExtension('file.jpg')).toBe(false);
    expect(isTextExtension('Makefile')).toBe(true);
  });
});
