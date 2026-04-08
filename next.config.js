/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1'],
  // Expose deployment host to the client so magic-link emailRedirectTo uses https://*.vercel.app
  // when NEXT_PUBLIC_APP_URL is not set (avoids localhost after email login on Vercel).
  env: {
    ...(process.env.VERCEL_URL
      ? { NEXT_PUBLIC_VERCEL_URL: process.env.VERCEL_URL }
      : {}),
  },
};

module.exports = nextConfig;
