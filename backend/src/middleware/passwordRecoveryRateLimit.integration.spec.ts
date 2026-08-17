import express from 'express';
import { AddressInfo } from 'net';
import {
  passwordRecoveryAccountLimiter,
  passwordRecoveryIpLimiter,
  resetTokenAttemptLimiter
} from './passwordRecoveryRateLimit';

/**
 * Verifica que los limitadores bloquean de verdad. Los contadores viven en memoria y son
 * compartidos por todo el proceso, asi que cada prueba usa una IP simulada distinta mediante
 * X-Forwarded-For (como en produccion, donde el servidor confia en el proxy inverso) y correos
 * distintos, para que los presupuestos no se contaminen entre pruebas.
 */
const buildTestServer = () => {
  const app = express();
  // Mismo valor que server.ts: se confia en un unico salto de proxy inverso. Con `true`,
  // express-rate-limit advierte con razon que cualquiera podria falsear su IP y evadir el limite.
  app.set('trust proxy', 1);
  app.use(express.json());

  app.post('/forgot-password', passwordRecoveryIpLimiter, passwordRecoveryAccountLimiter, (_req, res) => {
    res.json({ success: true });
  });

  // Simula el contrato real: el enlace valido responde 2xx y el intento fallido 400.
  app.post('/reset-password', resetTokenAttemptLimiter, (req, res) => {
    if (req.body?.validLink) {
      res.json({ success: true });
      return;
    }
    res.status(400).json({ success: false });
  });

  return app.listen(0);
};

let server: ReturnType<typeof buildTestServer>;
let baseUrl: string;

beforeAll(() => {
  server = buildTestServer();
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  server.close();
});

const post = async (path: string, body: unknown, clientIp: string): Promise<number> => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': clientIp },
    body: JSON.stringify(body)
  });
  return response.status;
};

const statusesFor = async (
  count: number,
  call: (attempt: number) => Promise<number>
): Promise<number[]> => {
  const statuses: number[] = [];
  for (let attempt = 0; attempt < count; attempt++) {
    statuses.push(await call(attempt));
  }
  return statuses;
};

describe('limites de recuperacion de contrasena', () => {
  it('corta la inundacion desde una misma IP tras agotar su presupuesto', async () => {
    const statuses = await statusesFor(7, (attempt) =>
      post('/forgot-password', { email: `objetivo${attempt}@empresa.com` }, '198.51.100.10')
    );

    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });

  it('corta la inundacion del buzon de una victima aunque el atacante rote de IP', async () => {
    const victimEmail = 'victima@empresa.com';
    const statuses = await statusesFor(5, (attempt) =>
      post('/forgot-password', { email: victimEmail }, `203.0.113.${attempt + 1}`)
    );

    // El limite por cuenta (3) es mas estricto que el de IP y actua primero: rotar de IP no ayuda.
    expect(statuses).toEqual([200, 200, 200, 429, 429]);
  });

  it('no penaliza el uso repetido de un enlace legitimo', async () => {
    const statuses = await statusesFor(12, () =>
      post('/reset-password', { validLink: true }, '198.51.100.20')
    );

    expect(statuses.every((status) => status === 200)).toBe(true);
  });

  it('corta los intentos fallidos de adivinar un token', async () => {
    const statuses = await statusesFor(12, () =>
      post('/reset-password', { validLink: false }, '198.51.100.21')
    );

    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(400));
    expect(statuses.slice(10)).toEqual([429, 429]);
  });
});
