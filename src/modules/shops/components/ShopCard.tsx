import Link from 'next/link'
import FallbackImage from '@/components/common/FallbackImage/FallbackImage'
import { DAYS_OF_WEEK } from '@/utils/globalStaticData'
import type { Shop } from '@/modules/shops/types'
import styles from './ShopsView.module.css'

export interface ShopCardProps {
  shop: Shop
  /** 'main' = full grid card used on /shops page, 'compact' = image-overlay card used on landing */
  variant?: 'main' | 'compact'
}

export default function ShopCard({ shop, variant = 'main' }: ShopCardProps) {
  const id = shop._id ?? shop.shopId
  const todayKey = DAYS_OF_WEEK[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
  const isOpenToday = shop.shopTiming?.[todayKey]?.isOpen

  if (variant === 'compact') {
    const imgSrc = shop.photo || shop.photos?.[0]
    return (
      <div className={styles.shopCardCompact}>
        {imgSrc && (
          <FallbackImage
            src={imgSrc}
            alt={shop.name}
            fill
            sizes="(max-width: 768px) 100vw, 300px"
            className={styles.shopCardBg}
          />
        )}
        <div className={styles.shopCardOverlay} />
        <div className={styles.shopCardContent}>
          <div className={styles.shopName}>{shop.name}</div>
          <div className={styles.shopMeta}>{shop.type} • {shop.distance}</div>
          <Link href={`/shops/${id}`} className={styles.shopViewBtn}>View Shop</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="shop-card">
      <div className={`shop-card-img ${styles.shopCardMainImgWrap}`}>
        <FallbackImage
          src={shop.photo || shop.photos?.[0]}
          alt={shop.name}
          fill
          sizes="(max-width: 768px) 100vw, 300px"
          className={styles.shopImgBg}
        />
        <div className="shop-card-img-overlay" />
        <span className={isOpenToday ? styles.shopStatusBadgeOpen : styles.shopStatusBadgeClosed}>
          {isOpenToday ? '● Open' : '● Closed'}
        </span>
      </div>
      <div className="shop-card-body">
        <div className="shop-card-header-row">
          <div className="shop-card-name">{shop.name}</div>
          <div className="shop-card-dist">{shop.distance}</div>
        </div>
        <div className="shop-card-desc">{shop.type}</div>
        <div className="shop-card-actions">
          <Link href={`/shops/${id}`} className="btn btn-primary">View Shop</Link>
        </div>
      </div>
    </div>
  )
}
