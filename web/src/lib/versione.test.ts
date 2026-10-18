import { describe, expect, it } from 'vitest';
import { leggiChangelog, VERSIONE } from './versione';

describe('note di rilascio', () => {
  it('legge versioni, date e novità', () => {
    const rilasci = leggiChangelog(
      '# Novità\n\nintro\n\n## 0.2.0 — 2026-10-18\n\n- Uno\n- Due\n\n## 0.1.0 — 2026-10-14\n\n- Zero\n',
    );
    expect(rilasci).toEqual([
      { versione: '0.2.0', data: '2026-10-18', novita: ['Uno', 'Due'] },
      { versione: '0.1.0', data: '2026-10-14', novita: ['Zero'] },
    ]);
  });

  it('il CHANGELOG vero comincia con la versione attuale', () => {
    expect(leggiChangelog()[0].versione).toBe(VERSIONE);
  });
});
