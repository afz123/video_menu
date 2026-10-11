import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../api';

describe('Frontend API Client (api.js)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('performs GET request with JSON headers and returns data', async () => {
    const mockData = { id: 1, name: 'ASR Royale' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData
    });

    const res = await api.get('/restaurants/asr-royale');
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/restaurants/asr-royale', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    expect(res).toEqual(mockData);
  });

  it('performs POST request with stringified body', async () => {
    const mockData = { status: 'created', id: 42 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData
    });

    const postPayload = { title: 'Steak' };
    const res = await api.post('/dishes', postPayload);

    expect(global.fetch).toHaveBeenCalledWith('/api/v1/dishes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postPayload)
    });
    expect(res).toEqual(mockData);
  });

  it('performs PUT request correctly', async () => {
    const mockData = { status: 'updated' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData
    });

    const putPayload = { price: 250 };
    const res = await api.put('/dishes/1', putPayload);

    expect(global.fetch).toHaveBeenCalledWith('/api/v1/dishes/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putPayload)
    });
    expect(res).toEqual(mockData);
  });

  it('throws descriptive error on HTTP failure with json detail', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ detail: 'Категория не найдена' })
    });

    await expect(api.get('/categories/999')).rejects.toThrow('Категория не найдена');
  });

  it('throws default status error when error JSON lacks detail', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => { throw new Error('Not JSON'); }
    });

    await expect(api.get('/crash')).rejects.toThrow('Request failed: 500 Internal Server Error');
  });
});
