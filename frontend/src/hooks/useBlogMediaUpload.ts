import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const MAX_VIDEO_SIZE_MB = 50
const MAX_VIDEO_SIZE = MAX_VIDEO_SIZE_MB * 1024 * 1024

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
      for (let file of Array.from(files)) {
        // Convert HEIC/HEIF to PNG
        if (isHEIC(file)) {
          file = await convertHEIC(file)
        }

        // Check video size limit
        if (isVideo(file) && file.size > MAX_VIDEO_SIZE) {
          throw new Error(`Video too large (${(file.size / 1024 / 1024).toFixed(0)}MB). Max ${MAX_VIDEO_SIZE_MB}MB. Compress the video before uploading.`)
        }

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
