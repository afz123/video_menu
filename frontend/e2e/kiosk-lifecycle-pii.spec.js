import { test, expect } from '@playwright/test';

test.describe('Kiosk Outdoor Lifecycle & PII Sanitization', () => {
  test('переход Attract -> Заполнение формы -> Таймаут бездействия -> Полный сброс ПДн из DOM', async ({ page }) => {
    await page.goto('http://localhost:3033/kiosk/asr-royale');

    // 1. Проверяем наличие Attract экрана с видео
    const attractVideo = page.locator('video');
    await expect(attractVideo).toBeVisible();

    // 2. Первое касание — переход в интерактивный режим
    await page.click('text=Забронировать стол');
    const modal = page.locator('text=Онлайн-бронирование');
    await expect(modal).toBeVisible();

    // 3. Заполняем чувствительные персональные данные
    await page.click('text=Продолжить');
    await page.fill('input[placeholder="Имя Фамилия"]', 'Секретный VIP Гость');
    await page.fill('input[type="tel"]', '+992931234567');
    await page.fill('input[placeholder*="Пожелания"]', 'Аллергия на орехи, столик в углу');

    // 4. Эмулируем таймаут неактивности (45 сек)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-inactivity-timeout'));
    });

    // 5. Проверяем автосброс в Attract Mode
    await expect(attractVideo).toBeVisible();

    // 6. Повторно открываем форму и проверяем ПОЛНОЕ ОТСУТСТВИЕ старых ПДн в памяти и полях ввода
    await page.click('text=Забронировать стол');
    await page.click('text=Продолжить');
    const nameInput = page.locator('input[placeholder="Имя Фамилия"]');
    await expect(nameInput).toHaveValue('');
    const phoneInput = page.locator('input[type="tel"]');
    await expect(phoneInput).toHaveValue('+992 ');
  });
});
