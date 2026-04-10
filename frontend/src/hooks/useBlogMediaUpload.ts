import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const MAX_UPLOAD_SIZE_MB = 50
const MAX_UPLOAD_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024

function isHEIC(file: File): boolean {
  return file.type === 'image/heic' || file.type === 'image/heif' || /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name)
}

function isVideo(file: File): boolean {
  return file.type.startsWith('video/') || /\.(mp4|webm|mov|avi)$/i.test(file.name)
}

async function convertHEIC(file: File): Promise<File> {
  const heic2any = (await import('heic2any')).default
  const blob = await heic2any({ blob: file, toType: 'image/png', quality: 0.9 }) as Blob
  const name = file.name.replace(/\.heic$/i, '.png').replace(/\.heif$/i, '.png')
  return new File([blob], name, { type: 'image/png' })
}

export interface UseBlogMediaUploadReturn {
  mediaUrls: string[]
  uploading: boolean
  status: string
  error: string
  handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  removeUrl: (index: number) => void
  clearAll: () => void
  addUrl: (url: string) => void
}

export function useBlogMediaUpload(): UseBlogMediaUploadReturn {
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')
    setStatus('')
    try {
      for (let file of Array.from(files)) {
        // Convert HEIC/HEIF to PNG
        if (isHEIC(file)) {
          setStatus('Converting HEIC to PNG...')
          file = await convertHEIC(file)
        }

        // Auto-compress videos that exceed the size limit
        if (isVideo(file) && file.size > MAX_UPLOAD_SIZE) {
          setStatus(`Compressing video (${(file.size / 1024 / 1024).toFixed(0)}MB)...`)
          const { compressVideo } = await import('../lib/mediaConvert')
          file = await compressVideo(file, MAX_UPLOAD_SIZE_MB - 5)
          // If still too large after compression, error out
          if (file.size > MAX_UPLOAD_SIZE) {
            throw new Error(`Video still too large after compression (${(file.size / 1024 / 1024).toFixed(0)}MB). Try a shorter clip.`)
          }
        }

        setStatus('Uploading...')
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
      setStatus('')
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

  return { mediaUrls, uploading, status, error, handleUpload, removeUrl, clearAll, addUrl }
}
