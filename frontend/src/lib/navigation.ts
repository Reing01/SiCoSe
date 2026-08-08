import { useEffect, useState } from 'react'

const NAVIGATION_EVENT = 'sicose:navigation'

function normalizePath(pathname: string) {
  return pathname.replace(/\/+$/, '') || '/'
}

export function getCurrentPathname() {
  if (typeof window === 'undefined') {
    return '/'
  }

  return normalizePath(window.location.pathname)
}

function notifyNavigation() {
  window.dispatchEvent(new Event(NAVIGATION_EVENT))
}

export function navigateTo(pathname: string, replace = false) {
  if (typeof window === 'undefined') {
    return
  }

  const nextPathname = normalizePath(pathname)

  if (replace) {
    window.history.replaceState({}, '', nextPathname)
  } else {
    window.history.pushState({}, '', nextPathname)
  }

  notifyNavigation()
}

export function useAppPathname() {
  const [pathname, setPathname] = useState(getCurrentPathname)

  useEffect(() => {
    const updatePathname = () => {
      setPathname(getCurrentPathname())
    }

    window.addEventListener('popstate', updatePathname)
    window.addEventListener(NAVIGATION_EVENT, updatePathname)

    return () => {
      window.removeEventListener('popstate', updatePathname)
      window.removeEventListener(NAVIGATION_EVENT, updatePathname)
    }
  }, [])

  return pathname
}

