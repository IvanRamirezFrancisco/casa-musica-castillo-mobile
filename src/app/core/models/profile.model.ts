export interface UserProfile {
  readonly id: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string | null;
  readonly enabled: boolean;
  readonly twoFactorEnabled: boolean;
  readonly emailTwoFactorEnabled: boolean;
  readonly totpEnabled: boolean;
  readonly backupCodesEnabled: boolean;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}
