import * as signalR from "@microsoft/signalr";

// Define retry policy options interface
export interface RetryPolicyOptions {
  initialRetryDelayMs?: number;
  maxRetryDelayMs?: number;
  maxRetryCount?: number;
  useExponentialBackoff?: boolean;
}

export class CustomRetryPolicy implements signalR.IRetryPolicy {
  private readonly _options: RetryPolicyOptions;
  
  constructor(options?: RetryPolicyOptions) {
    // Default retry policy options
    this._options = {
      initialRetryDelayMs: 1000,
      maxRetryDelayMs: 30000,
      maxRetryCount: 30,
      useExponentialBackoff: true,
      ...options
    };
  }
  
  nextRetryDelayInMilliseconds(retryContext: signalR.RetryContext): number | null {
    // Check if we've hit the maximum retry count
    if (retryContext.previousRetryCount >= (this._options.maxRetryCount || 30)) {
      console.warn(`Maximum retry count (${this._options.maxRetryCount}) reached.`);
      return null; // Stop retrying
    }

    let retryDelay: number;
    
    // Handle first retry differently if needed
    if (retryContext.previousRetryCount === 0) {
      retryDelay = 0; // First retry immediately
    } else if (this._options.useExponentialBackoff) {
      // Implement exponential backoff with jitter
      // Formula: initialDelay * 2^(retryCount-1) + random jitter
      const exponentialDelay = this._options.initialRetryDelayMs! * Math.pow(2, retryContext.previousRetryCount - 1);
      const jitter = Math.random() * 100; // Add up to 100ms of jitter
      retryDelay = Math.min(exponentialDelay + jitter, this._options.maxRetryDelayMs!);
    } else {
      // Linear retry strategy
      if (retryContext.previousRetryCount < 10) {
        retryDelay = 1000;
      } else if (retryContext.previousRetryCount < 20) {
        retryDelay = 2000;
      } else {
        retryDelay = 5000;
      }
    }
    
    console.info(`Retry attempt ${retryContext.previousRetryCount + 1} scheduled in ${retryDelay}ms`);
    return retryDelay;
  }
}