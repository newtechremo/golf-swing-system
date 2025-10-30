import { IsEnum, IsString, IsNotEmpty } from 'class-validator';

export class UploadSwingVideoDto {
  @IsEnum(['full', 'half'])
  swingType: 'full' | 'half';

  @IsString()
  @IsNotEmpty()
  height: string; // cm, string으로 전달

  // video 파일은 multer에서 처리
}
