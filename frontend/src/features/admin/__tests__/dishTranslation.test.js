import { describe, it, expect } from 'vitest';

describe('Dish Multi-Language Form Data Formatter', () => {
  // Helper implementing the exact formatting logic used in DishFormModal.jsx
  function formatDishPayload({
    restaurantId,
    categoryId,
    names,
    descriptions,
    ingredients,
    servings,
    price,
    currency,
    weightInfo,
    caloriesInfo,
    allergens,
    mediaId,
    isAvailable,
    activeLangs
  }) {
    const mainName = names.ru || Object.values(names).find((n) => n?.trim());
    if (!mainName) {
      throw new Error('Пожалуйста, введите название блюда хотя бы на одном языке');
    }

    const cleanNames = {};
    const cleanDescs = {};

    activeLangs.forEach((lang) => {
      if (names[lang]?.trim()) {
        cleanNames[lang] = names[lang].trim();
      }

      const d = descriptions[lang]?.trim() || '';
      const i = ingredients[lang]?.trim() || '';
      const s = servings[lang]?.trim() || '';

      if (d || i || s) {
        cleanDescs[lang] = {
          description: d,
          ingredients: i,
          serving: s
        };
      }
    });

    if (!cleanNames.ru) cleanNames.ru = mainName;
    if (!cleanNames.en && cleanNames.ru) cleanNames.en = cleanNames.ru;
    if (!cleanNames.tj && cleanNames.ru) cleanNames.tj = cleanNames.ru;

    const parsedAllergens = allergens
      ? allergens.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    return {
      restaurant_id: restaurantId,
      category_id: parseInt(categoryId, 10),
      name_translations: cleanNames,
      description_translations: cleanDescs,
      price: parseFloat(price),
      currency: currency.trim() || 'TJS',
      weight_info: weightInfo?.trim() || null,
      calories_info: caloriesInfo?.trim() || null,
      allergens: parsedAllergens,
      media_id: mediaId,
      is_available: isAvailable
    };
  }

  it('correctly creates nested description_translations per language', () => {
    const payload = formatDishPayload({
      restaurantId: 1,
      categoryId: 2,
      names: { ru: 'Стейк Рибай', en: 'Ribeye Steak', tj: 'Стейки Рибай' },
      descriptions: { ru: 'Сочный стейк', en: 'Juicy steak', tj: 'Стейки болаззат' },
      ingredients: { ru: 'Говядина, соль', en: 'Beef, salt', tj: 'Гӯшт, намак' },
      servings: { ru: 'С соусом', en: 'With sauce', tj: 'Бо чошнӣ' },
      price: '280',
      currency: 'TJS',
      weightInfo: '400г',
      caloriesInfo: '',
      allergens: 'соль, перец',
      mediaId: 5,
      isAvailable: true,
      activeLangs: ['ru', 'en', 'tj']
    });

    expect(payload.restaurant_id).toBe(1);
    expect(payload.category_id).toBe(2);
    expect(payload.price).toBe(280);
    expect(payload.calories_info).toBeNull();
    expect(payload.allergens).toEqual(['соль', 'перец']);

    // Check nested descriptions
    expect(payload.description_translations.ru).toEqual({
      description: 'Сочный стейк',
      ingredients: 'Говядина, соль',
      serving: 'С соусом'
    });
    expect(payload.description_translations.en).toEqual({
      description: 'Juicy steak',
      ingredients: 'Beef, salt',
      serving: 'With sauce'
    });
  });

  it('omits languages that have no description, ingredients, or serving', () => {
    const payload = formatDishPayload({
      restaurantId: 1,
      categoryId: 1,
      names: { ru: 'Чай зеленый' },
      descriptions: { ru: 'Зеленый чай', en: '', tj: '' },
      ingredients: { ru: '', en: '', tj: '' },
      servings: { ru: '', en: '', tj: '' },
      price: '25',
      currency: 'TJS',
      weightInfo: '500мл',
      caloriesInfo: null,
      allergens: '',
      mediaId: null,
      isAvailable: true,
      activeLangs: ['ru', 'en', 'tj']
    });

    expect(payload.description_translations.ru).toBeDefined();
    expect(payload.description_translations.en).toBeUndefined();
    expect(payload.description_translations.tj).toBeUndefined();
  });

  it('throws error when no title is provided', () => {
    expect(() =>
      formatDishPayload({
        restaurantId: 1,
        categoryId: 1,
        names: { ru: '', en: '' },
        descriptions: {},
        ingredients: {},
        servings: {},
        price: '100',
        currency: 'TJS',
        activeLangs: ['ru', 'en']
      })
    ).toThrow('Пожалуйста, введите название блюда хотя бы на одном языке');
  });
});
