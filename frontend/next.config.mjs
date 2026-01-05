/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
}

export default nextConfig
