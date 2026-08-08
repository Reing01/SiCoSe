import {
  forwardRef,
  type AnchorHTMLAttributes,
  type MouseEvent,
} from 'react'
import { navigateTo } from '../lib/navigation'

type AppLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
}

function isModifiedEvent(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.button !== 0
  )
}

function isInternalAppRoute(href: string) {
  return href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/api/')
}

const AppLink = forwardRef<HTMLAnchorElement, AppLinkProps>(function AppLink(
  { href, onClick, target, download, rel, ...props },
  ref,
) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)

    if (event.defaultPrevented) {
      return
    }

    if (target && target !== '_self') {
      return
    }

    if (download != null) {
      return
    }

    if (isModifiedEvent(event)) {
      return
    }

    if (!isInternalAppRoute(href)) {
      return
    }

    event.preventDefault()
    navigateTo(href)
  }

  return (
    <a
      ref={ref}
      href={href}
      target={target}
      rel={target === '_blank' ? rel ?? 'noreferrer' : rel}
      onClick={handleClick}
      {...props}
    />
  )
})

export default AppLink

