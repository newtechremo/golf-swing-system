import type { Response } from 'express';

/**
 * PDF 다운로드 응답 헤더를 세운다.
 *
 * 파일명에 한글이 들어가므로 Content-Disposition 을 두 벌로 쓴다.
 * - filename="..."  : ASCII 로 눌러 쓴 대체값. 구형 클라이언트가 읽는다.
 * - filename*=UTF-8'': RFC 5987 인코딩. 현대 브라우저는 이쪽을 우선한다.
 * 한글을 filename= 에 그대로 넣으면 헤더 인코딩 규칙 위반이라 이름이 깨진다.
 */
export function setPdfDownloadHeaders(
  res: Response,
  filename: string,
  contentLength: number,
): void {
  // 경로 구분자와 따옴표는 파일명에서 제거한다. 헤더가 쪼개지는 것을 막는다.
  const safe = filename.replace(/[\\/"\r\n]/g, '_');
  const asciiFallback = safe.replace(/[^\x20-\x7E]/g, '_');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', contentLength);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(safe)}`,
  );
}
