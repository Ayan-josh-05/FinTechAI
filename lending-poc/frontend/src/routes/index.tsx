import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from '@/App'
import HomePage from '@/pages/HomePage'
import WorkflowLayout from '@/components/layout/WorkflowLayout'
import UploadPage from '@/pages/UploadPage'
import ProcessingPage from '@/pages/ProcessingPage'
import OCRPage from '@/pages/OCRPage'
import TranslationPage from '@/pages/TranslationPage'
import FieldMappingPage from '@/pages/FieldMappingPage'
import ValidationPage from '@/pages/ValidationPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      {
        element: <WorkflowLayout />,
        children: [
          { path: 'upload', element: <UploadPage /> },
          { path: 'processing', element: <ProcessingPage /> },
          { path: 'ocr', element: <OCRPage /> },
          { path: 'translation', element: <TranslationPage /> },
          { path: 'field-mapping', element: <FieldMappingPage /> },
          { path: 'validation', element: <ValidationPage /> },
        ],
      },
      { path: '*', element: <Navigate to="/upload" replace /> },
    ],
  },
])
