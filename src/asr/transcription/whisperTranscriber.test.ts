/**
 * Tests for whisperTranscriber
 * 
 * Note: These tests mock the fetch API since the sidecar may not be running.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally before importing the module
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocking
import { whisperTranscriber, checkSidecarHealth } from './whisperTranscriber';

describe('whisperTranscriber', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('checkSidecarHealth', () => {
    it('should return health status when sidecar is available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, model_loaded: true }),
      });

      const result = await checkSidecarHealth();

      expect(result).toEqual({ ok: true, model_loaded: true });
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/health');
    });

    it('should throw when sidecar returns error status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      await expect(checkSidecarHealth()).rejects.toThrow('health check failed');
    });
  });

  describe('transcribe', () => {
    it('should send audio blob to sidecar and return text', async () => {
      const mockBlob = new Blob(['fake audio'], { type: 'audio/webm' });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: 'Hello world', segments: 1 }),
      });

      const result = await whisperTranscriber.transcribe(mockBlob);

      expect(result).toBe('Hello world');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Check that it was a POST with FormData
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3001/transcribe');
      expect(options.method).toBe('POST');
      expect(options.body).toBeInstanceOf(FormData);
    });

    it('should pass abort signal to fetch', async () => {
      const mockBlob = new Blob(['fake audio'], { type: 'audio/webm' });
      const controller = new AbortController();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: 'Test', segments: 1 }),
      });

      await whisperTranscriber.transcribe(mockBlob, { signal: controller.signal });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.signal).toBe(controller.signal);
    });

    it('should throw on server error with error message', async () => {
      const mockBlob = new Blob(['fake audio'], { type: 'audio/webm' });
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => JSON.stringify({ error: 'Model not loaded' }),
      });

      await expect(whisperTranscriber.transcribe(mockBlob)).rejects.toThrow('Model not loaded');
    });

    it('should throw on server error with plain text response', async () => {
      const mockBlob = new Blob(['fake audio'], { type: 'audio/webm' });
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Internal Server Error',
      });

      await expect(whisperTranscriber.transcribe(mockBlob)).rejects.toThrow('Internal Server Error');
    });
  });
});
