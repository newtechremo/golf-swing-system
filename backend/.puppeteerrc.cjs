/**
 * puppeteer 설치 설정.
 *
 * 기본값대로 두면 npm ci 마다 크롬 300MB 를 새로 받는다.
 * 결과서(PDF)는 서버에 이미 깔린 크롬을 쓰므로 받을 필요가 없다.
 * 실행 파일 경로는 .env 의 PUPPETEER_EXECUTABLE_PATH 로 지정한다.
 *
 * 크롬이 없는 환경에 배포한다면 skipDownload 를 false 로 바꾸고
 * PUPPETEER_EXECUTABLE_PATH 도 비워야 번들 크롬을 쓴다.
 *
 * (.npmrc 의 puppeteer_skip_download 도 같은 효과지만 npm 이 deprecated 처리 중이다)
 */
module.exports = {
  skipDownload: true,
};
