export interface SmtpProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  hasPassword: boolean;
  fromName: string;
  fromEmail: string;
  isActive: boolean;
  rejectUnauthorized: boolean;
  connectionTimeout: number;
  sendBackupOnDelete: boolean;
  requirePersonalEmail: boolean;
  lastTestAt?: string;
  lastTestSuccess?: boolean;
  lastTestMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SmtpProfilePayload {
  name: string;
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  fromName: string;
  fromEmail: string;
  isActive?: boolean;
  rejectUnauthorized: boolean;
  connectionTimeout: number;
  sendBackupOnDelete?: boolean;
  requirePersonalEmail?: boolean;
}
