'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'

const navItems = [
  { href: '/dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
  { href: '/appointments', icon: 'fa-calendar-check', label: 'Appointments' },
  { href: '/clients', icon: 'fa-users', label: 'Clients' },
  { href: '/staff', icon: 'fa-user-tie', label: 'Staff' },
  { href: '/services', icon: 'fa-cut', label: 'Services' },
  { href: '/rules', icon: 'fa-gavel', label: 'Rules' },
  { href: '/shifts', icon: 'fa-clock', label: 'Shifts' },
  { href: '/chairs', icon: 'fa-chair', label: 'Chairs' },
  { href: '/profile', icon: 'fa-user-circle', label: 'Profile' },
  { href: '/settings', icon: 'fa-cog', label: 'Settings' },
]

export default function DashboardNav({ bid, onLinkClick }) {
  const pathname = usePathname()
  const baseHref = `/dashboard/${bid}`

  const isActive = (href) => {
    if (href === '/dashboard') return pathname === baseHref
    return pathname.startsWith(`${baseHref}${href}`)
  }

  return (
    <aside className="menu p-4">
      <p className="menu-label">General</p>
      <ul className="menu-list">
        {navItems.slice(0, 2).map(item => (
          <li key={item.href}>
            <Link 
              href={item.href === '/dashboard' ? baseHref : `${baseHref}${item.href}`}
              className={isActive(item.href) ? 'is-active' : ''}
              onClick={onLinkClick}
            >
              <span className="icon"><i className={`fas ${item.icon}`}></i></span> {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="menu-label">Management</p>
      <ul className="menu-list">
        {navItems.slice(2, 8).map(item => (
          <li key={item.href}>
            <Link 
              href={`${baseHref}${item.href}`}
              className={isActive(item.href) ? 'is-active' : ''}
              onClick={onLinkClick}
            >
              <span className="icon"><i className={`fas ${item.icon}`}></i></span> {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="menu-label">Settings</p>
      <ul className="menu-list">
        {navItems.slice(8).map(item => (
          <li key={item.href}>
            <Link 
              href={`${baseHref}${item.href}`}
              className={isActive(item.href) ? 'is-active' : ''}
              onClick={onLinkClick}
            >
              <span className="icon"><i className={`fas ${item.icon}`}></i></span> {item.label}
            </Link>
          </li>
        ))}
        <li>
          <LogoutButton />
        </li>
      </ul>
    </aside>
  )
}
