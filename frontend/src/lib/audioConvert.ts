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
 * Returns a new File object with .mp3 extension.
 */
export async function convertToMp3(file: File): Promise<File> {
  const ff = await getFFmpeg()
  const inputName = 'input' + (file.name.substring(file.name.lastIndexOf('.')) || '.wav')
  const outputName = 'output.mp3'

  await ff.writeFile(inputName, await fetchFile(file))
  await ff.exec(['-i', inputName, '-codec:a', 'libmp3lame', '-b:a', '192k', outputName])
  const data = await ff.readFile(outputName)

  // Clean up
  await ff.deleteFile(inputName)
  await ff.deleteFile(outputName)

  // ffmpeg returns Uint8Array with ArrayBufferLike — copy to plain Uint8Array<ArrayBuffer>
  const blob = new Blob([new Uint8Array(data as Uint8Array)], { type: 'audio/mpeg' })
  const mp3Name = file.name.replace(/\.[^.]+$/, '.mp3')
  return new File([blob], mp3Name, { type: 'audio/mpeg' })
}

/** Check if a file needs conversion (WAV, FLAC, AIFF — large lossless formats) */
export function needsConversion(file: File): boolean {
  const lossless = ['audio/wav', 'audio/x-wav', 'audio/flac', 'audio/aiff', 'audio/x-aiff']
  return lossless.includes(file.type) || /\.(wav|flac|aiff?)$/i.test(file.name)
}
