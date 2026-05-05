'use client'

import '@/styles/design.css'
import { SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { ShopsSkeletonGrid } from '@/components/common/Loader/SkeletonCard'
import SearchInput from '@/components/common/Search/Search'
import Pagination from '@/components/common/Pagination/Pagination'
import type { Shop } from '@/modules/shops/types'
import ShopsFilter from './ShopsFilter'
import ShopCard from './ShopCard'
import styles from './ShopsView.module.css'

export interface ShopsViewProps {
  shops: Shop[]
  isLoading: boolean
  search: string
  onSearchChange: (v: string) => void
  openDay: string
  onOpenDayChange: (d: string) => void
  onClearFilters: () => void
  pagination?: { total: number; page: number; limit: number; pages: number }
  page: number
  onPageChange: (p: number) => void
}

export default function ShopsView({
  shops, isLoading, search, onSearchChange,
  openDay, onOpenDayChange,
  onClearFilters,
  pagination, page, onPageChange,
}: ShopsViewProps) {
  const [filterOpen, setFilterOpen] = useState(false)
  const hasFilters = !!openDay

  return (
    <div className="shops-page">
      <div className="shops-hero">
        <h1 className="shops-hero-title">The Academic <em>Atelier.</em></h1>
        <p className="shops-hero-sub">Curated local favorites just steps from the university gates.</p>
        <div className={styles.searchWrap}>
          <SearchInput placeholder="Search shops, items..." defaultValue={search} onSearch={onSearchChange} />
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
          <button className={styles.mobileClearBtn} onClick={onClearFilters}>
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
          <ShopsFilter openDay={openDay} onOpenDayChange={onOpenDayChange} onClearFilters={onClearFilters} />
        </div>
      )}

      <div className="shops-layout">
        <aside className={`shops-sidebar ${styles.desktopSidebar}`}>
          <ShopsFilter
            openDay={openDay}
            onOpenDayChange={onOpenDayChange}
            onClearFilters={onClearFilters}
          />
        </aside>

        <div className="shops-main">
          <div className="shops-main-header">
            <div className="shops-discover">Discover<span> Picks</span><em>.</em></div>
            <div className="shops-count">
              {isLoading ? 'Loading…' : pagination
                ? `${pagination.total} shop${pagination.total !== 1 ? 's' : ''} found`
                : `${shops.length} result${shops.length !== 1 ? 's' : ''}`}
            </div>
          </div>

          {isLoading ? <ShopsSkeletonGrid count={9} /> : shops.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No shops found. Try adjusting your filters.</p>
              {openDay && <button className={styles.clearFiltersBtn} onClick={onClearFilters}>Clear filters</button>}
            </div>
          ) : (
            <>
              <div className="shops-grid">
                {shops.map((shop, i) => (
                  <ShopCard key={shop._id ?? shop.shopId ?? i} shop={shop} variant="main" />
                ))}
              </div>
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
