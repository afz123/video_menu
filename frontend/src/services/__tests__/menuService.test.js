import { describe, it, expect, vi, beforeEach } from 'vitest';
import { menuService } from '../menuService';
import { api } from '../api';

describe('menuService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls getRestaurants via api.get', async () => {
    const spy = vi.spyOn(api, 'get').mockResolvedValue([{ id: 1, name: 'ASR' }]);
    const res = await menuService.getRestaurants();
    expect(spy).toHaveBeenCalledWith('/restaurants');
    expect(res).toEqual([{ id: 1, name: 'ASR' }]);
  });

  it('calls getRestaurant by slug', async () => {
    const spy = vi.spyOn(api, 'get').mockResolvedValue({ slug: 'asr-royale' });
    const res = await menuService.getRestaurant('asr-royale');
    expect(spy).toHaveBeenCalledWith('/restaurants/asr-royale');
    expect(res.slug).toBe('asr-royale');
  });

  it('calls getFullMenu with includeUnavailable flag', async () => {
    const spy = vi.spyOn(api, 'get').mockResolvedValue({ categories: [] });
    await menuService.getFullMenu('asr-royale', true);
    expect(spy).toHaveBeenCalledWith('/restaurants/asr-royale/full-menu?include_unavailable=true');
  });

  it('calls createDish and updateDish with correct endpoints', async () => {
    const spyPost = vi.spyOn(api, 'post').mockResolvedValue({ id: 10 });
    const spyPut = vi.spyOn(api, 'put').mockResolvedValue({ id: 10, price: 299 });

    const newDish = { name_translations: { ru: 'Стейк' }, price: 299 };
    await menuService.createDish(newDish);
    expect(spyPost).toHaveBeenCalledWith('/dishes', newDish);

    await menuService.updateDish(10, { price: 350 });
    expect(spyPut).toHaveBeenCalledWith('/dishes/10', { price: 350 });
  });

  it('calls translateTexts with source and target languages', async () => {
    const spy = vi.spyOn(api, 'post').mockResolvedValue({
      translations: { en: { name: 'Steak' } }
    });

    const translateReq = {
      source_lang: 'ru',
      target_langs: ['en', 'tj'],
      fields: { name: 'Стейк' }
    };

    const res = await menuService.translateTexts(translateReq);
    expect(spy).toHaveBeenCalledWith('/translate', translateReq);
    expect(res.translations.en.name).toBe('Steak');
  });

  it('calls loginAdmin and verifyAdminToken', async () => {
    const spyPost = vi.spyOn(api, 'post').mockResolvedValue({ token: 'test-token' });

    await menuService.loginAdmin('admin123', 'asr-royale');
    expect(spyPost).toHaveBeenCalledWith('/auth/login', {
      password: 'admin123',
      slug: 'asr-royale'
    });

    await menuService.verifyAdminToken('test-token');
    expect(spyPost).toHaveBeenCalledWith('/auth/verify', { token: 'test-token' });
  });
});
