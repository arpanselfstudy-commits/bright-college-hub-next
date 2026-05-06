'use client'

import { useState } from 'react'
import { UseFormSetValue, UseFormWatch } from 'react-hook-form'
import toast from 'react-hot-toast'
import { aiApi } from '@/modules/user/api/user.api'
import type { ListProductForm } from '@/modules/user/types'

export interface UseGenerateDescriptionOptions {
  setValue: UseFormSetValue<ListProductForm>
  watch: UseFormWatch<ListProductForm>
  isAiEnabled: boolean
}

export interface UseGenerateDescriptionReturn {
  generate: () => Promise<void>
  isGenerating: boolean
  canGenerate: boolean
  rateLimitedUntil: number | null
}

export function useGenerateDescription({
  setValue,
  watch,
  isAiEnabled,
}: UseGenerateDescriptionOptions): UseGenerateDescriptionReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null)

  // Watch the five context fields
  const productName = watch('productName')
  const category = watch('category')
  const price = watch('price')
  const condition = watch('condition')
  const yearUsed = watch('yearUsed')

  // canGenerate: all five fields must be non-empty/valid and not rate-limited
  const canGenerate =
    isAiEnabled &&
    Boolean(productName?.trim()) &&
    Boolean(category) &&
    Boolean(price?.trim()) &&
    Boolean(condition) &&
    yearUsed >= 0 &&
    (rateLimitedUntil === null || Date.now() > rateLimitedUntil)

  const generate = async () => {
    if (!canGenerate) return

    setIsGenerating(true)
    try {
      const response = await aiApi.generateDescription({
        productName: productName.trim(),
        category,
        price: price.trim(),
        condition,
        yearUsed,
      })

      const description = response.data?.data?.description
      if (description) {
        setValue('description', description, { shouldDirty: true })
      }
    } catch (error: unknown) {
      // Parse rate limit error
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } }
        const status = axiosError.response?.status
        const message =
          axiosError.response?.data?.message ?? 'Failed to generate description. Please try again.'

        if (status === 429) {
          // Try to parse reset time from message: "...after 2024-01-01T12:00:00.000Z."
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
