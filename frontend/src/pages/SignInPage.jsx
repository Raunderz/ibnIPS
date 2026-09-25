import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, LoaderCircle, LogIn } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import BrandMark from '../components/BrandMark.jsx'
import { authenticate } from '../api/auth.js'
import { useAuthSession } from '../hooks/useAuthSession.js'
import { saveAuthSession } from '../services/authSession.js'
import { getSafeReturnTo } from '../utils/routes.js'
import { getEmailError } from '../utils/validation.js'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState(null)
  const [sessionError, setSessionError] = useState(null)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { session } = useAuthSession()
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'))
  const authMutation = useMutation({
    mutationFn: (emailAddress, context) => authenticate(emailAddress, context.signal),
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
    <div className="min-h-dvh bg-ink-950 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-slate-100 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-lg flex-col">
        <div className="flex items-center justify-between gap-4">
          <BrandMark />
          <Link
            to="/"
            className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/10 text-slate-300 active:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
            aria-label="Back to home"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
        </div>

        <div className="my-auto py-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-300">
            Session access
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">
            Sign in with your KIIT email
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            The backend exchanges a valid KIIT email address for a bearer token
            that expires after 24 hours.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-7 rounded-[2rem] border border-white/8 bg-white/4 p-5 sm:p-6"
            noValidate
          >
            <label
              htmlFor="email"
              className="text-sm font-semibold text-slate-200"
            >
              KIIT email address
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
              className="mt-2 min-h-13 w-full rounded-2xl border border-white/12 bg-ink-950/60 px-4 text-base text-white outline-none placeholder:text-slate-600 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
            />

            {errorMessage ? (
              <p
                id="auth-error"
                role="alert"
                className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm leading-6 text-rose-200"
              >
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={authMutation.isPending}
              className="mt-4 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-brand-400 px-5 font-bold text-ink-950 active:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-200"
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

          <p className="mt-4 text-xs leading-5 text-slate-500">
            Signing in creates a server-side session. The backend provides no
            logout endpoint, so signing out only clears this browser session.
          </p>
        </div>
      </div>
    </div>
  )
}
