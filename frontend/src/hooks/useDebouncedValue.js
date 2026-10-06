import { useEffect, useState } from 'react'

export function useDebouncedValue(value, delay = 160) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay)

    return () => window.clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
