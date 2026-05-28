import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { PublicApiClient } from '../models/PublicApiClient';

export interface PublicApiClientContext {
  id: string;
  name: string;
  canDownloadFiles: boolean;
  rateLimitPerMinute: number;
  maxPageSize: number;
}

export interface PublicApiRequest extends Request {
  publicApiClient?: PublicApiClientContext;
}

const readApiKeyFromRequest = (req: Request): string | null => {
  const headerKey = req.header('x-api-key');
  if (headerKey) return headerKey;

  const authHeader = req.header('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  return null;
};

const hashApiKey = (apiKey: string): string => {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
};

let cachedConfig:
  | {
      expiresAt: number;
      byHash: Record<string, PublicApiClientContext>;
    }
  | null = null;

const getCachedApiConfig = async (): Promise<Record<string, PublicApiClientContext>> => {
  if (cachedConfig && cachedConfig.expiresAt > Date.now()) {
    return cachedConfig.byHash;
  }

  const clients = await PublicApiClient.find({ isActive: true, canReadCertifications: true })
    .select('+apiKeyHash name canDownloadFiles rateLimitPerMinute maxPageSize')
    .lean();

  const byHash: Record<string, PublicApiClientContext> = {};
  for (const client of clients) {
    if (!client.apiKeyHash) continue;
    byHash[client.apiKeyHash] = {
      id: client._id.toString(),
      name: client.name,
      canDownloadFiles: Boolean(client.canDownloadFiles),
      rateLimitPerMinute: Number(client.rateLimitPerMinute || 60),
      maxPageSize: Number(client.maxPageSize || 50)
    };
  }

  cachedConfig = {
    byHash,
    expiresAt: Date.now() + 30000
  };

  return byHash;
};

export const clearApiKeyCache = (): void => {
  cachedConfig = null;
};

const requestCounters = new Map<string, { minuteBucket: number; count: number }>();

const checkRateLimit = (client: PublicApiClientContext): boolean => {
  const minuteBucket = Math.floor(Date.now() / 60000);
  const counterKey = client.id;
  const current = requestCounters.get(counterKey);

  if (!current || current.minuteBucket !== minuteBucket) {
    requestCounters.set(counterKey, { minuteBucket, count: 1 });
    return true;
  }

  if (current.count >= client.rateLimitPerMinute) {
    return false;
  }

  current.count += 1;
  requestCounters.set(counterKey, current);
  return true;
};

export const requireApiKey = async (req: PublicApiRequest, res: Response, next: NextFunction): Promise<void> => {
  let apiConfigByHash: Record<string, PublicApiClientContext>;
  try {
    apiConfigByHash = await getCachedApiConfig();
  } catch (error) {
    console.error('No se pudo leer configuracion de API externa:', error);
    res.status(500).json({
      success: false,
      error: 'Error validando API key'
    });
    return;
  }

  if (Object.keys(apiConfigByHash).length === 0) {
    res.status(503).json({
      success: false,
      error: 'API externa no configurada'
    });
    return;
  }

  const providedKey = readApiKeyFromRequest(req);
  const providedHash = providedKey ? hashApiKey(providedKey) : '';
  const client = providedHash ? apiConfigByHash[providedHash] : undefined;

  if (!providedKey || !client) {
    res.status(401).json({
      success: false,
      error: 'API key invalida'
    });
    return;
  }

  if (!checkRateLimit(client)) {
    res.status(429).json({
      success: false,
      error: 'Limite de solicitudes excedido para esta API key'
    });
    return;
  }

  req.publicApiClient = client;

  void PublicApiClient.updateOne({ _id: client.id }, { $set: { lastUsedAt: new Date() } }).catch((error) => {
    console.warn('No se pudo actualizar lastUsedAt del cliente API:', error);
  });

  next();
};
