import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SubmitQueue {
  private readonly logger = new Logger(SubmitQueue.name);
  private readonly tails = new Map<string, Promise<unknown>>();

  enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    const queued = previous.then(task, task);
    this.tails.set(
      key,
      queued.then(
        () => undefined,
        () => undefined,
      ),
    );
    return queued;
  }
}
