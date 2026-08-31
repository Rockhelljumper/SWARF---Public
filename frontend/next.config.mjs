const backendOrigin = process.env.BACKEND_ORIGIN || 'http://public-api:8080';

export default {
  output: 'standalone',
  turbopack: { root: import.meta.dirname },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backendOrigin}/api/:path*` }];
  }
};
