import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || '29k7vl30',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  studioHost: 'sergeyphilippov',
  vite: (config) => {
    return {
      ...config,
      envDir: '..',
      server: {
        ...config.server,
        host: true,
        allowedHosts: true,
      },
    }
  },
})
