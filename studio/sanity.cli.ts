import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'q198rjlt',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  studioHost: 'jojx',
  deployment: {appId: 'p5ikcv035hdkm0xzas42tbjr'},
})
