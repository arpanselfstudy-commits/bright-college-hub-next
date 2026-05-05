import { Loader2 } from 'lucide-react'
import styles from './Modal.module.css'

interface ConfirmModalProps {
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  loading?: boolean
  onConfirm?: () => void
  onCancel?: () => void
}

export default function ConfirmModal({
  title = 'Are you sure?',
  description = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const isDanger = variant === 'danger'
  return (
    <div className={styles.modal}>
      <div className={isDanger ? styles.accentBarDanger : styles.accentBar} />
      <div className={styles.body}>
        <div className={isDanger ? styles.iconWrapDanger : styles.iconWrap}>
          {isDanger ? '🗑' : '↪'}
        </div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.desc}>{description}</p>
        <button
          className={isDanger ? styles.btnPrimaryDanger : styles.btnPrimary}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading && <Loader2 size={15} className={styles.spinIcon} />}
          {confirmLabel}
        </button>
        <button className={styles.btnGhost} onClick={onCancel} disabled={loading}>{cancelLabel}</button>
      </div>
      <div className={styles.modalFooter}>
        <span className={styles.modalFooterText}>Academic Atelier Security</span>
      </div>
    </div>
  )
}
