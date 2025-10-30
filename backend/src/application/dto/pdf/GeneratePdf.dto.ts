export class GenerateGolfSwingPdfDto {
  includeVideo?: boolean;
  includeAngleData?: boolean;
  language?: 'ko' | 'en';
}

export class GeneratePosturePdfDto {
  includeImages?: boolean;
  language?: 'ko' | 'en';
}

export class PdfResponseDto {
  pdfUrl: string;
  expiresAt: Date;
  fileSize: number;
  downloadUrl: string;
}
