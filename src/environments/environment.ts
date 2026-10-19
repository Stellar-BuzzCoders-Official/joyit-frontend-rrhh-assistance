export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:5000',
  // Configuración de Microsoft Entra ID (MSAL)
  azureAd: {
    clientId: 'your-entra-client-id',
    tenantId: 'your-entra-tenant-id',
    redirectUri: 'http://localhost:4200',
    scopes: ['api://your-entra-client-id/access_as_user'],
  },
  // Alternador: en modo desarrollo permite operar inmediatamente con dev-token
  useDevAuth: true,
};
