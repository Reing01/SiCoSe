import { useEffect, useState } from 'react'

function getInitialMatch(query: string) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia(query).matches
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => getInitialMatch(query))

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia(query)

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    setMatches(mediaQuery.matches)

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [query])

  return matches
}
