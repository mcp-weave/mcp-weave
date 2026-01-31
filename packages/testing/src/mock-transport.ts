/**
 * Mock transport for testing MCP servers
 */
export interface MockMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * Mock transport that captures messages
 */
export class MockTransport {
  private sentMessages: MockMessage[] = [];
  private receivedMessages: MockMessage[] = [];
  private responseHandlers: Map<string, (message: MockMessage) => MockMessage | null> = new Map();

  /**
   * Send a message
   */
  send(message: MockMessage): void {
    this.sentMessages.push(message);
  }

  /**
   * Simulate receiving a message
   */
  receive(message: MockMessage): void {
    this.receivedMessages.push(message);
    
    if (message.method) {
      const handler = this.responseHandlers.get(message.method);
      if (handler) {
        const response = handler(message);
        if (response) {
          this.send(response);
        }
      }
    }
  }

  /**
   * Register a handler for a method
   */
  onMethod(method: string, handler: (message: MockMessage) => MockMessage | null): void {
    this.responseHandlers.set(method, handler);
  }

  /**
   * Get all sent messages
   */
  getSentMessages(): MockMessage[] {
    return [...this.sentMessages];
  }

  /**
   * Get all received messages
   */
  getReceivedMessages(): MockMessage[] {
    return [...this.receivedMessages];
  }

  /**
   * Clear all messages
   */
  clear(): void {
    this.sentMessages = [];
    this.receivedMessages = [];
  }

  /**
   * Get the last sent message
   */
  getLastSent(): MockMessage | undefined {
    return this.sentMessages[this.sentMessages.length - 1];
  }

  /**
   * Get the last received message
   */
  getLastReceived(): MockMessage | undefined {
    return this.receivedMessages[this.receivedMessages.length - 1];
  }
}

/**
 * Create a mock transport
 */
export function createMockTransport(): MockTransport {
  return new MockTransport();
}
