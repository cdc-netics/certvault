import { Request } from 'express';
import { accountKeyFromRequest } from './passwordRecoveryRateLimit';

const buildRequest = (body: unknown, ip = '203.0.113.7'): Request =>
  ({ body, ip } as Request);

describe('accountKeyFromRequest', () => {
  it('indexa por el correo destino para que rotar de IP no multiplique el presupuesto', () => {
    expect(accountKeyFromRequest(buildRequest({ email: 'persona@empresa.com' }, '198.51.100.1'))).toBe(
      accountKeyFromRequest(buildRequest({ email: 'persona@empresa.com' }, '203.0.113.9'))
    );
  });

  it('agrupa variantes de mayusculas y espacios del mismo correo bajo una sola clave', () => {
    expect(accountKeyFromRequest(buildRequest({ email: '  Persona@Empresa.com ' }))).toBe(
      accountKeyFromRequest(buildRequest({ email: 'persona@empresa.com' }))
    );
  });

  it('separa correos distintos en contadores independientes', () => {
    expect(accountKeyFromRequest(buildRequest({ email: 'uno@empresa.com' }))).not.toBe(
      accountKeyFromRequest(buildRequest({ email: 'dos@empresa.com' }))
    );
  });

  // Sin correo utilizable, caer a la IP evita que peticiones de distintos origenes compartan
  // un mismo contador y se bloqueen entre si.
  it.each([
    ['un cuerpo sin correo', {}],
    ['un correo vacio', { email: '   ' }],
    ['un correo que no es texto', { email: { $ne: null } }],
    ['un cuerpo ausente', undefined]
  ])('cae a la clave por IP con %s', (_caso, body) => {
    expect(accountKeyFromRequest(buildRequest(body))).toMatch(/^ip:/);
  });

  it('distingue IPs distintas cuando no hay correo', () => {
    expect(accountKeyFromRequest(buildRequest({}, '198.51.100.1'))).not.toBe(
      accountKeyFromRequest(buildRequest({}, '203.0.113.9'))
    );
  });
});
