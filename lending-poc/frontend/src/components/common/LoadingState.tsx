import { Spinner } from './Spinner'

interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = 'Loading…' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-14 text-center shadow-card">
      <Spinner className="h-6 w-6" />
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  )
}
