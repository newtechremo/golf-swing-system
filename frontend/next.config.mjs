/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  logging: false,
  devIndicators: false,
  allowedDevOrigins: [
    'remo-data-bridge.remo.re.kr',
    'remobodys.remo.re.kr',
    '49.169.8.19',
    '192.168.219.44',
    'golf.remo.re.kr',
  ],
  // ⚠️ 로컬 개발 전용.
  // 프로덕션(Vercel)에서 이 경로를 타면 요청이 Vercel 엣지를 경유해
  // 함수 타임아웃/바디제한에 걸린다. destination 이 localhost:3003 이라 어차피 동작하지 않는다.
  // 프로덕션은 NEXT_PUBLIC_API_BASE_URL 절대 URL 로 백엔드를 직접 호출한다.
  async rewrites() {
    return [
      {
        source: '/backend-api/:path*',
        destination: 'http://localhost:3003/api/:path*',
      },
    ]
  },
}

export default nextConfig
