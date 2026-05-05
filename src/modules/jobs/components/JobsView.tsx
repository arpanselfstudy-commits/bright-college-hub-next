'use client'

import '@/styles/design.css'
import { Briefcase, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { JobsSkeletonGrid } from '@/components/common/Loader/SkeletonCard'
import SearchInput from '@/components/common/Search/Search'
import Pagination from '@/components/common/Pagination/Pagination'
import type { Job } from '@/modules/jobs/types'
import JobsFilter from './JobsFilter'
import JobCard from './JobCard'
import styles from './JobsView.module.css'

export interface JobsViewProps {
  jobs: Job[]
  isLoading: boolean
  search: string
  onSearchChange: (v: string) => void
  jobType: string
  onJobTypeChange: (t: string) => void
  minExperience: number | ''
  onMinExperienceChange: (v: number | '') => void
  maxExperience: number | ''
  onMaxExperienceChange: (v: number | '') => void
  minSalary: number | ''
  onMinSalaryChange: (v: number | '') => void
  maxSalary: number | ''
  onMaxSalaryChange: (v: number | '') => void
  deadlineFrom: string
  onDeadlineFromChange: (v: string) => void
  deadlineTo: string
  onDeadlineToChange: (v: string) => void
  onClearFilters: () => void
  page: number
  pagination?: { total: number; page: number; limit: number; pages: number }
  onPageChange: (p: number) => void
}

export default function JobsView({
  jobs, isLoading, search, onSearchChange,
  jobType, onJobTypeChange,
  minExperience, onMinExperienceChange,
  maxExperience, onMaxExperienceChange,
  minSalary, onMinSalaryChange,
  maxSalary, onMaxSalaryChange,
  deadlineFrom, onDeadlineFromChange,
  deadlineTo, onDeadlineToChange,
  onClearFilters,
  page, pagination, onPageChange,
}: JobsViewProps) {
  const [filterOpen, setFilterOpen] = useState(false)
  const hasFilters = !!(jobType || minExperience !== '' || maxExperience !== '' || minSalary !== '' || maxSalary !== '' || deadlineFrom || deadlineTo)

  const filterProps = {
    jobType, onJobTypeChange,
    minExperience, onMinExperienceChange,
    maxExperience, onMaxExperienceChange,
    minSalary, onMinSalaryChange,
    maxSalary, onMaxSalaryChange,
    deadlineFrom, onDeadlineFromChange,
    deadlineTo, onDeadlineToChange,
    onClearFilters,
  }

  return (
    <div className="jobs-page">
      <div className="jobs-hero">
        <h1 className="jobs-hero-title">The Next Chapter Starts Here.</h1>
        <p className="jobs-hero-sub">Discover internships, research roles, and part-time opportunities curated specifically for the academic community.</p>
        <div className={styles.searchWrap}>
          <SearchInput placeholder="Search jobs, companies..." defaultValue={search} onSearch={onSearchChange} />
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
          <JobsFilter {...filterProps} />
        </div>
      )}

      <div className="jobs-layout">
        <aside className={`jobs-sidebar ${styles.desktopSidebar}`}>
          <JobsFilter {...filterProps} />
        </aside>

        <div>
          <div className={styles.resultsHeader}>
            {!isLoading && (
              <span className={styles.resultsCount}>
                {pagination ? `${pagination.total} job${pagination.total !== 1 ? 's' : ''} found` : `${jobs.length} result${jobs.length !== 1 ? 's' : ''}`}
              </span>
            )}
          </div>

          {isLoading ? <JobsSkeletonGrid count={9} /> : jobs.length === 0 ? (
            <div className={styles.emptyState}>
              <Briefcase size={48} className={styles.emptyIcon} />
              <p>No jobs found. Try adjusting your filters.</p>
              {hasFilters && <button className={styles.clearFiltersBtn} onClick={onClearFilters}>Clear filters</button>}
            </div>
          ) : (
            <>
              <div className="jobs-grid-main">
                {jobs.map((job, i) => (
                  <JobCard key={job._id ?? job.jobId ?? i} job={job} variant="main" />
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
