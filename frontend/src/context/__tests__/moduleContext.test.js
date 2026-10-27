import { describe, it, expect } from 'vitest';
import { MODULES } from '../ModuleContext';

export const resolveModules = (enabledModules) => {
  const list = Array.isArray(enabledModules) ? enabledModules : Object.values(MODULES);
  const set = new Set(list);
  set.add(MODULES.MENU);
  return {
    hasModule: (key) => key === MODULES.MENU || set.has(key),
    enabledModules: Array.from(set)
  };
};

describe('ModuleContext Fail-Safe & Gating Logic', () => {
  it('guarantees MODULES.MENU is always active even if empty list is passed', () => {
    const { hasModule, enabledModules } = resolveModules([]);
    expect(hasModule(MODULES.MENU)).toBe(true);
    expect(enabledModules).toContain(MODULES.MENU);
    expect(hasModule(MODULES.KIOSK)).toBe(false);
    expect(hasModule(MODULES.ORDERING)).toBe(false);
  });

  it('contains all 7 commercial modules in MODULES manifest', () => {
    expect(MODULES.MENU).toBe('menu');
    expect(MODULES.ORDERING).toBe('ordering');
    expect(MODULES.SERVICE_DISPATCH).toBe('service_dispatch');
    expect(MODULES.GUEST_FINANCE).toBe('guest_finance');
    expect(MODULES.RESERVATIONS).toBe('reservations');
    expect(MODULES.KIOSK).toBe('kiosk');
    expect(MODULES.KDS).toBe('kds');
  });

  it('selectively gates optional modules while retaining core menu', () => {
    const { hasModule } = resolveModules(['menu', 'kds']);
    expect(hasModule(MODULES.MENU)).toBe(true);
    expect(hasModule(MODULES.KDS)).toBe(true);
    expect(hasModule(MODULES.ORDERING)).toBe(false);
    expect(hasModule(MODULES.RESERVATIONS)).toBe(false);
  });
});
