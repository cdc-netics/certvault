import { ServerPolicy } from '../models/ServerPolicy';

export interface ResolvedServerPolicy {
  sendBackupOnDelete: boolean;
  requirePersonalEmail: boolean;
}

const DEFAULT_POLICY: ResolvedServerPolicy = {
  sendBackupOnDelete: true,
  requirePersonalEmail: true
};

export const getResolvedServerPolicy = async (): Promise<ResolvedServerPolicy> => {
  const policy = await ServerPolicy.findOne().lean();

  if (!policy) {
    return DEFAULT_POLICY;
  }

  return {
    sendBackupOnDelete: policy.sendBackupOnDelete !== false,
    requirePersonalEmail: policy.requirePersonalEmail !== false
  };
};
