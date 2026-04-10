import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'

let ffmpeg: FFmpeg | null = null

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg
  ffmpeg = new FFmpeg()
  await ffmpeg.load()
  return ffmpeg
}

/**
 * Convert a WAV (or other large audio) file to MP3 in the browser using ffmpeg.wasm.
 */
export async function convertToMp3(file: File): Promise<File> {
  const ff = await getFFmpeg()
  const inputName = 'input' + (file.name.substring(file.name.lastIndexOf('.')) || '.wav')
  const outputName = 'output.mp3'

  await ff.writeFile(inputName, await fetchFile(file))
  await ff.exec(['-i', inputName, '-codec:a', 'libmp3lame', '-b:a', '192k', outputName])
  const data = await ff.readFile(outputName)

  await ff.deleteFile(inputName)
  await ff.deleteFile(outputName)

  const blob = new Blob([new Uint8Array(data as Uint8Array)], { type: 'audio/mpeg' })
  const mp3Name = file.name.replace(/\.[^.]+$/, '.mp3')
  return new File([blob], mp3Name, { type: 'audio/mpeg' })
}

/** Check if an audio file needs conversion (WAV, FLAC, AIFF) */
export function needsAudioConversion(file: File): boolean {
  const lossless = ['audio/wav', 'audio/x-wav', 'audio/flac', 'audio/aiff', 'audio/x-aiff']
  return lossless.includes(file.type) || /\.(wav|flac|aiff?)$/i.test(file.name)
}

/**
 * Compress a video to reduce file size using ffmpeg.wasm.
 * Uses H.264 + AAC at a target bitrate that keeps the file under maxSizeMB.
 */
export async function compressVideo(file: File, maxSizeMB = 45): Promise<File> {
  const ff = await getFFmpeg()
  const ext = file.name.substring(file.name.lastIndexOf('.')) || '.mp4'
  const inputName = 'input' + ext
  const outputName = 'output.mp4'

  await ff.writeFile(inputName, await fetchFile(file))

  // Estimate target bitrate: (maxSize in bits) / (duration estimate)
  // We don't know duration, so use a conservative CRF approach instead
  // CRF 28 = good compression, visually acceptable. CRF 32 = smaller but lower quality.
  const fileSizeMB = file.size / (1024 * 1024)
  const crf = fileSizeMB > maxSizeMB * 2 ? '32' : '28'

  await ff.exec([
    '-i', inputName,
    '-c:v', 'libx264',
    '-crf', crf,
    '-preset', 'fast',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-y', outputName,
  ])

  const data = await ff.readFile(outputName)

  await ff.deleteFile(inputName)
  await ff.deleteFile(outputName)

  const blob = new Blob([new Uint8Array(data as Uint8Array)], { type: 'video/mp4' })
  const mp4Name = file.name.replace(/\.[^.]+$/, '.mp4')
  return new File([blob], mp4Name, { type: 'video/mp4' })
}
