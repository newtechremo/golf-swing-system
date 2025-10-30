export class SwingAnalysisRequestResponseDto {
  analysisId: number;
  uuid: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  swingType: 'full' | 'half';
  waitTime: number;
  message: string;
}

export class SwingPhaseMetricsDto {
  frame: number;
  timestamp: number;
  metrics: Record<string, number>;
}

export class SwingPhasesDto {
  address?: SwingPhaseMetricsDto;
  takeback?: SwingPhaseMetricsDto;
  backswing?: SwingPhaseMetricsDto;
  top?: SwingPhaseMetricsDto;
  downswing?: SwingPhaseMetricsDto;
  impact?: SwingPhaseMetricsDto;
  followthrough?: SwingPhaseMetricsDto;
  finish?: SwingPhaseMetricsDto;
}

export class VideoMetadataDto {
  totalFrames: number;
  fps: number;
  duration: number;
}

export class AngleDataDto {
  kneeLine: number[][];
  pelvis: number[][];
  shoulderLine: number[][];
}

export class SwingAnalysisDto {
  id: number;
  uuid: string;
  memberId: number;
  memberName: string;
  analysisDate: string;
  swingType: 'full' | 'half';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl: string;
  memo?: string;
  createdAt: Date;
}

export class SwingAnalysisResultDto {
  analysis: SwingAnalysisDto;
  swingPhases: SwingPhasesDto;
  angleData: AngleDataDto;
  videoMetadata: VideoMetadataDto;
}

export class SwingAnalysisProcessingDto {
  analysisId: number;
  status: 'processing';
  progress: number;
  message: string;
}

export class UpdateSwingMemoDto {
  memo: string;
}

export class SwingMemoResponseDto {
  analysisId: number;
  memo: string;
  updatedAt: Date;
}
