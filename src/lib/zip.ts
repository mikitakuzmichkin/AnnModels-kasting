import JSZip from 'jszip'
import { asset } from './format'

export async function downloadZip(files: { name: string; src: string }[], filename: string) {
  const zip = new JSZip()
  await Promise.all(
    files.map(async (file, index) => {
      const response = await fetch(asset(file.src))
      if (!response.ok) throw new Error(`Не удалось прочитать ${file.name}`)
      const blob = await response.blob()
      const safe = file.name.replace(/[^\w\u0400-\u04FF.-]+/g, '_')
      zip.file(`${String(index + 1).padStart(2, '0')}-${safe}`, blob)
    }),
  )
  const out = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(out)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
