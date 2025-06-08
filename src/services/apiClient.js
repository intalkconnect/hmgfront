// src/apiClient.js
import axios from 'axios'

// URL base da sua API (ex: http://localhost:3000 ou a URL da API em produção)
const apiBaseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export const api = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json'
  }
})
