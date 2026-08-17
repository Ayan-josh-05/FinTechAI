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
      className="flex flex-col items-center justify-center rounded-md border border-red-200 bg-red-50 px-6 py-12 text-center"
    >
      <p className="text-sm font-medium text-red-900">{title}</p>
      <p className="mt-1 max-w-md text-sm text-red-700">{message}</p>
      {onRetry && (
        <Button type="button" onClick={onRetry} className="mt-4 bg-red-600 hover:bg-red-700">
          Try again
        </Button>
      )}
    </div>
  )
}
