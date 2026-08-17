import { Outlet } from 'react-router-dom'
import { AppShell } from './AppShell'

/**
 * Layout route wrapper for the 6-page workflow: renders AppShell (top bar +
 * stepper) around the nested workflow page via <Outlet />.
 */
export default function WorkflowLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
