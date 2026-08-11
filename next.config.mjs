const basePath = process.env.APP_BASE_PATH || '/geriatric-lung-cancer-care';
const nextConfig = {
  basePath,
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
};
export default nextConfig;
