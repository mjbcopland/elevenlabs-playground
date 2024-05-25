import { getReasonPhrase } from "http-status-codes";

export class HTTPError extends Error {
  public constructor(
    public readonly status: number,
    message?: string,
  ) {
    super(message);
  }

  public get statusText(): string {
    return getReasonPhrase(this.status);
  }

  public get message(): string {
    if (this.message === undefined) {
      return `${this.status} ${this.statusText}`;
    }

    return `${this.status} ${this.statusText} ${this.message}`;
  }
}
