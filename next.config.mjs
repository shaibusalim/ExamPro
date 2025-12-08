/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,      // optional, but recommended
  appDir: true,               // move out of experimental
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
