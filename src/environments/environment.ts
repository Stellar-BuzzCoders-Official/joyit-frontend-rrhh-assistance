export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:5000',
  // Configuración de Microsoft Entra ID (MSAL)
  azureAd: {
    clientId: 'ae7c6bcf-a228-4e18-8c76-c44eab86da03', // rrhh-assistance-spa
    tenantId: '0ceb204d-9306-498e-90d5-e8bdee8f5d58',
    backendClientId: '9805b3f2-4ecf-4d71-bfa6-29df91b721c8', // rrhh-assistance-api
    redirectUri: 'http://localhost:4200',
    scopes: ['openid', 'profile', 'email', 'api://9805b3f2-4ecf-4d71-bfa6-29df91b721c8/access_as_user'],
  },
  // Alternador: en modo desarrollo permite operar inmediatamente con dev-token
  useDevAuth: true,
};
