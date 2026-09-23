import { Navigate, useParams } from 'react-router-dom'
import DocumentLayout from '../doc/DocumentLayout'

export default function FileSystemLayout() {
  const { tab } = useParams()
  if (!['soul', 'skill', 'memory', 'contact', 'music', 'admin'].includes(tab ?? '')) return <Navigate to="/files/soul" replace />
  return <DocumentLayout />
}
