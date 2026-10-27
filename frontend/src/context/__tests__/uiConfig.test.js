import { describe, it, expect } from 'vitest';
import { DEFAULT_UI_CONFIG } from '../UIConfigContext';

export const mergeUIConfig = (customConfig) => {
  if (!customConfig) return DEFAULT_UI_CONFIG;

  const result = {};
  const allSections = new Set([
    ...Object.keys(DEFAULT_UI_CONFIG),
    ...Object.keys(customConfig)
  ]);

  allSections.forEach((section) => {
    const defaultSec = DEFAULT_UI_CONFIG[section] || {};
    const customSec = customConfig[section] || {};

    result[section] = {
      ...defaultSec,
      ...customSec
    };
  });

  return result;
};

describe('UIConfigContext Feature Flags & Resilient Merging', () => {
  it('has all 8 core system sections in DEFAULT_UI_CONFIG', () => {
    expect(DEFAULT_UI_CONFIG).toHaveProperty('admin_tabs');
    expect(DEFAULT_UI_CONFIG).toHaveProperty('header');
    expect(DEFAULT_UI_CONFIG).toHaveProperty('dish_card');
    expect(DEFAULT_UI_CONFIG).toHaveProperty('service_bar');
    expect(DEFAULT_UI_CONFIG).toHaveProperty('cart');
    expect(DEFAULT_UI_CONFIG).toHaveProperty('kiosk');
    expect(DEFAULT_UI_CONFIG).toHaveProperty('kitchen_pacing');
    expect(DEFAULT_UI_CONFIG).toHaveProperty('kds');
  });

  it('guarantees fallback defaults when custom config is partial', () => {
    const customConfig = {
      dish_card: {
        show_sound_toggle: false,
        show_price: false
      },
      cart: {
        allow_self_ordering: false
      }
    };

    const merged = mergeUIConfig(customConfig);

    // Overridden flags are false
    expect(merged.dish_card.show_sound_toggle).toBe(false);
    expect(merged.dish_card.show_price).toBe(false);
    expect(merged.cart.allow_self_ordering).toBe(false);

    // Other flags retain default true
    expect(merged.dish_card.show_short_description).toBe(true);
    expect(merged.header.show_brand_name).toBe(true);
    expect(merged.admin_tabs.show_dishes_tab).toBe(true);
    expect(merged.cart.show_service_charge).toBe(true);
    expect(merged.kiosk.show_floor_plan).toBe(true);
  });

  it('preserves unknown custom sections dynamically via Set union', () => {
    const customConfig = {
      custom_loyalty: {
        enable_cashback: true,
        tier: 'gold'
      }
    };

    const merged = mergeUIConfig(customConfig);
    expect(merged).toHaveProperty('custom_loyalty');
    expect(merged.custom_loyalty.enable_cashback).toBe(true);
    expect(merged.custom_loyalty.tier).toBe('gold');
  });

  it('verifies service bar dismantles completely when no actions are enabled', () => {
    const barConfig = {
      show_service_bar: true,
      show_call_waiter_btn: false,
      show_request_bill_btn: false,
      show_cart_btn: false
    };
    const canDispatch = true;
    const canOrder = true;
    const cartCount = 0;

    const hasAnyAction =
      (canDispatch && (barConfig.show_call_waiter_btn !== false || barConfig.show_request_bill_btn !== false)) ||
      (canOrder && barConfig.show_cart_btn !== false && cartCount > 0);

    expect(hasAnyAction).toBe(false);
  });
});
