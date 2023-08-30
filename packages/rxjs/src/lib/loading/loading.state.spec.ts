import { beginLoading, errorResult, loadingStateHasError, loadingStateHasFinishedLoading, loadingStateIsLoading, loadingStatesHaveEquivalentMetadata, mapLoadingStateResults, mergeLoadingStates, successResult } from './loading.state';

describe('beginLoading()', () => {
  it('should return a loading state that is loading.', () => {
    const state = beginLoading();
    expect(loadingStateIsLoading(state)).toBe(true);
  });
});

describe('successResult()', () => {
  it('should return a loading state that has the value.', () => {
    const value = {};
    const state = successResult(value);
    expect(state.value).toBe(value);
  });

  it('should return a loading state that is not loading.', () => {
    const state = successResult({});
    expect(loadingStateIsLoading(state)).toBe(false);
  });

  it('should return a loading state that is not loading even if the value is undefined.', () => {
    const state = successResult(undefined);
    expect(loadingStateIsLoading(state)).toBe(false);
  });
});

describe('errorResult()', () => {
  it('should return a loading state that has the error.', () => {
    const error = { message: '' };
    const state = errorResult(error);
    expect(state.error).toBeDefined();
    expect(state.error?._error).toBe(error);
  });

  it('should return a loading state that is not loading.', () => {
    const state = errorResult({ message: '' });
    expect(loadingStateIsLoading(state)).toBe(false);
  });

  it('should return a loading state that is not loading even if the error is undefined.', () => {
    const state = errorResult(undefined);
    expect(loadingStateIsLoading(state)).toBe(false);
  });
});

describe('mergeLoadingStates()', () => {
  describe('two loading states', () => {
    it('should return a loading state that is loading.', () => {
      const a = beginLoading<object>();
      const b = beginLoading<object>();
      const state = mergeLoadingStates(a, b);
      expect(loadingStateIsLoading(state)).toBe(true);
    });
  });

  describe('more loading states', () => {
    it('should return a loading state that is loading.', () => {
      const a = beginLoading<object>();
      const b = beginLoading<object>();
      const c = beginLoading<object>();
      const d = beginLoading<object>();
      const e = beginLoading<object>();
      const state = mergeLoadingStates(a, b, c, d, e, () => 1);
      expect(loadingStateIsLoading(state)).toBe(true);
    });

    describe('encounters an error', () => {
      it('should return the first error if the error is not marked as loading.', () => {
        const expectedError = new Error();

        const a = beginLoading<object>();
        const b = errorResult<object>(expectedError);
        const c = beginLoading<object>();
        const d = beginLoading<object>();
        const e = beginLoading<object>();
        const state = mergeLoadingStates(a, b, c, d, e, () => 1);
        expect(loadingStateIsLoading(state)).toBe(false);
        expect(state.error?._error).toBe(expectedError);
      });

      it('should return loading while states that have an error are still marked as loading.', () => {
        const expectedError = new Error();

        const a = beginLoading<object>();
        const b = { ...errorResult<object>(expectedError), loading: true };
        const c = beginLoading<object>();
        const d = beginLoading<object>();
        const e = beginLoading<object>();
        const state = mergeLoadingStates(a, b, c, d, e, () => 1);
        expect(loadingStateIsLoading(state)).toBe(true);
        expect(state.error?._error).toBe(expectedError);
      });

      it('should return the first error after all items are finished loading.', () => {
        const expectedError = new Error();

        const a = successResult({ a: true });
        const b = errorResult<object>(expectedError);
        const c = successResult({ c: true });
        const d = successResult({ d: true });
        const e = successResult({ e: true });
        const state = mergeLoadingStates(a, b, c, d, e, () => 1);
        expect(loadingStateIsLoading(state)).toBe(false);
        expect(loadingStateHasError(state)).toBe(true);
        expect(state.error?._error).toBe(expectedError);
      });
    });

    it('should merge each of the values together once finished loading using mergeObjects if a merge function is not provided.', () => {
      const a = successResult({ a: true });
      const b = successResult({ b: true });
      const c = successResult({ c: true });
      const d = successResult({ d: true });
      const e = successResult({ e: true });
      const state = mergeLoadingStates(a, b, c, d, e);
      expect(loadingStateIsLoading(state)).toBe(false);
      expect(state.loading).toBe(false);
      expect(state.error).toBeUndefined();
      expect(state.value?.a).toBe(true);
      expect(state.value?.b).toBe(true);
      expect(state.value?.c).toBe(true);
      expect(state.value?.d).toBe(true);
      expect(state.value?.e).toBe(true);
    });

    it('should merge each of the values together once finished loading using mergeObjects if a merge function is not provided.', () => {
      const a = successResult({ a: true });
      const b = successResult({ b: true });
      const c = successResult({ c: true });
      const d = successResult({ d: true });
      const e = successResult({ e: true });

      const expectedValue = 0;
      const state = mergeLoadingStates(a, b, c, d, e, (a, b, c, d, e) => {
        expect(a).toBeDefined();
        expect(a.a).toBe(true);
        expect(b).toBeDefined();
        expect(b.b).toBe(true);
        expect(c).toBeDefined();
        expect(c.c).toBe(true);
        expect(d).toBeDefined();
        expect(d.d).toBe(true);
        expect(e).toBeDefined();
        expect(e.e).toBe(true);
        return expectedValue;
      });

      expect(loadingStateIsLoading(state)).toBe(false);
      expect(state.loading).toBe(false);
      expect(state.error).toBeUndefined();
      expect(state.value).toBe(expectedValue);
    });
  });
});

describe('loadingStateIsLoading()', () => {
  it('should return true if a loading state has loading = true.', () => {
    const result = loadingStateIsLoading({ loading: true });
    expect(result).toBe(true);
  });

  it('should return true if a loading state has loading = true even if a value is present.', () => {
    const result = loadingStateIsLoading({ loading: true, value: 'value' });
    expect(result).toBe(true);
  });

  it('should return false if a loading state has loading = false.', () => {
    const result = loadingStateIsLoading({ loading: false });
    expect(result).toBe(false);
  });

  it('should return false if a loading state has loading=undefined, and value is set.', () => {
    const result = loadingStateIsLoading({ loading: undefined, value: 'value' });
    expect(result).toBe(false);
  });

  it('should return true if a loading state has value=undefined', () => {
    const result = loadingStateIsLoading({ value: undefined });
    expect(result).toBe(true);
  });

  it('should return false if a loading state has value=null', () => {
    const result = loadingStateIsLoading({ value: null });
    expect(result).toBe(false);
  });

  it('should return false if a loading state has loading=undefined, and error is set.', () => {
    const result = loadingStateIsLoading({ loading: undefined, error: { message: '' } });
    expect(result).toBe(false);
  });

  it('should return true if a loading state is an empty object.', () => {
    const result = loadingStateIsLoading({ loading: undefined });
    expect(result).toBe(true);
  });

  it('should return true if a loading state has loading=undefined, and value=undefined.', () => {
    const result = loadingStateIsLoading({ loading: undefined, value: undefined });
    expect(result).toBe(true);
  });

  it('should return true if a loading state has loading=undefined, and error=undefined.', () => {
    const result = loadingStateIsLoading({ loading: undefined, error: undefined });
    expect(result).toBe(true);
  });
});

describe('loadingStateHasFinishedLoading()', () => {
  it('should return false if a loading state has loading = true.', () => {
    const result = loadingStateHasFinishedLoading({ loading: true });
    expect(result).toBe(false);
  });

  it('should return false if a loading state has loading = true even if a value is present.', () => {
    const result = loadingStateHasFinishedLoading({ loading: true, value: 'value' });
    expect(result).toBe(false);
  });

  it('should return false if a loading state has loading = true even if an error is present.', () => {
    const result = loadingStateHasFinishedLoading({ loading: true, error: { message: '' } });
    expect(result).toBe(false);
  });

  it('should return true if a loading state has loading = false.', () => {
    const result = loadingStateHasFinishedLoading({ loading: false });
    expect(result).toBe(true);
  });

  it('should return true if a loading state has loading=undefined, and value is set.', () => {
    const result = loadingStateHasFinishedLoading({ loading: undefined, value: 'value' });
    expect(result).toBe(true);
  });

  it('should return true if a loading state has loading=undefined, and error is set.', () => {
    const result = loadingStateHasFinishedLoading({ loading: undefined, error: { message: '' } });
    expect(result).toBe(true);
  });

  it('should return false if a loading state is an empty object.', () => {
    const result = loadingStateHasFinishedLoading({ loading: undefined });
    expect(result).toBe(false);
  });

  it('should return false if a loading state has loading=undefined, and value=undefined.', () => {
    const result = loadingStateHasFinishedLoading({ loading: undefined, value: undefined });
    expect(result).toBe(false);
  });

  it('should return false if a loading state has loading=undefined, and error=undefined.', () => {
    const result = loadingStateHasFinishedLoading({ loading: undefined, error: undefined });
    expect(result).toBe(false);
  });
});

describe('loadingStatesHaveEquivalentMetadata()', () => {
  it('should return true if two loading states have equivalent metadata.', () => {
    const result = loadingStatesHaveEquivalentMetadata({ loading: true }, { loading: true, error: null });
    expect(result).toBe(true);
  });

  it('should return true for two empty loading states', () => {
    const result = loadingStatesHaveEquivalentMetadata({}, {});
    expect(result).toBe(true);
  });

  it('should return false if two loading states have different pages.', () => {
    const result = loadingStatesHaveEquivalentMetadata({ page: 1 }, { page: 2 });
    expect(result).toBe(false);
  });

  it('should return false if only one loading state has a page.', () => {
    const result = loadingStatesHaveEquivalentMetadata({ page: 1 }, {});
    expect(result).toBe(false);
  });
});

describe('mapLoadingStateResults()', () => {
  it('should map the value of 0 and other non-null falsy values', () => {
    const mappedValue = `MAPPED`;

    const result = mapLoadingStateResults(successResult(0), {
      mapValue: () => mappedValue
    });

    expect(result.value).toBe(mappedValue);
  });
});
