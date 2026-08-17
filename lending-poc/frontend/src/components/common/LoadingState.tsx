import { Spinner } from './Spinner'

interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = 'Loading…' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-gray-200 bg-white px-6 py-12 text-center">
      <Spinner />
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  )
}
