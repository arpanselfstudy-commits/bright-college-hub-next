import { apiClient } from '@/lib/axios/axiosClient'

interface ApiResponse<T> { code: number; success: boolean; message: string; data: T }

export const userApi = {
  getAll: () => apiClient.get('/api/users'),
  getById: (id: string) => apiClient.get(`/api/users/${id}`),
}

export interface GenerateDescriptionPayload {
  productName: string
  category: string
  price: string
  condition: string
  yearUsed: number
}

export interface GenerateDescriptionResponse {
  description: string
}

export const aiApi = {
  generateDescription: (payload: GenerateDescriptionPayload) =>
    apiClient.post<ApiResponse<GenerateDescriptionResponse>>(
      '/api/ai/generate-description',
      payload,
      { timeout: 45_000 } // AI generation can take up to 30s on free tier
    ),
  generateRequestDescription: (payload: { name: string; category: string; priceFrom: number; priceTo: number }) =>
    apiClient.post<ApiResponse<GenerateDescriptionResponse>>(
      '/api/ai/generate-request-description',
      payload,
      { timeout: 45_000 }
    ),
}
