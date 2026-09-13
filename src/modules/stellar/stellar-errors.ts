export class DidPrepareExpiredError extends Error {
  constructor(message = 'DID prepare has expired; prepare a new transaction') {
    super(message);
    this.name = 'DidPrepareExpiredError';
  }
}

export class DidSubmissionContentionError extends Error {
  constructor(
    message = 'Transaction submission collided repeatedly; retry shortly',
  ) {
    super(message);
    this.name = 'DidSubmissionContentionError';
  }
}
