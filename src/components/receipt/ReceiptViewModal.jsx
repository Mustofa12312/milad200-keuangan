import { useState, useEffect } from 'react'
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react'
import { transactionService } from '@/services/transactions'
import { Spinner } from '@/components/ui'

const ReceiptViewModal = ({ receipt, onClose }) => {
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const signedUrl = await transactionService.getSignedUrl(receipt.storage_path)
        setUrl(signedUrl)
      } catch (err) {
        setError('Gagal memuat foto nota')
      } finally {
        setLoading(false)
      }
    }
    if (receipt?.storage_path) load()
  }, [receipt])

  return (
    <div
      className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="glass border border-slate-300 dark:border-white/10 rounded-xl w-full max-w-lg animate-fade-in overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/5">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Foto Nota</p>
            <p className="text-xs text-slate-500">{receipt.file_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
              className="btn btn-ghost btn-xs"
              disabled={zoom <= 0.5}
            >
              <ZoomOut size={12} />
            </button>
            <span className="text-xs text-slate-600 dark:text-slate-400">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(3, z + 0.25))}
              className="btn btn-ghost btn-xs"
              disabled={zoom >= 3}
            >
              <ZoomIn size={12} />
            </button>
            {url && (
              <a href={url} download={receipt.file_name} className="btn btn-ghost btn-xs">
                <Download size={12} />
              </a>
            )}
            <button onClick={onClose} className="btn btn-ghost btn-xs">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="overflow-auto max-h-96 bg-white dark:bg-slate-900 flex items-center justify-center min-h-48">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Spinner size={24} />
              <p className="text-xs text-slate-600 dark:text-slate-400">Memuat foto...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : (
            <img
              src={url}
              alt="Nota"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.2s ease' }}
              className="max-w-full"
            />
          )}
        </div>

        {/* Footer */}
        {receipt.file_size && (
          <div className="px-4 py-2 border-t border-slate-200 dark:border-white/5">
            <p className="text-xs text-slate-500">
              Ukuran: {(receipt.file_size / 1024).toFixed(0)} KB
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReceiptViewModal
