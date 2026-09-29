import { useState, useRef, useCallback } from 'react'
import { Upload, Camera, X, Eye, RefreshCw } from 'lucide-react'
import { compressImage, createPreviewUrl, revokePreviewUrl } from '@/utils/imageCompression'
import { Spinner } from '@/components/ui'

const ReceiptUploader = ({ value, onChange, required = false, error }) => {
  const [preview, setPreview] = useState(null)
  const [compressing, setCompressing] = useState(false)
  const [compressionInfo, setCompressionInfo] = useState(null)
  const [localError, setLocalError] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const inputRef = useRef(null)
  const cameraRef = useRef(null)

  const handleFile = useCallback(async (file) => {
    if (!file) return
    setLocalError(null)
    setCompressing(true)
    try {
      const originalSize = file.size
      const compressed = await compressImage(file)
      const compressedSize = compressed.size

      if (preview) revokePreviewUrl(preview)
      const url = createPreviewUrl(compressed)
      setPreview(url)
      setCompressionInfo({
        original: (originalSize / 1024).toFixed(0),
        compressed: (compressedSize / 1024).toFixed(0),
        reduction: (((originalSize - compressedSize) / originalSize) * 100).toFixed(0),
      })
      onChange(compressed)
    } catch (err) {
      setLocalError(err.message)
    } finally {
      setCompressing(false)
    }
  }, [preview, onChange])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleRemove = () => {
    if (preview) revokePreviewUrl(preview)
    setPreview(null)
    setCompressionInfo(null)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const displayError = localError || error

  if (preview) {
    return (
      <>
        <div className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-white/10 bg-slate-800/50">
          <img
            src={preview}
            alt="Preview nota"
            className="w-full max-h-48 object-contain bg-white dark:bg-slate-900"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
            {compressionInfo && (
              <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                ✓ {compressionInfo.compressed}KB (hemat {compressionInfo.reduction}%)
              </span>
            )}
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="btn btn-ghost btn-xs"
              >
                <Eye size={12} /> Lihat
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="btn btn-danger btn-xs"
              >
                <RefreshCw size={12} /> Ganti
              </button>
            </div>
          </div>
        </div>

        {/* Full preview modal */}
        {previewOpen && (
          <div
            className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4"
            onClick={() => setPreviewOpen(false)}
          >
            <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setPreviewOpen(false)}
                className="absolute top-2 right-2 z-10 btn btn-ghost btn-xs"
              >
                <X size={14} />
              </button>
              <img src={preview} alt="Nota" className="w-full rounded-xl max-h-[80vh] object-contain" />
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div>
      <div
        className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer
          ${displayError ? 'border-red-500/50 bg-red-500/5' : 'border-slate-700 hover:border-blue-500/50 hover:bg-blue-500/5'}
        `}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />

        <div className="py-8 px-4 text-center">
          {compressing ? (
            <div className="flex flex-col items-center gap-3">
              <Spinner size={24} />
              <p className="text-xs text-slate-600 dark:text-slate-400">Mengkompres foto...</p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <Upload size={20} className="text-slate-600 dark:text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Upload Foto Nota</p>
              <p className="text-xs text-slate-500">
                Seret foto ke sini atau klik untuk memilih
              </p>
              <p className="text-[10px] text-slate-600 mt-1">JPG, PNG, WEBP • Maks 10MB</p>

              <div className="flex gap-2 justify-center mt-4" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => inputRef.current?.click()}
                >
                  <Upload size={14} /> Galeri
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => cameraRef.current?.click()}
                >
                  <Camera size={14} /> Kamera
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {displayError && (
        <p className="text-xs text-red-400 mt-1.5">{displayError}</p>
      )}
      {required && !value && !displayError && (
        <p className="text-xs text-slate-500 mt-1.5">* Foto nota wajib dilampirkan</p>
      )}
    </div>
  )
}

export default ReceiptUploader
