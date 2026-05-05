import Link from 'next/link'
import FallbackImage from '@/components/common/FallbackImage/FallbackImage'
import { ShoppingBag, Tag, Eye } from 'lucide-react'
import { CATEGORY_BG, CATEGORY_TEXT, formatPrice } from '@/utils/globalStaticData'
import { CATEGORY_LABEL, type ListedProductCategory } from '@/modules/marketplace/types'
import type { ListedProduct } from '@/modules/marketplace/types'
import Button from '@/components/common/Button/Button'
import styles from './MarketplaceView.module.css'

export interface ListedProductCardProps {
  item: ListedProduct
  /** 'main' = full marketplace grid card, 'compact' = landing page card */
  variant?: 'main' | 'compact'
}

export default function ListedProductCard({ item, variant = 'main' }: ListedProductCardProps) {
  const categoryLabel = (CATEGORY_LABEL[item.category as ListedProductCategory] ?? item.category).toUpperCase()

  if (variant === 'compact') {
    return (
      <Link href={`/marketplace/${item._id}`} className={styles.mpCardLink}>
        <div className="mp-card">
          <div className={`mp-card-img ${styles.mpCardImgLight}`}>
            {item.images[0]
              ? <FallbackImage src={item.images[0]} alt={item.productName} fill sizes="(max-width: 768px) 100vw, 300px" className={styles.mpCardImgCover} />
              : <ShoppingBag size={56} color="#3730d4" strokeWidth={1} />
            }
            <span className="mp-card-price">{formatPrice(item.price)}</span>
          </div>
          <div className="mp-card-body">
            <div className="mp-card-category">
              <span className={styles.catBadgeBlue}>
                {item.category.toUpperCase()}
              </span>
              <span className={styles.conditionText}>{item.condition}</span>
            </div>
            <div className="mp-card-title">{item.productName}</div>
            <div className="mp-card-seller">
              <div className={styles.mpNegotiable}>
                <Tag size={12} />{item.isNegotiable ? 'Negotiable' : 'Fixed price'}
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={<Eye size={12} />}
                iconPosition="left"
                aria-label="View details"
              >
                View Details
              </Button>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link href={`/marketplace/${item._id}`} className={styles.mpCardLink}>
      <div className="mp-card">
        <div
          className={`mp-card-img ${styles.mpCardImgWrap} ${styles.mpCardImgDynamic}`}
          style={{ '--cat-bg': CATEGORY_BG[item.category] ?? '#f0f4ff' } as React.CSSProperties}
        >
          <FallbackImage src={item.images[0]} alt={item.productName} fill sizes="(max-width: 768px) 100vw, 300px" className={styles.mpCardImgCover} />
          <span className="mp-card-price">{formatPrice(item.price)}</span>
        </div>
        <div className="mp-card-body">
          <div className="mp-card-category">
            <span
              className={styles.catBadgeDynamic}
              style={{ '--cat-bg': CATEGORY_BG[item.category] ?? '#e5e7eb', '--cat-text': CATEGORY_TEXT[item.category] ?? '#374151' } as React.CSSProperties}
            >
              {categoryLabel}
            </span>
            <span className="mp-card-time">{item.condition}</span>
          </div>
          <div className="mp-card-title">{item.productName}</div>
          <div className="mp-card-seller">
            <div className="mp-seller-info">
              <div className="mp-seller-avatar">{item.user?.[0]?.toUpperCase() ?? 'U'}</div>
              <div>
                <div className="mp-seller-name">{item.isNegotiable ? 'Negotiable' : 'Fixed price'}</div>
                <div className="mp-seller-year">{item.yearUsed} yr{item.yearUsed !== 1 ? 's' : ''} used</div>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Eye size={12} />}
              iconPosition="left"
              aria-label="View details"
            >
              View Details
            </Button>
          </div>
        </div>
      </div>
    </Link>
  )
}
