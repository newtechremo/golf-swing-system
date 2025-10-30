export class PostureAnalysisRequestResponseDto {
  analysisId: number;
  status: 'completed';
  message: string;
  results: {
    front: { status: string; uuid: string };
    side: { status: string; uuid: string };
    back: { status: string; uuid: string };
  };
}

export class PostureMetricDto {
  value: number;
  grade: number;
  status: string; // '정상', '주의', '위험'
}

export class FrontPostureMetricsDto {
  headBalance: PostureMetricDto;
  pelvicBalance: PostureMetricDto;
  shoulderBalance: PostureMetricDto;
  kneeBalance: PostureMetricDto;
  bodyTilt: PostureMetricDto;
  leftLegQAngle: PostureMetricDto;
  rightLegQAngle: PostureMetricDto;
}

export class SidePostureMetricsDto {
  roundShoulder: PostureMetricDto;
  turtleNeck: PostureMetricDto;
  headTilt: PostureMetricDto;
  bodyTilt: PostureMetricDto;
}

export class BackPostureMetricsDto {
  headBalance: PostureMetricDto;
  pelvicBalance: PostureMetricDto;
  shoulderBalance: PostureMetricDto;
  kneeBalance: PostureMetricDto;
  bodyTilt: PostureMetricDto;
  leftLegQAngle: PostureMetricDto;
  rightLegQAngle: PostureMetricDto;
}

export class PostureResultDto {
  status: string;
  resultImageUrl: string;
  metrics:
    | FrontPostureMetricsDto
    | SidePostureMetricsDto
    | BackPostureMetricsDto;
}

export class PostureAnalysisDto {
  id: number;
  memberId: number;
  memberName: string;
  analysisDate: string;
  status: 'completed';
  memo?: string;
  createdAt: Date;
}

export class PostureAnalysisResultDto {
  analysis: PostureAnalysisDto;
  front: PostureResultDto;
  side: PostureResultDto;
  back: PostureResultDto;
  gradeExplanation: {
    '-2': string;
    '-1': string;
    '0': string;
    '1': string;
    '2': string;
  };
}

export class UpdatePostureMemoDto {
  memo: string;
}

export class PostureMemoResponseDto {
  analysisId: number;
  memo: string;
  updatedAt: Date;
}
