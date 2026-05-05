'use client'

import '@/styles/design.css'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, X } from 'lucide-react'
import { LISTED_CATEGORIES, CATEGORY_LABEL } from '@/modules/marketplace/types'
import Loader from '@/components/common/Loader/Loader'
import Input from '@/components/common/Input/Input'
import BackButton from '@/components/common/BackButton/BackButton'
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
}

export default function RequestProductView({
  register,
  errors,
  images,
  onDrop,
  onRemoveImage,
  isPending,
  isUploading = false,
  onSubmit,
}: RequestProductViewProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 5,
    disabled: images.length >= 5 || isUploading,
  })

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

          <Input
            label="Product Name"
            type="text"
            placeholder="What are you looking for?"
            error={errors.name?.message}
            {...register('name')}
          />

          <div>
            <label className={styles.fieldLabel}>Category</label>
            <select className={styles.select} {...register('category')}>
              {LISTED_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </div>

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

          <label className={styles.checkboxLabel}>
            <input type="checkbox" className={styles.checkbox} {...register('isNegotiable')} />
            Open to Negotiation
          </label>

          <Input
            label="Description"
            type="text"
            placeholder="Specific requirements, condition preferences, urgency..."
            error={errors.description?.message}
            {...register('description')}
          />

          {/* Dropzone */}
          <div>
            <label className={styles.fieldLabel}>Images (min 1, max 5)</label>
            <div
              {...getRootProps()}
              className={[
                styles.dropzone,
                isDragActive ? styles['dropzone--active'] : '',
                images.length >= 5 ? styles['dropzone--disabled'] : '',
              ].join(' ')}
            >
              <input {...getInputProps()} />
              <UploadCloud size={28} color="#2a14b4" className={styles.dropzoneIcon} />
              <div className={styles.dropzoneTitle}>{isDragActive ? 'Drop here' : 'Drag & drop or click to browse'}</div>
              <div className={styles.dropzoneCount}>{images.length}/5 uploaded</div>
            </div>
            {images.length > 0 && (
              <div className={styles.previewList}>
                {images.map((img, i) => (
                  <div key={img.preview} className={styles.previewItem}>
                    <img src={img.preview} alt="" className={styles.previewImg} />
                    <button onClick={() => onRemoveImage(i)} type="button" className={styles.previewRemove}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {images.length === 0 && <p className={styles.imageRequired}>⚠ At least 1 image is required.</p>}
          </div>

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
