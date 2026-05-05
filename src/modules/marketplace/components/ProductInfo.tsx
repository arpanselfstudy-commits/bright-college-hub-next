'use client'

import { MessageCircle, CheckCircle, Clock } from 'lucide-react'
import { CATEGORY_LABEL, type ListedProductCategory } from '@/modules/marketplace/types'
import type { ListedProduct } from '@/modules/marketplace/types'
import styles from './ProductDetailView.module.css'
import { formatPrice } from '@/utils/globalStaticData'

interface ProductInfoProps {
  product: ListedProduct
  onShowContact: () => void
}

export default function ProductInfo({ product, onShowContact }: ProductInfoProps) {
  return (
    <div className="product-info">
      <div className="product-badges">
        <span className={styles.catBadgeBlue}>
          {CATEGORY_LABEL[product.category as ListedProductCategory] ?? product.category}
        </span>
        <span
          className={product.isAvailable ? styles.availBadgeAvailable : styles.availBadgeSold}
        >
          {product.isAvailable ? 'Available' : 'Sold'}
        </span>
      </div>

      <h1 className="product-title">{product.productName}</h1>

      <div className="product-price-row">
        <span className="product-price">{formatPrice(product.price)}</span>
        {product.isNegotiable && (
          <span className={styles.negotiable}>
            <CheckCircle size={14} /> Negotiable
          </span>
        )}
      </div>

      <div className="product-meta-card">
        <div>
          <div className="product-meta-label">Condition</div>
          <div className="product-meta-value">
            <span className="condition-badge">{product.condition}</span>
          </div>
        </div>
        <div>
          <div className="product-meta-label">Years Used</div>
          <div className={`product-meta-value ${styles.yearUsed}`}>
            <Clock size={13} /> {product.yearUsed} {product.yearUsed === 1 ? 'year' : 'years'}
          </div>
        </div>
      </div>

      <div className="product-desc-label">Description</div>
      <p className="product-desc">{product.description}</p>

      <div className="product-cta-stack">
        <button
          className="btn btn-primary"
          onClick={onShowContact}
          disabled={!product.isAvailable}
        >
          <MessageCircle size={16} /> Contact Seller
        </button>
      </div>
    </div>
  )
}
