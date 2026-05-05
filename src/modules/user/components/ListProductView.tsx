'use client'

import '@/styles/design.css'
import { Lightbulb, ShieldCheck } from 'lucide-react'
import Loader from '@/components/common/Loader/Loader'
import Input from '@/components/common/Input/Input'
import { FormError } from '@/components/common'
import BackButton from '@/components/common/BackButton/BackButton'
import dynamic from 'next/dynamic'
const ImageUploader = dynamic(() => import('@/components/common/ImageUploader/ImageUploader'), { ssr: false, loading: () => null })
import {
  LISTED_CATEGORIES, LISTED_CONDITIONS,
  CATEGORY_LABEL,
  type ListedProductCategory,
  type ListedProductCondition,
} from '@/modules/marketplace/types'
import type { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form'
import type { ListProductForm } from '@/modules/user/types'
import styles from './ListProductView.module.css'

export interface ListProductViewProps {
  register: UseFormRegister<ListProductForm>
  errors: FieldErrors<ListProductForm>
  watch: UseFormWatch<ListProductForm>
  setValue: UseFormSetValue<ListProductForm>
  images: { file: File; preview: string }[]
  onDrop: (files: File[]) => void
  onRemoveImage: (i: number) => void
  isPending: boolean
  isUploading?: boolean
  onSubmit: (e?: React.BaseSyntheticEvent) => void
}

export default function ListProductView({
  register,
  errors,
  watch,
  setValue,
  images,
  onDrop,
  onRemoveImage,
  isPending,
  isUploading = false,
  onSubmit,
}: ListProductViewProps) {
  const condition = watch('condition')

  return (
    <div className={styles.wrapper}>
      <div className={styles.backWrap}>
        <BackButton href="/account/my-profile" label="Back to Profile" />
      </div>
      <h1 className={styles.heading}>Market Your Craft</h1>
      <p className={styles.subText}>Turn your essentials into value. List your product in the Bright College Hub marketplace.</p>

      <div className={styles.layout}>

        {/* Form */}
        <div className={styles.formPanel}>
          <form onSubmit={onSubmit} className={styles.form}>

            <div>
              <Input label="Product Name" type="text" placeholder="e.g. Advanced Calculus Textbook" {...register('productName')} />
              <FormError message={errors.productName?.message} />
            </div>

            <div className={styles.twoCol}>
              <div>
                <label className={styles.fieldLabel}>Category</label>
                <select className={styles.select} {...register('category')}>
                  {LISTED_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                </select>
                <FormError message={errors.category?.message} />
              </div>
              <div>
                <Input label="Price ($)" type="number" min={0} step="0.01" placeholder="0.00" {...register('price')} />
                <FormError message={errors.price?.message} />
              </div>
            </div>

            <div>
              <label className={styles.fieldLabel}>Description</label>
              <textarea
                className={styles.textarea}
                placeholder="Condition, features, why it's a great find..."
                {...register('description')}
              />
              <FormError message={errors.description?.message} />
            </div>

            <div className={styles.twoCol}>
              <div>
                <label className={styles.fieldLabel}>Condition</label>
                <div className={styles.conditionBtns}>
                  {LISTED_CONDITIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setValue('condition', c as ListedProductCondition)}
                      className={`${styles.conditionBtn} ${condition === c ? styles['conditionBtn--active'] : ''}`}
                    >
                      {c === 'NEW' ? 'New' : c === 'USED' ? 'Used' : 'Refurb'}
                    </button>
                  ))}
                </div>
                <FormError message={errors.condition?.message} />
              </div>
              <div>
                <Input label="Years Used" type="number" min={0} {...register('yearUsed', { valueAsNumber: true })} />
              </div>
            </div>

            <label className={styles.checkboxLabel}>
              <input type="checkbox" className={styles.checkbox} {...register('isNegotiable')} />
              Open to Negotiation
            </label>

            <div className={styles.contactSection}>
              <div className={styles.contactTitle}>Contact Details</div>
              <div className={styles.twoCol}>
                <div>
                  <Input label="Phone Number" type="tel" placeholder="+1 (555) 000-0000" {...register('phoneNo')} />
                  <FormError message={errors.phoneNo?.message} />
                </div>
                <div>
                  <Input label="Email Address" type="email" placeholder="student@university.edu" {...register('email')} />
                  <FormError message={errors.email?.message} />
                </div>
              </div>
            </div>

            {/* Image uploader — inside form, above submit button */}
            <div>
              <ImageUploader
                label="Product Images (min 1, max 5)"
                hint="PNG, JPG, WEBP up to 10MB"
                maxSizeMb={10}
                onFileSelect={(file) => onDrop([file])}
                onRemove={() => onRemoveImage(0)}
                previewUrl={images[0]?.preview}
                isUploading={isUploading}
              />
              {images.length > 1 && (
                <div className={styles.extraImages}>
                  {images.slice(1).map((img, i) => (
                    <div key={img.preview} className={styles.extraImageItem}>
                      <img src={img.preview} alt="" className={styles.extraImageImg} />
                      <button onClick={() => onRemoveImage(i + 1)} type="button" className={styles.extraImageRemove}>×</button>
                    </div>
                  ))}
                </div>
              )}
              {images.length === 0 && (
                <p className={styles.imageRequired}>⚠ At least 1 image is required.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending || isUploading || images.length === 0}
              className={styles.submitBtn}
            >
              {isUploading ? <><Loader size={20} /> Uploading…</> : isPending ? <><Loader size={20} /> Listing…</> : 'Add Product to Market'}
            </button>

          </form>
        </div>

        {/* Right sidebar — tip cards only, hidden on mobile */}
        <div className={styles.sidebar}>
          <div className={styles.tipCardOrange}>
            <Lightbulb size={18} color="#553300" className={styles.tipIcon} />
            <div>
              <div className={`${styles.tipTitle} ${styles.tipTitleOrange}`}>Quality matters</div>
              <div className={`${styles.tipText} ${styles.tipTextOrange}`}>Listings with clear photos sell 3× faster.</div>
            </div>
          </div>

          <div className={styles.tipCardTeal}>
            <ShieldCheck size={18} color="#006a61" className={styles.tipIcon} />
            <div>
              <div className={`${styles.tipTitle} ${styles.tipTitleTeal}`}>Stay Safe</div>
              <div className={`${styles.tipText} ${styles.tipTextTeal}`}>Always meet in public campus zones during daylight.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
