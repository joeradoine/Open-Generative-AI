/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['studio', 'ai-agent', 'workflow-builder'],
  async redirects() {
    return [
      // IVAMIND : bloque tout atterrissage accidentel sur le legacy Open-Gen-AI (Muapi 403).
      { source: '/', destination: '/ivamind/dashboard', permanent: false },
      { source: '/studio', destination: '/ivamind/dashboard', permanent: false },
      { source: '/studio/image', destination: '/ivamind/generate', permanent: false },
      { source: '/studio/video', destination: '/ivamind/generate', permanent: false },
      { source: '/studio/byok-settings', destination: '/ivamind/settings', permanent: false },
    ];
  },
};

export default nextConfig;
