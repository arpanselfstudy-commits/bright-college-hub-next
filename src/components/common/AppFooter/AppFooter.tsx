'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import styles from './AppFooter.module.css'

const PolicyModal = dynamic(() => import('@/components/common/PolicyModal/PolicyModal'), { ssr: false })

export default function AppFooter() {
  const [policy, setPolicy] = useState<'Privacy' | 'Terms' | null>(null)

  return (
    <>
      <footer className={styles.footer}>
        <span className={styles.brand}>Bright Collage Hub</span>
        <span>© {new Date().getFullYear()} Bright Collage Hub. The Academic Atelier.</span>
        <div className={styles.links}>
          {(['Privacy', 'Terms'] as const).map((l) => (
            <button key={l} className={styles.link} onClick={() => setPolicy(l)}>{l}</button>
          ))}
        </div>
      </footer>

      {policy && <PolicyModal type={policy} onClose={() => setPolicy(null)} />}
    </>
  )
}
