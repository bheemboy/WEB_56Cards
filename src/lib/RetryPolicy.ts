import * as signalR from "@microsoft/signalr";

export class CustomRetryPolicy implements signalR.IRetryPolicy {
  nextRetryDelayInMilliseconds(retryContext: signalR.RetryContext): number | null {
    let retryDelay = null;
    if (retryContext.previousRetryCount === 0) {
      retryDelay = 0;
    } else if (retryContext.previousRetryCount < 10) {
      retryDelay = 1000;
    } else if (retryContext.previousRetryCount < 20) {
      retryDelay = 2000;
    } else if (retryContext.previousRetryCount < 30) {
      retryDelay = 5000;
    }
    return retryDelay;
  }
}