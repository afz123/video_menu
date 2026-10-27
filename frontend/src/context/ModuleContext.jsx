import React, { createContext, useContext, useMemo } from 'react';

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
    return new Set(Array.isArray(enabledModules) ? enabledModules : Object.values(MODULES));
  }, [enabledModules]);

  const hasModule = (moduleKey) => modulesSet.has(moduleKey);

  return (
    <ModuleContext.Provider value={{ hasModule, enabledModules: Array.from(modulesSet) }}>
      {children}
    </ModuleContext.Provider>
  );
};

export const useModules = () => useContext(ModuleContext);
