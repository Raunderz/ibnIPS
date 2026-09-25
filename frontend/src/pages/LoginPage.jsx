import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, LoaderCircle, LogIn, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import BrandMark from '../components/BrandMark.jsx'
import { authenticate } from '../api/auth.js'
import { useAuthSession } from '../hooks/useAuthSession.js'
import { saveAuthSession } from '../services/authSession.js'
import { getSafeReturnTo } from '../utils/routes.js'
import { getEmailError } from '../utils/validation.js'

const reasonMessages = {
  expired: 'Your 24-hour session expired. Sign in again to continue.',
  unauthorized: 'Your session is no longer valid. Sign in again to continue.',
  invalid: 'A stored session could not be restored. Sign in again.',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState(null)
  const [sessionError, setSessionError] = useState(null)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { session, endReason } = useAuthSession()
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'))
  const reason = searchParams.get('reason') ?? endReason
  const reasonMessage = reasonMessages[reason] ?? null

  const authMutation = useMutation({
    mutationFn: (emailAddress, context) =>
      authenticate(emailAddress, context.signal),
    onSuccess: ({ token, userId }) => {
      try {
        saveAuthSession(token, userId)
        navigate(returnTo, { replace: true })
      } catch (error) {
        setSessionError(
          error instanceof Error
            ? error.message
            : 'The returned session could not be stored.',
        )
      }
    },
  })

  if (session) {
    return <Navigate to={returnTo} replace />
  }

  function handleSubmit(event) {
    event.preventDefault()
    const error = getEmailError(email)

    if (error) {
      setFieldError(error)
      return
    }

    setFieldError(null)
    setSessionError(null)
    authMutation.mutate(email.trim())
  }

  const errorMessage = fieldError || sessionError || authMutation.error?.message

  return (
    <div className="app-canvas min-h-dvh px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] text-slate-100">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-md flex-col">
        <div className="flex items-center justify-between gap-3">
          <BrandMark />
          <Link
            to="/"
            aria-label="Back to home"
            className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition-colors active:bg-white/10 active:text-white"
          >
            <ArrowLeft size={19} aria-hidden="true" />
          </Link>
        </div>

        <div className="my-auto py-10">
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white">
            Sign in
          </h1>
          <p className="mt-2.5 text-[15px] leading-6 text-slate-400">
            Use your KIIT email address. The backend returns a bearer token that
            expires after 24 hours.
          </p>

          {reasonMessage ? (
            <p
              role="status"
              className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100"
            >
              {reasonMessage}
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6" noValidate>
            <label
              htmlFor="email"
              className="text-xs font-bold tracking-wide text-slate-400 uppercase"
            >
              KIIT email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)

                if (fieldError) {
                  setFieldError(null)
                }

                if (sessionError) {
                  setSessionError(null)
                }

                if (authMutation.isError) {
                  authMutation.reset()
                }
              }}
              aria-invalid={Boolean(errorMessage)}
              aria-describedby={errorMessage ? 'auth-error' : undefined}
              placeholder="23b1234@kiit.ac.in"
              className="mt-2 h-14 w-full rounded-2xl border border-white/10 bg-ink-850 px-4 text-base text-white outline-none transition-colors placeholder:text-slate-600 focus:border-brand-400/70 focus:ring-2 focus:ring-brand-400/25"
            />

            {errorMessage ? (
              <p
                id="auth-error"
                role="alert"
                className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-rose-200"
              >
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={authMutation.isPending}
              className="mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 text-[15px] font-bold text-ink-950 shadow-accent transition-colors active:bg-brand-600 disabled:opacity-60"
            >
              {authMutation.isPending ? (
                <LoaderCircle
                  size={19}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <LogIn size={19} aria-hidden="true" />
              )}
              {authMutation.isPending ? 'Signing in' : 'Continue'}
            </button>
          </form>

          <Link
            to="/"
            className="mt-3 inline-flex min-h-13 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white transition-colors active:bg-white/10"
          >
            Continue without signing in
          </Link>

          <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-500">
            <ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            The token is kept in this browser tab only and is never written into
            the app bundle. The backend has no logout endpoint, so signing out
            clears the local session.
          </p>
        </div>
      </div>
    </div>
  )
}
