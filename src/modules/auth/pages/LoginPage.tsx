'use client'

import { useEffect, useActionState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import '@/styles/design.css'
import { loginAction } from '../actions/auth.actions'
import { useAuthStore } from '../store/auth.store'
import AuthLogo from '../components/common/AuthLogo'
import { FormError } from '@/components/common'
import Input from '@/components/common/Input/Input'
import styles from './LoginPage.module.css'

const initialState = { success: false, message: '' }

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState)
  const setAuth = useAuthStore((s) => s.setAuth)
  const router = useRouter()

  // hydrate auth store from the short-lived cookie the server action sets, then navigate
  useEffect(() => {
    if (state.success) {
      const match = document.cookie.match(/(?:^|;\s*)auth-user=([^;]*)/)
      if (match) {
        try {
          const user = JSON.parse(decodeURIComponent(match[1]))
          // Extra client-side guard — admin accounts must not access the student app
          if (user.role === 'ADMIN') {
            return
          }
          setAuth(user, '', '')
        } catch { /* ignore */ }
      }
      router.replace('/landing')
    }
  }, [state.success, setAuth, router])

  return (
    <div className="auth-page">
      <div className="auth-body">
        <div className="auth-left">
          <AuthLogo />
          <div>
            <h1 className="auth-left-headline">
              The <span>Academic</span><br />Atelier.
            </h1>
            <p className="auth-left-sub">
              Elevate your campus journey with a high-end digital ecosystem designed for students, dreamers, and doers.
            </p>
            <div className="auth-left-avatars">
              <div className={`${styles.avatar} ${styles.avatarBlue1}`} />
              <div className={`${styles.avatar} ${styles.avatarBlue2}`} />
              <div className={`${styles.avatar} ${styles.avatarBlue3}`} />
              <span className={styles.avatarText}>
                Joined by <strong>12k+</strong> students this semester
              </span>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <h2 className="auth-form-title">Welcome Back</h2>
          <p className="auth-form-subtitle">Please enter your credentials to access the atelier.</p>

          {/* Demo credentials hint */}
          <div className={styles.credentialsHint}>
            <div className={styles.credentialsHintLabel}>Credentials</div>
            <div className={styles.credentialsHintRow}>
              <span className={styles.credentialsHintKey}>Email</span>
              <span className={styles.credentialsHintVal}>collage-user@yopmail.com</span>
            </div>
            <div className={styles.credentialsHintRow}>
              <span className={styles.credentialsHintKey}>Password</span>
              <span className={styles.credentialsHintVal}>12345678</span>
            </div>
          </div>

          <form action={formAction}>
            <div className="form-group">
              <Input
                label="Institutional Email"
                name="email"
                type="email"
                placeholder="name@university.edu"
                leftIcon={<Mail size={16} />}
              />
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <span className="form-label">Security Password</span>
                <Link href="/forgot-password" className="forgot-link">Forgot?</Link>
              </div>
              <Input
                name="password"
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock size={16} />}
              />
            </div>

            {state.message && !state.success && (
              <div>
                <FormError message={state.message} />
                {state.message.includes('student') && (
                  <p style={{ fontSize: '13px', marginTop: '6px', color: '#6b7280' }}>
                    Don&apos;t have a student account?{' '}
                    <Link href="/register" style={{ color: '#2a14b4', fontWeight: 600 }}>
                      Create one here
                    </Link>
                  </p>
                )}
              </div>
            )}

            <button className="btn btn-primary" type="submit" disabled={isPending}>
              {isPending ? 'Signing in…' : <><span>Sign In to Dashboard</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="auth-alt-link">
            New to the campus ecosystem?{' '}
            <Link href="/register">Create an account.</Link>
          </p>

          {/* Author attribution */}
          <div className={styles.authorRow}>
            <span className={styles.authorName}>Arpan Ghosh</span>
            <div className={styles.authorLinks}>
              <Link href="https://www.linkedin.com/in/arpan-ghosh-998554270/" target="_blank" rel="noopener noreferrer" className={styles.authorLink}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                LinkedIn
              </Link>
              <span className={styles.authorDot}>·</span>
              <Link href="https://github.com/arpanselfstudy-commits/bright-college-admin-react" target="_blank" rel="noopener noreferrer" className={styles.authorLink}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                Admin Panel
              </Link>
              <span className={styles.authorDot}>·</span>
              <Link href="https://github.com/arpanselfstudy-commits/bright-college-hub-next" target="_blank" rel="noopener noreferrer" className={styles.authorLink}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                User App
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
