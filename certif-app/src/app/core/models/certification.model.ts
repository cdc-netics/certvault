export interface Certification {
  _id?: string;
  title: string;
  description: string;
  type: CertificationType;
  technology: string;
  provider: string;
  level: CertificationLevel;
  employeeId: string;
  employeeName: string;
  department: string;
  issueDate: Date;
  expirationDate: Date;
  certificateNumber: string;
  certificateUrl?: string;
  status: CertificationStatus;
  score?: number;
  validationUrl?: string;
  tags: string[];
  cost?: number;
  currency?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
  userIsActive?: boolean;
  userDepartment?: string;
  userReferenceMissing?: boolean;
}

export enum CertificationType {
  TECHNICAL = 'technical',
  PROFESSIONAL = 'professional',
  SECURITY = 'security',
  CLOUD = 'cloud',
  MANAGEMENT = 'management',
  SOFT_SKILLS = 'soft_skills',
  COMPLIANCE = 'compliance',
  OTHER = 'other'
}

export enum CertificationLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export enum CertificationStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  EXPIRING_SOON = 'expiring_soon',
  PENDING = 'pending',
  REVOKED = 'revoked'
}

export interface CertificationFilter {
  search?: string;
  type?: CertificationType;
  technology?: string;
  level?: CertificationLevel;
  status?: CertificationStatus;
  department?: string;
  dateFrom?: Date;
  dateTo?: Date;
  expiringInDays?: number;
}

export interface CertificationStats {
  total: number;
  active: number;
  expired: number;
  expiringSoon: number;
  byType: { [key in CertificationType]: number };
  byDepartment: { [key: string]: number };
  byLevel: { [key in CertificationLevel]: number };
}
