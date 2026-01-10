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
    '49.168.236.221',
    '192.168.0.244',
    'golf.remo.re.kr',
  ],
  // 로컬 개발용: /backend-api 요청을 백엔드로 프록시
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
