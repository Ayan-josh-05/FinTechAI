import { Button } from './Button'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-14 text-center"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
        <span aria-hidden="true">✕</span>
      </div>
      <p className="text-sm font-semibold text-red-900">{title}</p>
      <p className="mt-1 max-w-md text-sm text-red-700">{message}</p>
      {onRetry && (
        <Button
          type="button"
          onClick={onRetry}
          className="mt-4 bg-red-600 shadow-none hover:bg-red-700 focus-visible:ring-red-500"
        >
          Try again
        </Button>
      )}
    </div>
  )
}
