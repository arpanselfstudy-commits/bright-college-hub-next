import Link from 'next/link'
import FallbackImage from '@/components/common/FallbackImage/FallbackImage'
import { Tag, Eye } from 'lucide-react'
import { CATEGORY_LABEL, type ListedProductCategory } from '@/modules/marketplace/types'
import type { RequestedProduct } from '@/modules/marketplace/types'
import Button from '@/components/common/Button/Button'
import styles from './MarketplaceView.module.css'

export interface RequestedProductCardProps {
  item: RequestedProduct
  /** 'main' = full marketplace grid card, 'compact' = landing page card */
  variant?: 'main' | 'compact'
}

export default function RequestedProductCard({ item, variant = 'main' }: RequestedProductCardProps) {
  const categoryLabel = (CATEGORY_LABEL[item.category as ListedProductCategory] ?? (item.category || 'REQUEST')).toUpperCase()

  if (variant === 'compact') {
    return (
      <Link href={`/marketplace/request/${item._id}`} className={styles.mpCardLink}>
        <div className="mp-card">
          <div className={`mp-card-img ${styles.mpCardImgBg}`}>
            {item.images[0]
              ? <FallbackImage src={item.images[0]} alt={item.name} fill sizes="(max-width: 768px) 100vw, 300px" className={styles.mpCardImgCoverDim} />
              : <Eye size={56} color="white" strokeWidth={1} />
            }
            <span className="mp-card-price">${item.price.from}–${item.price.to}</span>
          </div>
          <div className="mp-card-body">
            <div className="mp-card-category">
              <span className={styles.catBadgeRequest}>
                {categoryLabel}
              </span>
              {item.isFulfilled && <span className={styles.fulfilledBadge}>Fulfilled</span>}
            </div>
            <div className="mp-card-title">{item.name}</div>
            <div className="mp-card-seller">
              <div className={styles.mpNegotiable}>
                <Tag size={12} />{item.isNegotiable ? 'Negotiable' : 'Fixed'}
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
    <Link href={`/marketplace/request/${item._id}`} className={styles.mpCardLink}>
      <div className="mp-card">
        <div className={`mp-card-img ${styles.mpCardImgWrap} ${styles.mpCardImgBg}`}>
          <FallbackImage src={item.images[0]} alt={item.name} fill sizes="(max-width: 768px) 100vw, 300px" className={styles.mpCardImgDim} />
          <span className="mp-card-price">${item.price.from}–${item.price.to}</span>
        </div>
        <div className="mp-card-body">
          <div className="mp-card-category">
            <span className={styles.catBadgeRequest}>
              {categoryLabel}
            </span>
            {item.isFulfilled && <span className={styles.fulfilledBadge}>Fulfilled</span>}
          </div>
          <div className="mp-card-title">{item.name}</div>
          <div className="mp-card-seller">
            <div className="mp-seller-info">
              <div className="mp-seller-avatar">{item.user?.[0]?.toUpperCase() ?? 'U'}</div>
              <div><div className="mp-seller-name">{item.isNegotiable ? 'Negotiable' : 'Fixed'}</div></div>
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
