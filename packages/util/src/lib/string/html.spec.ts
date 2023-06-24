import { firstAndLastCharacterOccurrence, replaceCharacterAtIndexWith, splitStringAtIndex } from './char';
import { spaceSeparatedCssClasses } from './html';

describe('spaceSeparatedCssClasses()', () => {
  it('should join together an array of classes', () => {
    const expected = 'a b c d e f';
    const splitClasses = expected.split(' ');
    const result = spaceSeparatedCssClasses([splitClasses, splitClasses, 'a', 'f']);

    expect(result).toBe(expected);
  });
});
