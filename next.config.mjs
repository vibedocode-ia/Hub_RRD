/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['@napi-rs/canvas', 'pdfjs-dist'],
  outputFileTracingIncludes: { '/api/**/*': ['./src/lib/assets/*', './node_modules/pdfjs-dist/standard_fonts/**/*', './node_modules/pdfjs-dist/cmaps/**/*', './node_modules/pdfjs-dist/wasm/**/*'] },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'" },
    ] }];
  },
};
export default nextConfig;
