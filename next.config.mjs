/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['studio', 'ai-agent', 'workflow-builder'],
  async redirects() {
    return [
      // Root landing → Dashboard IVAMIND (pas /studio legacy par défaut).
      { source: '/', destination: '/ivamind/dashboard', permanent: false },
      // /studio racine → Dashboard (évite fallback Muapi si user tape /studio nu).
      { source: '/studio', destination: '/ivamind/dashboard', permanent: false },
      // Byok-settings legacy → nouvelle page settings IVAMIND.
      { source: '/studio/byok-settings', destination: '/ivamind/settings', permanent: false },
      // NOTE : /studio/image, /studio/video, /studio/cinema, /studio/lipsync, /studio/marketing
      // restent accessibles directement — ce sont les vrais studios sandbox patchés BYOK.
    ];
  },
};

export default nextConfig;
