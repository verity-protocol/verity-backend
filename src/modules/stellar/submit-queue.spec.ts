import { SubmitQueue } from './submit-queue';

describe('SubmitQueue', () => {
  let queue: SubmitQueue;

  beforeEach(() => {
    queue = new SubmitQueue();
  });

  it('should serialize tasks enqueued under the same key', async () => {
    const order: string[] = [];
    const first = queue.enqueue('sponsor', async () => {
      order.push('first-start');
      await new Promise((resolve) => setTimeout(resolve, 10));
      order.push('first-end');
    });
    const second = queue.enqueue('sponsor', async () => {
      order.push('second-start');
      order.push('second-end');
    });

    await Promise.all([first, second]);

    expect(order).toEqual([
      'first-start',
      'first-end',
      'second-start',
      'second-end',
    ]);
  });

  it('should let different keys run independently', async () => {
    const order: string[] = [];
    let releaseFirst!: () => void;
    const firstDone = new Promise<void>((resolve) => (releaseFirst = resolve));

    const first = queue.enqueue('key-a', async () => {
      order.push('a-start');
      await firstDone;
      order.push('a-end');
    });
    const second = queue.enqueue('key-b', async () => {
      order.push('b-start');
    });

    await second;
    expect(order).toEqual(['a-start', 'b-start']);
    releaseFirst();
    await first;
  });

  it('should not let one failure block subsequent tasks', async () => {
    const failing = queue.enqueue('sponsor', async () => {
      throw new Error('boom');
    });
    const next = queue.enqueue('sponsor', async () => 'ok');

    await expect(failing).rejects.toThrow('boom');
    await expect(next).resolves.toBe('ok');
  });

  it('should resolve tasks with their own results in order', async () => {
    const values: number[] = [];
    const tasks = [1, 2, 3].map((n) =>
      queue.enqueue('sponsor', async () => {
        values.push(n);
        return n * 10;
      }),
    );

    const results = await Promise.all(tasks);

    expect(results).toEqual([10, 20, 30]);
    expect(values).toEqual([1, 2, 3]);
  });
});
