'use client'

import { useState, useActionState } from 'react'
import BackButton from '@/components/common/BackButton/BackButton'
import { BookOpen, Check, X, AlertTriangle, ShieldCheck } from 'lucide-react'
import '@/styles/design.css'
import { resetPasswordAction } from '../actions/auth.actions'
import { FormError } from '@/components/common'
import Input from '@/components/common/Input/Input'
import { usePasswordStrength } from '../hooks/usePasswordStrength'
import styles from './ResetPasswordPage.module.css'

interface Props { token: string }

const initialState = { success: false, message: '' }

export default function ResetPasswordPage({ token }: Props) {
  const [passwordValue, setPasswordValue] = useState('')
  const [confirmValue, setConfirmValue] = useState('')

  const [state, formAction, isPending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      formData.set('token', token)
      return resetPasswordAction(_prev, formData)
    },
    initialState
  )

  const { strength, strengthLabel } = usePasswordStrength(passwordValue)
  const passwordMismatch = confirmValue.length > 0 && confirmValue !== passwordValue

  if (!token) {
    return (
      <div className={styles.errorPage}>
        <div className={styles.errorBody}>
          <AlertTriangle size={48} color="#e53e3e" className={styles.errorIcon} />
          <p className={styles.errorText}>Invalid or missing reset token.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={`auth-left auth-left--dark ${styles.leftPanel}`}>
          <div className={styles.leftTop}>
            <div className="security-badge">
              <span className="security-badge-dot" />
              Security Protocol
            </div>
          </div>
          <div className={styles.leftBottom}>
            <h2 className={`auth-left-headline ${styles.leftHeadline}`}>
              Protecting your<br />
              <span className={styles.leftAccent}>Academic<br />Identity.</span>
            </h2>
            <p className={`auth-left-sub auth-left-sub--white ${styles.leftSub}`}>
              Create a robust new password to ensure your research, credits, and campus profile remain exclusively yours.
            </p>
          </div>
        </div>

        <div className={styles.rightPanel}>
          <div className={`cn-logo ${styles.logoWrap}`}>
            <div className="cn-logo-icon"><BookOpen size={18} /></div>
            Bright College Hub
          </div>

          <h2 className="auth-form-title">Reset Password</h2>
          <p className="auth-form-subtitle">Please enter and confirm your new credentials below.</p>

          <form action={formAction}>
            <div className="form-group">
              <Input
                label="New Password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
              />
              {passwordValue.length > 0 && (
                <>
                  <div className="strength-bar">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`strength-bar-seg${i <= strength ? ' strength-bar-seg--filled' : ''}`} />
                    ))}
                  </div>
                  <p className="strength-label">Strength: {strengthLabel}</p>
                </>
              )}
            </div>

            <div className="form-group">
              <Input
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmValue}
                onChange={(e) => setConfirmValue(e.target.value)}
                error={passwordMismatch ? 'Passwords do not match.' : undefined}
                rightIcon={
                  !passwordMismatch && confirmValue.length > 0
                    ? <Check size={16} color="#38a169" />
                    : undefined
                }
              />
            </div>

            <div className="password-rules">
              <div className="password-rule">
                {passwordValue.length >= 8 ? <Check size={14} color="#38a169" /> : <X size={14} color="#9ca3af" />}
                At least 8 characters long
              </div>
              <div className="password-rule">
                {/[^a-zA-Z0-9]/.test(passwordValue) ? <Check size={14} color="#38a169" /> : <X size={14} color="#9ca3af" />}
                Contains one special character
              </div>
            </div>

            {state.message && !state.success && (
              <FormError message={state.message} />
            )}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={isPending || passwordMismatch || !passwordValue}
            >
              {isPending ? 'Resetting…' : <><ShieldCheck size={16} /><span>Reset Password</span></>}
            </button>
          </form>

          <div className={styles.backWrap}>
            <BackButton href="/login" label="Back to Login" />
          </div>
        </div>
      </div>
    </div>
  )
}
