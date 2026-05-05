'use client'

import '@/styles/design.css'
import FallbackImage from '@/components/common/FallbackImage/FallbackImage'
import BackButton from '@/components/common/BackButton/BackButton'
import { Pencil, Trash2, ShoppingBag, Loader2, Check, X, Package } from 'lucide-react'
import ConfirmModal from '@/components/common/Modal/ConfirmModal'
import { LISTED_CATEGORIES, LISTED_CONDITIONS, CATEGORY_LABEL, type ListedProductCondition } from '@/modules/marketplace/types'
import { PageLoader } from '@/components/common/Loader/Loader'
import Input from '@/components/common/Input/Input'
import { FormError } from '@/components/common'
import type { ListedProduct } from '@/modules/marketplace/types'
import styles from './account.module.css'
import type { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form'
import type { ManageListingForm } from '@/modules/user/types'
import { formatPrice } from '@/utils/globalStaticData'

function Toggle({ on, onChange, teal = false }: { on: boolean; onChange: (v: boolean) => void; teal?: boolean }) {
  return (
    <div onClick={() => onChange(!on)} className={`${styles.toggle} ${on ? styles['toggle--on'] : ''} ${teal ? styles['toggle--teal'] : ''}`}>
      <div className={styles.toggleDot} />
    </div>
  )
}

export interface ManageListingViewProps {
  product?: ListedProduct
  isLoading: boolean
  editing: boolean
  onToggleEditing: () => void
  register: UseFormRegister<ManageListingForm>
  errors: FieldErrors<ManageListingForm>
  watch: UseFormWatch<ManageListingForm>
  setValue: UseFormSetValue<ManageListingForm>
  onSave: (e?: React.BaseSyntheticEvent) => void
  onCancelEdit: () => void
  onToggleAvailable: (val: boolean) => void
  onDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  confirmDelete: boolean
  updating: boolean
  deleting: boolean
}


export default function ManageListingView({ product, isLoading, editing, onToggleEditing, register, errors, watch, setValue, onSave, onCancelEdit, onToggleAvailable, onDelete, onConfirmDelete, onCancelDelete, confirmDelete, updating, deleting }: ManageListingViewProps) {
  if (isLoading) return <div className={styles.page}><PageLoader /></div>
  if (!product) return (
    <div className={styles.page}>
      <div className={`${styles.emptyState} ${styles.emptyStateFlex}`}>
        <ShoppingBag size={48} color="#9ca3af" strokeWidth={1} />
        <p>Product not found. <BackButton href="/account/my-profile" label="Back to profile" /></p>
      </div>
    </div>
  )

  const condition = watch('condition')
  const isAvailable = watch('isAvailable')

  return (
    <div className={styles.page}>
      <div className={styles.contentWide}>
        <div className={styles.pageHeader}>
          <BackButton href="/account/my-profile" label="Back to Profile" />
          <div>
            <div className={styles.pageHeaderTag}>Inventory Management</div>
            <h1 className={styles.pageHeaderTitle}>Manage Listed Product</h1>
          </div>
        </div>

        <div className={styles.manageGrid}>
          <div className={styles.manageLeft}>
            <div className={`${styles.manageImgWrap} ${styles.manageImgWrapListing}`}>
              {product.images[0] && <FallbackImage src={product.images[0]} alt={product.productName} fill sizes="(max-width: 768px) 100vw, 500px" priority />}
              {!product.images[0] && <ShoppingBag size={80} color="rgba(255,255,255,0.2)" strokeWidth={1} />}
              <span className={styles.manageImgId}>{product._id?.slice(-8).toUpperCase()}</span>
            </div>
          </div>

          <div className={styles.manageRight}>
            <div className={styles.infoCard}>
              <div className={styles.infoCardTitle}>{product.productName}</div>
              <div className={styles.infoCardPriceRow}>
                <span className={styles.infoCardPrice}>{formatPrice(product.price)}</span>
                <span className={styles.infoCardBadgeCategory}>{product.category}</span>
                <span className={styles.infoCardBadgeCondition}>{product.condition}</span>
              </div>
              <p className={styles.infoCardDesc}>{product.description}</p>
              {product.isNegotiable && <p className={styles.infoCardNote}>✓ Open to negotiation</p>}
            </div>

            <div className={styles.togglesCard}>
              <div className={styles.toggleRow}>
                <div className={styles.toggleLeft}>
                  <div className={styles.toggleIcon}><Package size={18} color="#2a14b4" /></div>
                  <div><div className={styles.toggleTitle}>Available</div><div className={styles.toggleSub}>Show this listing publicly</div></div>
                </div>
                <Toggle on={isAvailable ?? false} onChange={onToggleAvailable} />
              </div>
            </div>

            {/* Actions row — hidden when editing */}
            {!editing && (
              <>
                <div className={styles.actionsRow}>
                  <button onClick={onToggleEditing} className={styles.editDetailsBtn}><Pencil size={15} /> Edit Details</button>
                  <button onClick={onDelete} disabled={deleting} className={styles.dangerBtn}>
                    {deleting ? <Loader2 size={16} className={styles.spin} /> : <Trash2 size={16} />}
                  </button>
                </div>

                <div className={styles.contactCard}>
                  <div className={styles.contactLabel}>Contact Details</div>
                  <div className={styles.contactLine}>{product.contactDetails.email}</div>
                  <div className={styles.contactLine}>{product.contactDetails.phoneNo}</div>
                </div>
              </>
            )}

            {/* Edit form — shown at bottom when editing */}
            {editing && (
              <div className={styles.editForm}>
                <h3 className={styles.editFormTitle}>Edit Details</h3>
                <div className={styles.editFormFields}>

                  <Input
                    label="Product Name"
                    error={errors.productName?.message}
                    {...register('productName')}
                  />

                  <div className={styles.editFormGrid2}>
                    <div>
                      <label className={styles.fieldLabel}>Category</label>
                      <select className={styles.fieldSelect} {...register('category')}>
                        {LISTED_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                      </select>
                      <FormError message={errors.category?.message} />
                    </div>
                    <Input
                      label="Price ($)"
                      type="number"
                      error={errors.price?.message}
                      {...register('price')}
                    />
                  </div>

                  <Input
                    label="Description"
                    error={errors.description?.message}
                    {...register('description')}
                  />

                  <div className={styles.editFormGrid2}>
                    <div>
                      <label className={styles.fieldLabel}>Condition</label>
                      <div className={styles.conditionBtns}>
                        {LISTED_CONDITIONS.map((c) => (
                          <button key={c} type="button" onClick={() => setValue('condition', c as ListedProductCondition)} className={`${styles.conditionBtn} ${condition === c ? styles['conditionBtn--active'] : styles['conditionBtn--inactive']}`}>
                            {c === 'NEW' ? 'New' : c === 'USED' ? 'Used' : 'Refurb'}
                          </button>
                        ))}
                      </div>
                      <FormError message={errors.condition?.message} />
                    </div>
                    <Input
                      label="Years Used"
                      type="number"
                      min={0}
                      {...register('yearUsed', { valueAsNumber: true })}
                    />
                  </div>

                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" className={styles.checkbox} {...register('isNegotiable')} />
                    Open to Negotiation
                  </label>

                  <div className={styles.editFormActions}>
                    <button onClick={onSave} disabled={updating} className={styles.saveBtn}>
                      {updating ? <Loader2 size={16} className={styles.spin} /> : <Check size={16} />} Save Changes
                    </button>
                    <button onClick={onCancelEdit} className={styles.cancelBtn}><X size={16} /></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div className="overlay">
          <ConfirmModal
            variant="danger"
            title="Delete listing?"
            description={`Are you sure you want to delete "${product?.productName}"? This action cannot be undone.`}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            loading={deleting}
            onConfirm={onConfirmDelete}
            onCancel={onCancelDelete}
          />
        </div>
      )}
    </div>
  )
}
