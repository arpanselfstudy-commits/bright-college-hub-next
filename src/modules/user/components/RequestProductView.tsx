'use client'

import '@/styles/design.css'
import { UploadCloud, X } from 'lucide-react'
import { LISTED_CATEGORIES, CATEGORY_LABEL } from '@/modules/marketplace/types'
import Loader from '@/components/common/Loader/Loader'
import Input from '@/components/common/Input/Input'
import BackButton from '@/components/common/BackButton/BackButton'
import dynamic from 'next/dynamic'
const ImageUploader = dynamic(() => import('@/components/common/ImageUploader/ImageUploader'), { ssr: false, loading: () => null })
import type { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form'
import type { RequestProductForm } from '@/modules/user/types'
import styles from './RequestProductView.module.css'

export interface RequestProductViewProps {
  register: UseFormRegister<RequestProductForm>
  errors: FieldErrors<RequestProductForm>
  watch: UseFormWatch<RequestProductForm>
  setValue: UseFormSetValue<RequestProductForm>
  images: { file: File; preview: string }[]
  onDrop: (files: File[]) => void
  onRemoveImage: (i: number) => void
  isPending: boolean
  isUploading?: boolean
  onSubmit: (e?: React.BaseSyntheticEvent) => void
  // AI generation props
  isGenerating: boolean
  canGenerate: boolean
  onGenerate: () => void
  isAiEnabled: boolean
  rateLimitedUntil: number | null
}

export default function RequestProductView({
  register,
  errors,
  watch,
  images,
  onDrop,
  onRemoveImage,
  isPending,
  isUploading = false,
  onSubmit,
  isGenerating,
  canGenerate,
  onGenerate,
  isAiEnabled,
  rateLimitedUntil,
}: RequestProductViewProps) {
  const descValue = watch('description') ?? ''
  const charCount = descValue.length
  const charCountClass =
    charCount === 500
      ? styles.charCounterError
      : charCount >= 450
        ? styles.charCounterWarn
        : styles.charCounter

  const isRateLimited = rateLimitedUntil !== null && Date.now() < rateLimitedUntil
  const generateDisabled = !isAiEnabled || !canGenerate || isGenerating || isRateLimited

  return (
    <div className={styles.wrapper}>

      {/* Left info panel — desktop/tablet only */}
      <div className={styles.infoPanel}>
        <div className={styles.backWrap}>
          <BackButton href="/account/my-profile" label="Back to Profile" />
        </div>
        <span className={styles.marketplaceBadge}>The Atelier Marketplace</span>
        <h1 className={styles.heading}>Sourcing for<br /><em className={styles.headingAccent}>Innovation.</em></h1>
        <p className={styles.subText}>Can&apos;t find what you need? Post a request and let the right product find you.</p>
        {[
          { title: 'Network Reach', sub: 'Broadcasted to 5,000+ active campus members instantly.' },
          { title: 'Secure Trading', sub: 'All responders are verified for safe transactions.' },
        ].map((c) => (
          <div key={c.title} className={styles.featureCard}>
            <div className={styles.featureCardTitle}>{c.title}</div>
            <div className={styles.featureCardSub}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Mobile header — back button + title, shown only on mobile */}
      <div className={styles.mobileHeader}>
        <div className={styles.backWrap}>
          <BackButton href="/account/my-profile" label="Back to Profile" />
        </div>
        <h1 className={styles.mobileHeading}>Source a Product</h1>
        <p className={styles.mobileSubText}>Can&apos;t find what you need? Post a request and let the right product find you.</p>
      </div>

      {/* Form */}
      <div className={styles.formPanel}>
        <form onSubmit={onSubmit} className={styles.form}>

          {/* 1. Product Name */}
          <Input
            label="Product Name"
            type="text"
            placeholder="What are you looking for?"
            error={errors.name?.message}
            {...register('name')}
          />

          {/* 2. Category */}
          <div>
            <label className={styles.fieldLabel}>Category</label>
            <select className={styles.select} {...register('category')}>
              {LISTED_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </div>

          {/* 3. Min Price + Max Price */}
          <div className={styles.priceGrid}>
            <Input
              label="Min Price ($)"
              type="number"
              placeholder="0"
              min={0}
              error={errors.priceFrom?.message}
              {...register('priceFrom', { valueAsNumber: true })}
            />
            <Input
              label="Max Price ($)"
              type="number"
              placeholder="1000"
              min={0}
              error={errors.priceTo?.message}
              {...register('priceTo', { valueAsNumber: true })}
            />
          </div>

          {/* 4. Description + Generate AI */}
          <div>
            <label className={styles.fieldLabel}>Description</label>
            <button
              type="button"
              className={styles.generateBtn}
              onClick={onGenerate}
              disabled={generateDisabled}
              title={!isAiEnabled ? 'AI not available' : undefined}
            >
              {isGenerating
                ? <><Loader size={16} /> Generating…</>
                : '✨ Generate using AI'}
            </button>
            <textarea
              className={styles.textarea}
              placeholder="Specific requirements, condition preferences, urgency..."
              maxLength={500}
              {...register('description')}
            />
            <span className={charCountClass}>{charCount} / 500 characters</span>
            {errors.description?.message && (
              <p className={styles.fieldError}>{errors.description.message}</p>
            )}
          </div>

          {/* 5. Images */}
          <div>
            <ImageUploader
              label="Product Image"
              hint="PNG, JPG, WEBP up to 10MB"
              maxSizeMb={10}
              onFileSelect={(file) => onDrop([file])}
              onRemove={() => onRemoveImage(0)}
              previewUrl={images[0]?.preview}
              isUploading={isUploading}
            />
            {images.length === 0 && <p className={styles.imageRequired}>⚠ At least 1 image is required.</p>}
          </div>

          {/* 6. Contact Details */}
          <div className={styles.contactSection}>
            <h3 className={styles.contactTitle}>Contact Details</h3>
            <div className={styles.contactGrid}>
              <Input
                label="Phone Number"
                type="tel"
                placeholder="+1 (555) 000-0000"
                error={errors.phoneNo?.message}
                {...register('phoneNo')}
              />
              <Input
                label="Email"
                type="email"
                placeholder="name@campus.edu"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>
          </div>

          {/* 7. Open to Negotiation */}
          <label className={styles.checkboxLabel}>
            <input type="checkbox" className={styles.checkbox} {...register('isNegotiable')} />
            Open to Negotiation
          </label>

          {/* 8. Submit */}
          <button
            type="submit"
            disabled={isPending || isUploading || images.length === 0}
            className={styles.submitBtn}
          >
            {isUploading ? <><Loader size={20} /> Uploading…</> : isPending ? <><Loader size={20} /> Posting…</> : 'Request Product'}
          </button>

        </form>
      </div>
    </div>
  )
}
