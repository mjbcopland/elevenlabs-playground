import { getReasonPhrase } from "http-status-codes";

export class HTTPError extends Error {
  public readonly name: string = "HTTPError";
  public readonly cause: unknown;
  public readonly status: number;

  public constructor(status: number, options?: { cause?: Error }) {
    super();

    this.cause = options?.cause;
    this.status = status;
  }

  public get statusText(): string {
    return getReasonPhrase(this.status);
  }

  public get message(): string {
    return `${this.status} ${this.statusText}`;
  }
}
