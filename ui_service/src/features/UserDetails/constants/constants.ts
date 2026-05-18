// src/features/user-details/constants.ts
import type { ReactNode } from 'react'

export type InfoItem = { label: string; value: string | ReactNode }

export const breadcrumbItems = [
  { label: 'Legal Discovery', href: '/' },
  { label: 'Search Results', href: '/search' },
  { label: 'User Profile', isCurrentPage: true },
]
