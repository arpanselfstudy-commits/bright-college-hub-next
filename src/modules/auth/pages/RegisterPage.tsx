'use client'

import { useState, useActionState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { GraduationCap, Check } from 'lucide-react'
import '@/styles/design.css'
import { registerAction } from '../actions/auth.actions'
import AuthLogo from '../components/common/AuthLogo'
import { FormError } from '@/components/common'
import Input from '@/components/common/Input/Input'
import styles from './RegisterPage.module.css'

const PolicyModal = dynamic(() => import('@/components/common/PolicyModal/PolicyModal'), { ssr: false })

const initialState = { success: false, message: '' }

export default function RegisterPage() {
  const [agreed, setAgreed] = useState(false)
  const [policy, setPolicy] = useState<'Privacy' | 'Terms' | null>(null)
  const [confirmValue, setConfirmValue] = useState('')
  const [passwordValue, setPasswordValue] = useState('')
  const [state, formAction, isPending] = useActionState(registerAction, initialState)

  const passwordMismatch = confirmValue.length > 0 && confirmValue !== passwordValue

  return (
    <div className={styles.page}>
      <div className={styles.body}>
        <div className={`auth-left--register ${styles.leftPanel}`}>
          <AuthLogo white />
          <p className={styles.leftSub}>
            The Academic Atelier for the modern scholar and creator.
          </p>
          <div className="register-img-card">
            <div className={styles.imgCard}>
              <GraduationCap size={80} strokeWidth={1} />
            </div>
          </div>
          <p className={`register-quote ${styles.quote}`}>
            &ldquo;Design is not just what it looks like and feels like. Design is how it works.&rdquo;
          </p>
        </div>

        <div className={styles.rightPanel}>
          <h2 className="auth-form-title">Create your account</h2>
          <p className="auth-form-subtitle">Join a community of thousands of students and shops.</p>

          <form action={formAction}>
            <div className="form-group">
              <Input label="Full Name" name="name" type="text" placeholder="Alex Rivera" />
            </div>

            <div className="form-group">
              <Input label="Email Address" name="email" type="email" placeholder="alex@campus.edu" />
            </div>

            <div className={styles.passwordGrid}>
              <div className="form-group">
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                />
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
            </div>

            <div className={`form-check ${styles.checkboxRow}`}>
              <input type="checkbox" id="terms" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <label htmlFor="terms">
                I agree to the{' '}
                <button type="button" className="auth-footer-link-btn" onClick={() => setPolicy('Terms')}>Terms of Service</button>
                {' '}and{' '}
                <button type="button" className="auth-footer-link-btn" onClick={() => setPolicy('Privacy')}>Privacy Policy</button>.
              </label>
            </div>

            {state.message && !state.success && (
              <FormError message={state.message} />
            )}

            <div className={styles.submitRow}>
              <button
                className={`btn btn-primary ${styles.submitBtn}`}
                type="submit"
                disabled={isPending || passwordMismatch || !agreed}
              >
                {isPending ? 'Creating…' : 'Create Account'}
              </button>
              <span className={styles.signInText}>
                Already have an account? <Link href="/login" className={styles.signInLink}>Sign in</Link>
              </span>
            </div>
          </form>
        </div>
      </div>

      {policy && <PolicyModal type={policy} onClose={() => setPolicy(null)} />}
    </div>
  )
}
