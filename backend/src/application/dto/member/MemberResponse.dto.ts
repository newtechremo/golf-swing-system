export class MemberResponseDto {
  id: number;
  phoneNumber: string;
  name: string;
  birthDate?: Date;
  gender?: 'M' | 'F' | 'Other';
  height?: number;
  weight?: number;
  email?: string;
  status: 'active' | 'inactive' | 'deleted';
  instructorId: number;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export class MemberListItemDto {
  id: number;
  phoneNumber: string;
  name: string;
  birthDate?: Date;
  gender?: 'M' | 'F' | 'Other';
  height?: number;
  weight?: number;
  status: 'active' | 'inactive' | 'deleted';
  lastLoginAt?: Date;
  createdAt: Date;
  analysisCount: {
    golfSwing: number;
    posture: number;
  };
}

export class MemberDetailDto extends MemberResponseDto {
  recentAnalyses: {
    golfSwing: Array<{
      id: number;
      date: string;
      swingType: 'full' | 'half';
      status: string;
    }>;
    posture: Array<{
      id: number;
      date: string;
      status: string;
    }>;
  };
}

export class GetMembersQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'deleted';
}
