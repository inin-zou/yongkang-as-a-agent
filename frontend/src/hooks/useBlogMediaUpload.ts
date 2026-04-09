import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface UseBlogMediaUploadReturn {
  mediaUrls: string[]
  uploading: boolean
  error: string
  handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  removeUrl: (index: number) => void
  clearAll: () => void
  addUrl: (url: string) => void
}

export function useBlogMediaUpload(): UseBlogMediaUploadReturn {
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() ?? 'bin'
        const path = `blog/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('blog-media').upload(path, file, { upsert: true })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('blog-media').getPublicUrl(path)
        setMediaUrls(prev => [...prev, urlData.publicUrl])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      // Reset the input so the same file can be re-selected
      e.target.value = ''
    }
  }, [])

  const removeUrl = useCallback((index: number) => {
    setMediaUrls(prev => prev.filter((_, j) => j !== index))
  }, [])

  const clearAll = useCallback(() => {
    setMediaUrls([])
  }, [])

  const addUrl = useCallback((url: string) => {
    setMediaUrls(prev => [...prev, url])
  }, [])

  return { mediaUrls, uploading, error, handleUpload, removeUrl, clearAll, addUrl }
}
