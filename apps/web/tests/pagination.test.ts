import { describe, expect, it } from 'vitest';

import { getPageItems } from '../components/ui/pagination';

describe('getPageItems', () => {
  it('devolve apenas a primeira página quando pageCount é 1', () => {
    expect(getPageItems(1, 1)).toEqual([1]);
  });

  it('sem reticências quando as páginas cabem', () => {
    expect(getPageItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('insere reticências no fim com a página atual no início', () => {
    expect(getPageItems(1, 9)).toEqual([1, 2, '…', 9]);
  });

  it('insere reticências em ambos os lados no meio', () => {
    expect(getPageItems(5, 9)).toEqual([1, '…', 4, 5, 6, '…', 9]);
  });

  it('insere reticências no início com a página atual no fim', () => {
    expect(getPageItems(9, 9)).toEqual([1, '…', 8, 9]);
  });
});
