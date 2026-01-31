import { describe, it, expect, beforeEach } from 'vitest';
import { MockTransport, createMockTransport, type MockMessage } from '../mock-transport.js';

describe('MockTransport', () => {
  let transport: MockTransport;

  beforeEach(() => {
    transport = new MockTransport();
  });

  describe('send', () => {
    it('should store sent messages', () => {
      const message: MockMessage = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'test' },
      };

      transport.send(message);

      const sent = transport.getSentMessages();
      expect(sent).toHaveLength(1);
      expect(sent[0]).toEqual(message);
    });

    it('should store multiple sent messages', () => {
      transport.send({ jsonrpc: '2.0', id: 1, method: 'test1' });
      transport.send({ jsonrpc: '2.0', id: 2, method: 'test2' });
      transport.send({ jsonrpc: '2.0', id: 3, method: 'test3' });

      expect(transport.getSentMessages()).toHaveLength(3);
    });
  });

  describe('receive', () => {
    it('should store received messages', () => {
      const message: MockMessage = {
        jsonrpc: '2.0',
        id: 1,
        result: { success: true },
      };

      transport.receive(message);

      const received = transport.getReceivedMessages();
      expect(received).toHaveLength(1);
      expect(received[0]).toEqual(message);
    });

    it('should trigger method handlers', () => {
      let handlerCalled = false;

      transport.onMethod('tools/list', () => {
        handlerCalled = true;
        return null;
      });

      transport.receive({ jsonrpc: '2.0', id: 1, method: 'tools/list' });

      expect(handlerCalled).toBe(true);
    });

    it('should send response from handler', () => {
      transport.onMethod('tools/list', msg => ({
        jsonrpc: '2.0',
        id: msg.id,
        result: { tools: [] },
      }));

      transport.receive({ jsonrpc: '2.0', id: 1, method: 'tools/list' });

      const sent = transport.getSentMessages();
      expect(sent).toHaveLength(1);
      expect(sent[0].result).toEqual({ tools: [] });
    });

    it('should not send response if handler returns null', () => {
      transport.onMethod('ignore', () => null);

      transport.receive({ jsonrpc: '2.0', id: 1, method: 'ignore' });

      expect(transport.getSentMessages()).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should clear all messages', () => {
      transport.send({ jsonrpc: '2.0', id: 1 });
      transport.receive({ jsonrpc: '2.0', id: 2 });

      transport.clear();

      expect(transport.getSentMessages()).toHaveLength(0);
      expect(transport.getReceivedMessages()).toHaveLength(0);
    });
  });

  describe('getLastSent', () => {
    it('should return last sent message', () => {
      transport.send({ jsonrpc: '2.0', id: 1 });
      transport.send({ jsonrpc: '2.0', id: 2 });
      transport.send({ jsonrpc: '2.0', id: 3 });

      const last = transport.getLastSent();

      expect(last?.id).toBe(3);
    });

    it('should return undefined when no messages sent', () => {
      expect(transport.getLastSent()).toBeUndefined();
    });
  });

  describe('getLastReceived', () => {
    it('should return last received message', () => {
      transport.receive({ jsonrpc: '2.0', id: 1 });
      transport.receive({ jsonrpc: '2.0', id: 2 });

      const last = transport.getLastReceived();

      expect(last?.id).toBe(2);
    });

    it('should return undefined when no messages received', () => {
      expect(transport.getLastReceived()).toBeUndefined();
    });
  });

  describe('getSentMessages / getReceivedMessages', () => {
    it('should return copies of arrays', () => {
      transport.send({ jsonrpc: '2.0', id: 1 });

      const sent1 = transport.getSentMessages();
      const sent2 = transport.getSentMessages();

      expect(sent1).not.toBe(sent2);
      expect(sent1).toEqual(sent2);
    });
  });
});

describe('createMockTransport', () => {
  it('should create a mock transport', () => {
    const transport = createMockTransport();

    expect(transport).toBeInstanceOf(MockTransport);
  });
});
