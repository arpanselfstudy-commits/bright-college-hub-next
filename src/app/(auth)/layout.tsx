import { Suspense } from 'react'
import { PageLoader } from '@/components/common/Loader/Loader'
import styles from './AuthLayout.module.css'
// import AppFooter from '@/components/common/AppFooter/AppFooter'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <div className={styles.wrapper}>
        <main className={styles.main}>{children}</main>
        {/* <AppFooter /> */}
      </div>
    </Suspense>
  )
}
