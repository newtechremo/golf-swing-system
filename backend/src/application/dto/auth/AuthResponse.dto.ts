/**
 * 강사 정보 DTO
 */
export class UserDto {
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
  centerId: number;
  centerName?: string;
}

/**
 * 로그인 응답 DTO
 */
export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserDto; // 강사 정보
}

/**
 * 토큰 갱신 응답 DTO
 */
export class RefreshTokenResponseDto {
  accessToken: string;
}
