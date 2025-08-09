import { CopypartyClient } from './api'

// Centralized API client initialization
const basePath =
  typeof import.meta.env.VITE_API_BASE_PATH === 'string'
    ? (import.meta.env.VITE_API_BASE_PATH as string)
    : import.meta.env.DEV
    ? '/api'
    : '/'

export const client = new CopypartyClient(basePath)


