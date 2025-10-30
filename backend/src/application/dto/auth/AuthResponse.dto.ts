export class InstructorDto {
  id: number;
  username: string;
  name: string;
  phoneNumber: string;
  email: string;
  paymentType: 'free' | 'paid';
  isCertified: boolean;
  certificationNumber?: string;
  subscriptionEndDate?: Date;
  status: 'active' | 'inactive' | 'suspended';
}

export class MemberDto {
  id: number;
  phoneNumber: string;
  name: string;
  birthDate?: Date;
  gender?: 'M' | 'F' | 'Other';
  height?: number;
  weight?: number;
  status: 'active' | 'inactive' | 'deleted';
  instructor: {
    id: number;
    name: string;
  };
}

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  instructor?: InstructorDto;
  member?: MemberDto;
}

export class RefreshTokenResponseDto {
  accessToken: string;
}
