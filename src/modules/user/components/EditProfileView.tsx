'use client'

import '@/styles/design.css'
import Link from 'next/link'
import BackButton from '@/components/common/BackButton/BackButton'
import { Mail, Phone, User, Loader2 } from 'lucide-react'
import Input from '@/components/common/Input/Input'
import dynamic from 'next/dynamic'
const ImageUploader = dynamic(() => import('@/components/common/ImageUploader/ImageUploader'), { ssr: false, loading: () => null })
import type { AuthUser } from '@/modules/auth/types'
import type { UseFormRegister, FieldErrors } from 'react-hook-form'
import type { EditProfileForm } from '@/modules/user/types'
import styles from './EditProfileView.module.css'

export interface EditProfileViewProps {
  user: AuthUser | null
  register: UseFormRegister<EditProfileForm>
  errors: FieldErrors<EditProfileForm>
  photoPreview: string
  onDrop: (files: File[]) => void
  onRemovePhoto: () => void
  isPending: boolean
  isUploading?: boolean
  onSubmit: (e?: React.BaseSyntheticEvent) => void
}

export default function EditProfileView({
  user,
  register,
  errors,
  photoPreview,
  onDrop,
  onRemovePhoto,
  isPending,
  isUploading,
  onSubmit,
}: EditProfileViewProps) {
  const avatar = photoPreview || user?.photo || ''

  return (
    <div className={styles.wrapper}>

      {/* Back */}
      <div className={styles.backRow}>
        <BackButton href="/account/my-profile" label="Back to Profile" />
        <div>
          <div className={styles.breadcrumb}>Account</div>
          <h1 className={styles.pageTitle}>Edit Profile</h1>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <div className={styles.formCard}>

          {/* Photo */}
          <ImageUploader
            variant="avatar"
            previewUrl={avatar}
            onFileSelect={(file) => onDrop([file])}
            onRemove={onRemovePhoto}
            hint="PNG, JPG or GIF"
            maxSizeMb={2}
            isUploading={isUploading}
          />

          {/* Name */}
          <Input
            label="Full Name"
            type="text"
            placeholder="Your full name"
            leftIcon={<User size={15} color="#9ca3af" />}
            error={errors.name?.message}
            {...register('name')}
          />

          {/* Email */}
          <Input
            label="Email Address"
            type="email"
            placeholder="name@campus.edu"
            leftIcon={<Mail size={15} color="#9ca3af" />}
            error={errors.email?.message}
            {...register('email')}
          />

          {/* Phone */}
          <Input
            label="Phone Number"
            type="tel"
            placeholder="+1 (555) 000-0000"
            leftIcon={<Phone size={15} color="#9ca3af" />}
            error={errors.phoneNumber?.message}
            {...register('phoneNumber')}
          />

          {/* Actions */}
          <div className={styles.formActions}>
            <Link href="/account/my-profile" className={styles.cancelBtn}>
              Cancel
            </Link>
            <button type="submit" disabled={isPending || isUploading} className={styles.submitBtn}>
              {(isPending || isUploading) ? <><Loader2 size={15} className={styles.spinIcon} /> Saving…</> : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>

      {/* Info cards */}
      <div className={styles.infoCards}>
        <div className={styles.verificationCard}>
          <div>
            <div className={styles.verificationTitle}>Verification Badge</div>
            <div className={styles.verificationSub}>Your account is verified for the School of Design.</div>
          </div>
          <span className={styles.verificationCheck}>✓</span>
        </div>
        <div className={styles.publicCard}>
          <div className={styles.publicCardIcon}>ℹ</div>
          <p className={styles.publicCardText}>Public profiles are visible to all students.</p>
        </div>
      </div>
    </div>
  )
}
