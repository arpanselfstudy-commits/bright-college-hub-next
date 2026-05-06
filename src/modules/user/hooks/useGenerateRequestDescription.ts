'use client'

import { useState } from 'react'
import { UseFormSetValue, UseFormWatch } from 'react-hook-form'
import toast from 'react-hot-toast'
import { aiApi } from '@/modules/user/api/user.api'
import type { RequestProductForm } from '@/modules/user/types'

export interface UseGenerateRequestDescriptionOptions {
  setValue: UseFormSetValue<RequestProductForm>
  watch: UseFormWatch<RequestProductForm>
  isAiEnabled: boolean
}

export interface UseGenerateRequestDescriptionReturn {
  generate: () => Promise<void>
  isGenerating: boolean
  canGenerate: boolean
  rateLimitedUntil: number | null
}

export function useGenerateRequestDescription({
  setValue,
  watch,
  isAiEnabled,
}: UseGenerateRequestDescriptionOptions): UseGenerateRequestDescriptionReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null)

  const name      = watch('name')
  const category  = watch('category')
  const priceFrom = watch('priceFrom')
  const priceTo   = watch('priceTo')

  const canGenerate =
    isAiEnabled &&
    Boolean(name?.trim()) &&
    Boolean(category) &&
    priceFrom >= 0 &&
    priceTo > 0 &&
    (rateLimitedUntil === null || Date.now() > rateLimitedUntil)

  const generate = async () => {
    if (!canGenerate) return

    setIsGenerating(true)
    try {
      const response = await aiApi.generateRequestDescription({
        name: name.trim(),
        category,
        priceFrom,
        priceTo,
      })

      const description = response.data?.data?.description
      if (description) {
        setValue('description', description, { shouldDirty: true })
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } }
        const status = axiosError.response?.status
        const message =
          axiosError.response?.data?.message ?? 'Failed to generate description. Please try again.'

        if (status === 429) {
          const isoMatch = message.match(/(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/)
          if (isoMatch) {
            setRateLimitedUntil(new Date(isoMatch[1]).getTime())
          }
          toast.error(message)
        } else {
          toast.error(message)
        }
      } else {
        toast.error('Could not reach the server. Please try again.')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  return { generate, isGenerating, canGenerate, rateLimitedUntil }
}
