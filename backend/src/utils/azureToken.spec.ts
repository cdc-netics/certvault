import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * Se sustituye el cliente JWKS por uno que devuelve una clave pública controlada por la
 * prueba, de modo que se ejerza la verificación real de firma sin salir a la red.
 */
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

const getSigningKey = jest.fn().mockResolvedValue({ getPublicKey: () => publicKeyPem });

jest.mock('jwks-rsa', () => ({
  JwksClient: jest.fn().mockImplementation(() => ({
    getSigningKey: (...args: unknown[]) => getSigningKey(...args)
  }))
}));

import { verifyAzureIdToken } from './azureToken';

const TENANT_ID = '11111111-2222-3333-4444-555555555555';
const CLIENT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const CONFIG = { tenantId: TENANT_ID, clientId: CLIENT_ID };

const signToken = (payload: Record<string, unknown>, options: jwt.SignOptions = {}): string =>
  jwt.sign(payload, privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(), {
    algorithm: 'RS256',
    expiresIn: '5m',
    audience: CLIENT_ID,
    issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
    ...options
  });

describe('verifyAzureIdToken', () => {
  it('acepta un token bien formado y devuelve sus claims', async () => {
    const token = signToken({ tid: TENANT_ID, email: 'colaborador@empresa.cl', given_name: 'Ana' });

    const claims = await verifyAzureIdToken(token, CONFIG);

    expect(claims.email).toBe('colaborador@empresa.cl');
    expect(claims.given_name).toBe('Ana');
  });

  it('rechaza un token fabricado sin firma válida (regresión del bypass ISS-024)', async () => {
    // Exactamente lo que aceptaba jwt.decode: un payload legítimo con firma inventada.
    const forged = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url') +
      '.' + Buffer.from(JSON.stringify({ tid: TENANT_ID, email: 'admin@empresa.cl' })).toString('base64url') +
      '.firma-inventada';

    await expect(verifyAzureIdToken(forged, CONFIG)).rejects.toThrow();
  });

  it('rechaza un token firmado con otra clave', async () => {
    const otraClave = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
    const token = jwt.sign(
      { tid: TENANT_ID, email: 'admin@empresa.cl' },
      otraClave.export({ type: 'pkcs8', format: 'pem' }).toString(),
      {
        algorithm: 'RS256',
        expiresIn: '5m',
        audience: CLIENT_ID,
        issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`
      }
    );

    await expect(verifyAzureIdToken(token, CONFIG)).rejects.toThrow();
  });

  it('rechaza un token cuya audiencia no es el Client ID registrado', async () => {
    const token = signToken({ tid: TENANT_ID }, { audience: 'otra-aplicacion' });

    await expect(verifyAzureIdToken(token, CONFIG)).rejects.toThrow(/audience/i);
  });

  it('rechaza un token emitido por otro tenant', async () => {
    const token = signToken(
      { tid: TENANT_ID },
      { issuer: 'https://login.microsoftonline.com/99999999-9999-9999-9999-999999999999/v2.0' }
    );

    await expect(verifyAzureIdToken(token, CONFIG)).rejects.toThrow(/issuer/i);
  });

  it('rechaza un token expirado', async () => {
    const token = signToken({ tid: TENANT_ID }, { expiresIn: '-10m' });

    await expect(verifyAzureIdToken(token, CONFIG)).rejects.toThrow(/expired/i);
  });

  it('rechaza un token cuyo claim tid no corresponde al tenant configurado', async () => {
    const token = signToken({ tid: '00000000-0000-0000-0000-000000000000' });

    await expect(verifyAzureIdToken(token, CONFIG)).rejects.toThrow(/Tenant/i);
  });

  it('rechaza un token sin firmar (alg none)', async () => {
    const unsigned = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') +
      '.' + Buffer.from(JSON.stringify({ tid: TENANT_ID, email: 'admin@empresa.cl' })).toString('base64url') +
      '.';

    await expect(verifyAzureIdToken(unsigned, CONFIG)).rejects.toThrow();
  });
});
