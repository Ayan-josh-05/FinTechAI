import * as Sentry from '@sentry/tanstackstart-react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'

import * as TanStackQueryProvider from './integrations/tanstack-query/root-provider.tsx'

import './styles.css'
import reportWebVitals from './reportWebVitals.ts'

import { router } from './routes/index.tsx'

import { Provider } from '@/app/providers/ChakraProvider.tsx'

Sentry.init({
  dsn: '', // TODO: Add your Sentry DSN here
  // You can add more options here as needed
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('app')
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <TanStackQueryProvider.Provider>
      <Provider>
        <RouterProvider router={router} />
      </Provider>
    </TanStackQueryProvider.Provider>,
  )
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
