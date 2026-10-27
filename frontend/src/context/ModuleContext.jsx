import React, { createContext, useContext, useMemo, useCallback } from 'react';

export const MODULES = {
  MENU: 'menu',
  ORDERING: 'ordering',
  SERVICE_DISPATCH: 'service_dispatch',
  GUEST_FINANCE: 'guest_finance',
  RESERVATIONS: 'reservations',
  KIOSK: 'kiosk',
  KDS: 'kds'
};

const ModuleContext = createContext({
  hasModule: () => true,
  enabledModules: Object.values(MODULES)
});

export const ModuleProvider = ({ enabledModules = Object.values(MODULES), children }) => {
  const modulesSet = useMemo(() => {
    const list = Array.isArray(enabledModules) ? enabledModules : Object.values(MODULES);
    const set = new Set(list);
    set.add(MODULES.MENU); // Core модуль menu всегда активен
    return set;
  }, [enabledModules]);

  const hasModule = useCallback((moduleKey) => {
    if (moduleKey === MODULES.MENU) return true;
    return modulesSet.has(moduleKey);
  }, [modulesSet]);

  const value = useMemo(() => ({
    hasModule,
    enabledModules: Array.from(modulesSet)
  }), [hasModule, modulesSet]);

  return (
    <ModuleContext.Provider value={value}>
      {children}
    </ModuleContext.Provider>
  );
};

export const useModules = () => useContext(ModuleContext);
