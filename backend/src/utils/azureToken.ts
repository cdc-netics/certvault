import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

/**
 * Verificación criptográfica de los id_token emitidos por Microsoft Entra ID.
 *
 * El endpoint de SSO recibe el token desde el navegador, es decir, desde un canal que el
 * atacante controla por completo. Decodificar el payload sin comprobar la firma equivale a
 * confiar en que el cliente declare quién es: cualquiera podría fabricar un JWT con el
 * correo de un administrador. La firma contra las claves públicas del tenant (JWKS) es lo
 * único que ata el token a Microsoft.
 */
export interface AzureIdTokenClaims {
  tid?: string;
  oid?: string;
  email?: string;
  preferred_username?: string;
  upn?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  department?: string;
  jobTitle?: string;
}

export interface AzureTokenVerificationConfig {
  tenantId: string;
  clientId: string;
}

/**
 * Las claves de firma rotan, por lo que el cliente JWKS se cachea por tenant en lugar de
 * fijar la clave: la librería refresca automáticamente ante un `kid` desconocido.
 */
const jwksClientsByTenant = new Map<string, JwksClient>();

const getJwksClient = (tenantId: string): JwksClient => {
  const cached = jwksClientsByTenant.get(tenantId);
  if (cached) {
    return cached;
  }

  const client = new JwksClient({
    jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
    cache: true,
    cacheMaxAge: 24 * 60 * 60 * 1000,
    rateLimit: true,
    jwksRequestsPerMinute: 10
  });

  jwksClientsByTenant.set(tenantId, client);
  return client;
};

const resolveSigningKey = (tenantId: string) => (header: JwtHeader, callback: SigningKeyCallback): void => {
  getJwksClient(tenantId)
    .getSigningKey(header.kid)
    .then((key) => callback(null, key.getPublicKey()))
    .catch((error: Error) => callback(error));
};

/**
 * Valida firma, emisor, audiencia y vigencia del token. Lanza si algo no cuadra: no existe
 * ruta alternativa ni degradación, porque un token que no supera la verificación es
 * indistinguible de uno falsificado.
 */
export const verifyAzureIdToken = async (
  idToken: string,
  { tenantId, clientId }: AzureTokenVerificationConfig
): Promise<AzureIdTokenClaims> => {
  const claims = await new Promise<AzureIdTokenClaims>((resolve, reject) => {
    jwt.verify(
      idToken,
      resolveSigningKey(tenantId),
      {
        algorithms: ['RS256'],
        audience: clientId,
        issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
        clockTolerance: 60
      },
      (error, decoded) => {
        if (error) {
          return reject(error);
        }
        if (!decoded || typeof decoded === 'string') {
          return reject(new Error('El token de Azure AD no contiene un payload válido.'));
        }
        resolve(decoded as AzureIdTokenClaims);
      }
    );
  });

  // El emisor ya ata el token al tenant; se revalida el claim para dejar explícito el
  // criterio y cubrir configuraciones de emisor multi-tenant.
  if (claims.tid !== tenantId) {
    throw new Error('El token de Azure AD no corresponde al Tenant configurado.');
  }

  return claims;
};
