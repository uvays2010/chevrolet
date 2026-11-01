/** Route inventory for the Chevrolet Universe frontend. Backend integration is intentionally out of scope. */
export const routeManifest = [
  { path: '/', area: 'public', feature: 'home' },
  { path: '/vehicles', area: 'automotive', feature: 'catalog' },
  { path: '/vehicles/:id', area: 'automotive', feature: 'vehicle-detail' },
  { path: '/configurator', area: 'automotive', feature: 'configuration-studio' },
  { path: '/compare', area: 'automotive', feature: 'comparison-center' },
  { path: '/universe', area: 'ecosystem', feature: 'global-directory' },
  { path: '/ecosystem/:slug', area: 'ecosystem', feature: 'module-workspace' },
  { path: '/portal/:role', area: 'identity', feature: 'customer-or-dealer-portal' },
  { path: '/admin', area: 'administration', feature: 'admin-overview' },
  { path: '/admin-center', area: 'administration', feature: 'enterprise-console' },
  { path: '/login', area: 'identity', feature: 'demo-authentication' }
];
