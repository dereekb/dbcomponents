import { first } from 'rxjs/operators';
import { ValuesLoadingContext } from '.';

describe('ValuesLoadingContext', () => {

  it('should start in a loading state if nothing is specified', (done) => {
    const context = new ValuesLoadingContext();

    context.stream$.pipe(first()).subscribe(({ loading }) => {
      expect(loading).toBe(true);
      done();
    });
  });

  it('should not start in a loading state if loading not specified.', (done) => {
    const context = new ValuesLoadingContext({ loading: false });

    context.stream$.pipe(first()).subscribe(({ loading }) => {
      expect(loading).toBe(false);
      done();
    });
  });

});
