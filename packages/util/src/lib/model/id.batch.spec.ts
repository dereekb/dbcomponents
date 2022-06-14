import { unique } from '@dereekb/util';
import { arrayFactory } from '../array';
import { randomNumberFactory } from '../number';
import { idBatchFactory, IdBatchVerifier } from './id.batch';

describe('idBatchFactory()', () => {
  const maxBatchSize = 10;
  const evenNumberVerifier: IdBatchVerifier<number> = {
    findUnique: unique,
    verify: (x) => x.filter((y) => y % 2 === 0),
    maxBatchSize
  };

  const numberFactory = randomNumberFactory(5000, 'floor');

  it('should create a factory', () => {
    const factory = idBatchFactory({
      verifier: evenNumberVerifier,
      factory: arrayFactory(numberFactory)
    });

    expect(factory).toBeDefined();
  });

  describe('function', () => {
    const factory = idBatchFactory({
      verifier: evenNumberVerifier,
      factory: arrayFactory(numberFactory)
    });

    it('should generate the expected amount of identifiers.', async () => {
      const tagsToMake = 10;
      const result = await factory(tagsToMake);
      expect(result.length).toBe(tagsToMake);
    });

    it('should generate valid, unique identifiers.', async () => {
      const tagsToMake = 100;
      const result = await factory(tagsToMake);
      expect(unique(result).length).toBe(result.length);
      expect((await evenNumberVerifier.verify(result)).length).toBe(result.length);
    });

    it('should throw an error if it fails to generate enough unique values.', async () => {
      const tenNumbersFactory = randomNumberFactory(10, 'floor');

      const tagsToMake = 100;

      const failureFactory = idBatchFactory({
        verifier: evenNumberVerifier,
        factory: arrayFactory(tenNumbersFactory)
      });

      try {
        await failureFactory(tagsToMake);
        fail();
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });
});