'use client'

import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface ProviderProps {
  children: ReactNode
}

export function Provider({ children }: ProviderProps) {
  return <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
}
