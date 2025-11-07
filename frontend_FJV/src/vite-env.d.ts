/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_FRONTEND_URL: string
  readonly VITE_PRODUCTION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
