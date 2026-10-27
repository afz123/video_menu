import { describe, it, expect } from 'vitest';

describe('Smart Bill Split Calculation Logic', () => {
  it('correctly calculates personal sums, shared pool and service charge', () => {
    const guests = [
      { id: 'g1', name: 'Алишер' },
      { id: 'g2', name: 'Фаррух' }
    ];

    const flattenedItems = [
      { uid: 'ribeye_0', price: 350 }, // Алишер
      { uid: 'caesar_0', price: 75 },  // Фаррух
      { uid: 'cheesecake_0', price: 65 }, // Фаррух
      { uid: 'wine_0', price: 200 } // Общий стол (никто не выбрал)
    ];

    const itemAssignments = {
      'ribeye_0': 'g1',
      'caesar_0': 'g2',
      'cheesecake_0': 'g2'
    };

    const serviceChargePercent = 10;
    const tipPercent = 0;

    let sharedPoolTotal = 0;
    const guestTotals = {
      g1: { personalSum: 0 },
      g2: { personalSum: 0 }
    };

    flattenedItems.forEach((item) => {
      const assignedTo = itemAssignments[item.uid];
      if (assignedTo && guestTotals[assignedTo]) {
        guestTotals[assignedTo].personalSum += item.price;
      } else {
        sharedPoolTotal += item.price;
      }
    });

    expect(sharedPoolTotal).toBe(200);
    expect(guestTotals.g1.personalSum).toBe(350);
    expect(guestTotals.g2.personalSum).toBe(140);

    const sharedPerPerson = sharedPoolTotal / guests.length; // 100
    expect(sharedPerPerson).toBe(100);

    const svcRate = serviceChargePercent / 100;

    // Алишер: (350 + 100) * 1.1 = 450 * 1.1 = 495
    const g1Subtotal = guestTotals.g1.personalSum + sharedPerPerson;
    const g1Total = Math.round(g1Subtotal * (1 + svcRate));
    expect(g1Total).toBe(495);

    // Фаррух: (140 + 100) * 1.1 = 240 * 1.1 = 264
    const g2Subtotal = guestTotals.g2.personalSum + sharedPerPerson;
    const g2Total = Math.round(g2Subtotal * (1 + svcRate));
    expect(g2Total).toBe(264);

    // Сумма чеков: 495 + 264 = 759
    // Исходная сумма: (350 + 140 + 200) * 1.1 = 690 * 1.1 = 759
    expect(g1Total + g2Total).toBe(Math.round((350 + 140 + 200) * 1.1));
  });

  it('handles empty assignments where all items are shared equally', () => {
    const guests = [
      { id: 'g1', name: 'Гость 1' },
      { id: 'g2', name: 'Гость 2' },
      { id: 'g3', name: 'Гость 3' }
    ];

    const flattenedItems = [
      { uid: 'pizza_0', price: 150 },
      { uid: 'lemonade_0', price: 60 }
    ];

    const itemAssignments = {};
    let sharedPoolTotal = 0;

    flattenedItems.forEach((item) => {
      sharedPoolTotal += item.price;
    });

    expect(sharedPoolTotal).toBe(210);
    const sharedPerPerson = sharedPoolTotal / 3;
    expect(sharedPerPerson).toBe(70);
  });

  it('safely extracts modifier option names without producing undefined', () => {
    const item = {
      dish: { name: 'Стейк Рибай' },
      quantity: 1,
      chosenOptions: [
        { modifierName: 'Рекомендация сомелье к', optionName: 'Шато Марго' },
        { name: 'Соус перечный' },
        'Без лука'
      ]
    };
    const optionsText = item.chosenOptions?.length
      ? item.chosenOptions.map((o) => (typeof o === 'string' ? o : o.optionName || o.name || '')).filter(Boolean).join(' • ')
      : null;

    expect(optionsText).toBe('Шато Марго • Соус перечный • Без лука');
    expect(optionsText).not.toContain('undefined');
  });
});
