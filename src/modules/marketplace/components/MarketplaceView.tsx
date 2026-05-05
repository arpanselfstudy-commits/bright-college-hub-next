'use client'

import '@/styles/design.css'
import { ShoppingBag, MessageCircle, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { MarketplaceSkeletonGrid } from '@/components/common/Loader/SkeletonCard'
import SearchInput from '@/components/common/Search/Search'
import Pagination from '@/components/common/Pagination/Pagination'
import { CATEGORY_LABEL, type ListedProductCategory, type ListedProductCondition } from '@/modules/marketplace/types'
import type { ListedProduct, RequestedProduct } from '@/modules/marketplace/types'
import ListedFilter from './ListedFilter'
import RequestedFilter from './RequestedFilter'
import ListedProductCard from './ListedProductCard'
import RequestedProductCard from './RequestedProductCard'
import styles from './MarketplaceView.module.css'

export interface MarketplaceViewProps {
  tab: 'listed' | 'requested'
  onTabChange: (t: 'listed' | 'requested') => void
  listed: ListedProduct[]
  listedLoading: boolean
  requested: RequestedProduct[]
  requestedLoading: boolean
  search: string
  onSearchChange: (v: string) => void
  selectedCat: ListedProductCategory | ''
  onCatChange: (c: ListedProductCategory | '') => void
  selectedCondition: ListedProductCondition | ''
  onConditionChange: (c: ListedProductCondition) => void
  onClearCondition: () => void
  minPrice: string
  onMinPriceChange: (v: string) => void
  maxPrice: string
  onMaxPriceChange: (v: string) => void
  minYearUsed: number | ''
  onMinYearUsedChange: (v: number | '') => void
  maxYearUsed: number | ''
  onMaxYearUsedChange: (v: number | '') => void
  onClearListedFilters: () => void
  reqCat: ListedProductCategory | ''
  onReqCatChange: (c: ListedProductCategory | '') => void
  isNegotiable: string
  onIsNegotiableChange: (v: string) => void
  isFulfilled: string
  onIsFulfilledChange: (v: string) => void
  reqMinPrice: number | ''
  onReqMinPriceChange: (v: number | '') => void
  reqMaxPrice: number | ''
  onReqMaxPriceChange: (v: number | '') => void
  onClearRequestedFilters: () => void
  page: number
  pagination?: { total: number; page: number; limit: number; pages: number }
  onPageChange: (p: number) => void
}

export default function MarketplaceView({
  tab, onTabChange,
  listed, listedLoading, requested, requestedLoading,
  search, onSearchChange,
  selectedCat, onCatChange, selectedCondition, onConditionChange, onClearCondition,
  minPrice, onMinPriceChange, maxPrice, onMaxPriceChange,
  minYearUsed, onMinYearUsedChange, maxYearUsed, onMaxYearUsedChange,
  onClearListedFilters,
  reqCat, onReqCatChange, isNegotiable, onIsNegotiableChange,
  isFulfilled, onIsFulfilledChange,
  reqMinPrice, onReqMinPriceChange, reqMaxPrice, onReqMaxPriceChange,
  onClearRequestedFilters,
  page, pagination, onPageChange,
}: MarketplaceViewProps) {
  const [filterOpen, setFilterOpen] = useState(false)
  const isLoading = tab === 'listed' ? listedLoading : requestedLoading

  const hasListedFilters = !!(selectedCat || selectedCondition || minPrice || maxPrice || minYearUsed !== '' || maxYearUsed !== '')
  const hasReqFilters = !!(reqCat || isNegotiable || isFulfilled || reqMinPrice !== '' || reqMaxPrice !== '')
  const hasFilters = tab === 'listed' ? hasListedFilters : hasReqFilters
  const clearFilters = tab === 'listed' ? onClearListedFilters : onClearRequestedFilters

  const listedFilterProps = {
    selectedCat, onCatChange, selectedCondition, onConditionChange, onClearCondition,
    minPrice, onMinPriceChange, maxPrice, onMaxPriceChange,
    minYearUsed, onMinYearUsedChange, maxYearUsed, onMaxYearUsedChange,
    onClearFilters: onClearListedFilters,
  }

  const reqFilterProps = {
    reqCat, onReqCatChange, isNegotiable, onIsNegotiableChange,
    isFulfilled, onIsFulfilledChange,
    reqMinPrice, onReqMinPriceChange, reqMaxPrice, onReqMaxPriceChange,
    onClearFilters: onClearRequestedFilters,
  }

  return (
    <div className="marketplace-page">
      <div className="marketplace-hero">
        <h1 className="marketplace-hero-title">Marketplace</h1>
        <div className={styles.searchWrap}>
          <SearchInput placeholder="Search products..." defaultValue={search} onSearch={onSearchChange} />
        </div>
        <div className="marketplace-tabs-row">
          <button onClick={() => onTabChange('listed')} className={`mp-tab${tab === 'listed' ? ' mp-tab--active' : ''}`}>Listed Items</button>
          <button onClick={() => onTabChange('requested')} className={`mp-tab${tab === 'requested' ? ' mp-tab--active' : ''}`}>Requested Items</button>
        </div>
      </div>

      {/* Mobile filter toggle */}
      <div className={styles.mobileFilterBar}>
        <button className={styles.mobileFilterBtn} onClick={() => setFilterOpen(o => !o)}>
          <SlidersHorizontal size={15} />
          Filters
          {hasFilters && <span className={styles.mobileFilterBadge} />}
        </button>
        {hasFilters && (
          <button className={styles.mobileClearBtn} onClick={clearFilters}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Mobile filter drawer */}
      {filterOpen && (
        <div className={styles.mobileFilterDrawer}>
          <div className={styles.mobileFilterDrawerHeader}>
            <span>Filters</span>
            <button className={styles.mobileFilterClose} onClick={() => setFilterOpen(false)}>
              <X size={18} />
            </button>
          </div>
          {tab === 'listed'
            ? <ListedFilter {...listedFilterProps} />
            : <RequestedFilter {...reqFilterProps} />
          }
        </div>
      )}

      <div className="marketplace-layout">
        <aside className={styles.desktopSidebar}>
          {tab === 'listed' && <ListedFilter {...listedFilterProps} />}
          {tab === 'requested' && <RequestedFilter {...reqFilterProps} />}
        </aside>

        <div>
          {!isLoading && pagination && (
            <div className={styles.resultsHeader}>
              <span className={styles.resultsCount}>{pagination.total} item{pagination.total !== 1 ? 's' : ''} found</span>
            </div>
          )}

          {isLoading ? <MarketplaceSkeletonGrid count={9} /> : (
            <>
              {tab === 'listed' && (listed.length === 0 ? (
                <div className={styles.emptyState}>
                  <ShoppingBag size={48} className={styles.emptyIcon} />
                  <p>No listed products found.</p>
                  <button className={styles.clearFiltersBtn} onClick={onClearListedFilters}>Clear filters</button>
                </div>
              ) : (
                <div className="mp-grid">
                  {listed.map((item, i) => (
                    <ListedProductCard key={item._id ?? i} item={item} variant="main" />
                  ))}
                </div>
              ))}

              {tab === 'requested' && (requested.length === 0 ? (
                <div className={styles.emptyState}>
                  <MessageCircle size={48} className={styles.emptyIcon} />
                  <p>No requested products found.</p>
                  <button className={styles.clearFiltersBtn} onClick={onClearRequestedFilters}>Clear filters</button>
                </div>
              ) : (
                <div className="mp-grid">
                  {requested.map((item, i) => (
                    <RequestedProductCard key={item._id ?? i} item={item} variant="main" />
                  ))}
                </div>
              ))}

              {pagination && (
                <Pagination page={page} pages={pagination.pages} onPageChange={onPageChange} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
