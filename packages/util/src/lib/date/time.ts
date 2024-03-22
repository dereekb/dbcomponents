import { promiseReference } from '../promise';
import { type Destroyable } from '../lifecycle';
import { type Building } from '../value/build';
import { type Maybe } from '../value/maybe.type';
import { type Milliseconds } from './date';
import { BaseError } from 'make-error';

/**
 * Returns the number of invocations that have occurred since the period started.
 *
 * When a new period has started, returns 0.
 */
export type TimePeriodCounter = (() => number) & {
  readonly _timePeriodLength: Milliseconds;
  readonly _timePeriodCount: number;
  readonly _lastTimePeriodStart: Date;
  readonly _nextTimePeriodEnd: Date;
  /**
   * Resets the counter.
   *
   * @returns the new period end time.
   */
  readonly _reset: (start?: Date) => Date;
};

export function timePeriodCounter(timePeriodLength: number, lastTimePeriodStart?: Maybe<Date>): TimePeriodCounter {
  function reset(inputStart: Maybe<Date>) {
    const start = inputStart ?? new Date();
    fn._timePeriodCount = 0;
    fn._lastTimePeriodStart = start;
    fn._nextTimePeriodEnd = new Date(start.getTime() + timePeriodLength);
    return fn._nextTimePeriodEnd;
  }

  const fn = (() => {
    const now = new Date();

    if (now > (fn._nextTimePeriodEnd as Date)) {
      reset(now);
    } else {
      (fn._timePeriodCount as number) += 1;
    }

    return fn._timePeriodCount;
  }) as Building<TimePeriodCounter>;

  fn._timePeriodLength = timePeriodLength;
  reset(lastTimePeriodStart);
  fn._timePeriodCount = -1;
  fn._reset = reset;

  return fn as TimePeriodCounter;
}

export type TimerState = 'running' | 'paused' | 'complete';

/**
 * Timer object that counts down a fixed duration amount.
 *
 * The timer is not required to start immediately.
 *
 * Once the timer has complete it cannot be reset.
 */
export interface Timer extends Destroyable {
  /**
   * Promise that resolves once the timer is complete, or throws an error if the timer is destroyed before it completes.
   */
  readonly promise: Promise<void>;

  /**
   * Current timer state.
   */
  readonly state: TimerState;

  /**
   * The time the Timer was created originally.
   */
  readonly createdAt: Date;

  /**
   * The last time the timer was paused.
   */
  readonly pausedAt?: Maybe<Date>;

  /**
   * The last started at date, if applicable.
   */
  readonly startedAt?: Maybe<Date>;

  /**
   * The configured duration.
   */
  readonly duration: Milliseconds;

  /**
   * The number of ms remaining.
   *
   * If the timer is paused, this returns null.
   *
   * If the timer is complete, this returns 0.
   */
  readonly durationRemaining: Maybe<Milliseconds>;

  /**
   * Starts the timer if it was not running. Does nothing if already running.
   */
  start(): void;

  /**
   * Stops the timer if it was running. Does nothing if already complete.
   */
  stop(): void;

  /**
   * Resets the timer to start now. If the timer is already complete then this does nothing.
   */
  reset(): void;

  /**
   * Sets a new duration on the timer. IF the timer is already complete this does nothing.
   *
   * If the new duration is less than the remaining duration it stops immediately.
   *
   * @param duration
   */
  setDuration(duration: Milliseconds): void;
}

export class TimerCancelledError extends BaseError {
  constructor() {
    super(`The timer was destroyed before it was completed.`);
  }
}

export class TimerInstance implements Timer {
  private _createdAt = new Date();
  private _startedAt = new Date();
  private _pausedAt?: Date;

  private _state: TimerState = 'paused';
  private _duration: Milliseconds;
  private _promiseRef = promiseReference<void>();

  constructor(duration: Milliseconds, startImmediately = true) {
    this._duration = duration;

    if (startImmediately) {
      this.start();
      this._startedAt = this._createdAt;
    }
  }

  get state(): TimerState {
    return this._state;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get pausedAt(): Maybe<Date> {
    return this._pausedAt;
  }

  get startedAt(): Date {
    return this._startedAt;
  }

  get promise(): Promise<void> {
    return this._promiseRef.promise;
  }

  get duration(): Milliseconds {
    return this._duration;
  }

  get durationRemaining(): Maybe<Milliseconds> {
    let remaining: Maybe<Milliseconds>;

    switch (this._state) {
      case 'complete':
        remaining = 0;
        break;
      case 'running':
        remaining = Math.max(0, this._duration - (new Date().getTime() - this._startedAt.getTime()));
        break;
      case 'paused':
        remaining = null;
        break;
    }

    return remaining;
  }

  start(): void {
    if (this._state === 'paused') {
      this._state = 'running';
      this._startedAt = new Date();
      this._enqueueCheck();
    }
  }

  stop(): void {
    if (this._state === 'running') {
      this._state = 'paused';
      this._pausedAt = new Date();
    }
  }

  reset(): void {
    if (this._state !== 'complete') {
      this._state = 'running';
      this._startedAt = new Date();
      this._enqueueCheck();
    }
  }

  setDuration(duration: Milliseconds): void {
    this._duration = duration;
  }

  destroy(): void {
    this._checkComplete();
    if (this._state === 'running') {
      const error = new TimerCancelledError();
      this._promiseRef.reject(error);
      this._state = 'complete'; // mark as complete
    }
  }

  private _checkComplete() {
    if (this._state !== 'complete' && this.durationRemaining === 0) {
      this._state = 'complete';
      this._promiseRef.resolve();
    }
  }

  private _enqueueCheck() {
    const durationRemaining = this.durationRemaining;

    if (durationRemaining != null && this._state !== 'complete') {
      setTimeout(() => {
        this._checkComplete();
        this._enqueueCheck();
      }, durationRemaining);
    }
  }
}

export function timer(duration: Milliseconds, startNow = true): Timer {
  return new TimerInstance(duration, startNow);
}

/**
 * Toggles the input Timer's running state.
 *
 * @param timer
 * @param toggleRun
 */
export function toggleTimerRunning(timer: Timer, toggleRun?: boolean): void {
  toggleRun = toggleRun != null ? toggleRun : timer.state !== 'running';

  if (toggleRun) {
    timer.start();
  } else {
    timer.stop();
  }
}

/**
 * Returns the approximate end date of the given timer. If a timer is already complete, it returns the time for now.
 */
export function approximateTimerEndDate(timer: Timer): Maybe<Date> {
  const durationRemaining = timer.durationRemaining;

  if (durationRemaining != null) {
    return new Date(Date.now() + durationRemaining);
  } else {
    return null;
  }
}
