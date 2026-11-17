import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Database, Download, Upload, ShieldCheck, AlertTriangle,
  CheckCircle2, FileSpreadsheet, FileCode, RefreshCw, Info, Check, X, Archive
} from 'lucide-react'
import { backupService } from '@/services/backup'
import { formatCurrency } from '@/utils/format'
import { Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

const BackupManager = ({ user }) => {
  const qc = useQueryClient()
  const fileInputRef = useRef(null)

  // Loading states
  const [exportingJson, setExportingJson] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingZip, setExportingZip] = useState(false)
  const [zipProgress, setZipProgress] = useState(null)
  const [inspecting, setInspecting] = useState(false)
  const [restoring, setRestoring] = useState(false)

  // Inspection & restore states
  const [selectedFileName, setSelectedFileName] = useState('')
  const [inspectionResult, setInspectionResult] = useState(null)
  const [confirmText, setConfirmText] = useState('')
  const [restoreSuccessSummary, setRestoreSuccessSummary] = useState(null)

  // Fetch live system stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['backup_system_stats'],
    queryFn: () => backupService.getSystemStats(),
  })

  // 1. Handle Export Full Backup JSON
  const handleExportJson = async () => {
    setExportingJson(true)
    try {
      const res = await backupService.exportFullBackup(user)
      toast.success(`Cadangan berhasil diunduh: ${res.filename}`)
    } catch (err) {
      toast.error(err.message || 'Gagal mengekspor file cadangan')
    } finally {
      setExportingJson(false)
    }
  }

  // 2. Handle Export Master Excel
  const handleExportExcel = async () => {
    setExportingExcel(true)
    try {
      const res = await backupService.exportMasterExcel(user)
      toast.success(`Master Excel berhasil diunduh (${res.totalTransactions} transaksi)`)
    } catch (err) {
      toast.error(err.message || 'Gagal mengekspor Master Excel')
    } finally {
      setExportingExcel(false)
    }
  }

  // 3. Handle Export Receipts ZIP (Offline Media Backup)
  const handleExportZip = async () => {
    setExportingZip(true)
    setZipProgress({ current: 0, total: 0, percent: 0 })
    try {
      const dateStr = new Date().toISOString().split('T')[0]
      const res = await backupService.downloadReceiptsZip({
        zipFilename: `arsip_seluruh_nota_milad200_${dateStr}`,
        onProgress: (p) => setZipProgress(p),
      })
      toast.success(`Arsip nota berhasil diunduh: ${res.downloadedCount} nota di-bundle ke ZIP`)
    } catch (err) {
      toast.error(err.message || 'Gagal mengunduh berkas nota')
    } finally {
      setExportingZip(false)
      setZipProgress(null)
    }
  }

  // 3. Handle File Selection & Pre-flight Inspection
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFileName(file.name)
    setInspectionResult(null)
    setRestoreSuccessSummary(null)
    setConfirmText('')
    setInspecting(true)

    try {
      const text = await file.text()
      const report = await backupService.inspectBackupFile(text)
      setInspectionResult(report)
      toast.success('Pemeriksaan file selesai: File cadangan valid!')
    } catch (err) {
      toast.error(err.message || 'File tidak valid atau rusak')
      setSelectedFileName('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setInspecting(false)
    }
  }

  // 4. Handle Execute Safe Restore
  const handleExecuteRestore = async () => {
    if (!inspectionResult) return
    if (confirmText.trim().toUpperCase() !== 'RESTORE') {
      toast.error('Ketik "RESTORE" untuk konfirmasi!')
      return
    }

    setRestoring(true)
    try {
      const result = await backupService.executeSafeRestore(inspectionResult, user)
      setRestoreSuccessSummary(result)
      setInspectionResult(null)
      setSelectedFileName('')
      setConfirmText('')
      if (fileInputRef.current) fileInputRef.current.value = ''

      // Invalidate all react-queries so dashboard and reports see fresh data
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['transactions'] }),
        qc.invalidateQueries({ queryKey: ['categories'] }),
        qc.invalidateQueries({ queryKey: ['events'] }),
        qc.invalidateQueries({ queryKey: ['debts'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
        refetchStats(),
      ])

      toast.success('Pemulihan data berhasil diselesaikan!')
    } catch (err) {
      toast.error(err.message || 'Terjadi kesalahan saat memulihkan data')
    } finally {
      setRestoring(false)
    }
  }

  const cancelInspection = () => {
    setInspectionResult(null)
    setSelectedFileName('')
    setConfirmText('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Info */}
      <div className="glass rounded-xl border border-slate-200 dark:border-white/5 p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
            <Database size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Pusat Cadangan & Pemulihan Data (Backup & Restore)
            </h3>
            <p className="text-xs text-slate-500">
              Kelola arsip mandiri dan pemulihan data sistem dengan proteksi anti-duplikasi.
            </p>
          </div>
        </div>

        {/* Live System Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-white/5">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5">
            <span className="text-[10px] text-slate-500 block">Transaksi Aktif</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {statsLoading ? '...' : `${stats?.totalTransactions || 0} Trx`}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">Total Pemasukan</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 currency">
              {statsLoading ? '...' : formatCurrency(stats?.incomeTotal || 0)}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <span className="text-[10px] text-red-600 dark:text-red-400 block">Total Pengeluaran</span>
            <span className="text-sm font-bold text-red-600 dark:text-red-400 currency">
              {statsLoading ? '...' : formatCurrency(stats?.expenseTotal || 0)}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <span className="text-[10px] text-amber-600 dark:text-amber-400 block">Foto Nota Tersimpan</span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {statsLoading ? '...' : `${stats?.receiptsCount || 0} Nota`}
            </span>
          </div>
        </div>
      </div>

      {/* Card 1: Ekspor Cadangan */}
      <div className="glass rounded-xl border border-slate-200 dark:border-white/5 p-5 space-y-4">
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Download size={14} className="text-blue-500" />
            1. Unduh Cadangan Sistem (Export)
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Simpan cadangan ke komputer atau Google Drive Anda. Proses ini bersifat <strong>hanya membaca (Read-Only)</strong> dan 100% aman bagi data aktif.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Download JSON */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
            <div className="space-y-1 mb-3">
              <div className="flex items-center gap-2">
                <FileCode size={16} className="text-emerald-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Snapshot Sistem (.JSON)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Format resmi sistem untuk pemulihan (*restore*) database lengkap tanpa kehilangan metadata transaksi.
              </p>
            </div>
            <button
              onClick={handleExportJson}
              disabled={exportingJson}
              className="btn btn-primary btn-sm w-full flex items-center justify-center gap-2"
            >
              {exportingJson ? <Spinner size={13} color="white" /> : <Download size={13} />}
              {exportingJson ? 'Menyiapkan...' : 'Download Backup (.json)'}
            </button>
          </div>

          {/* Download Excel Master */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
            <div className="space-y-1 mb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-blue-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Arsip Master (.XLSX)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Dokumen Excel lengkap multi-sheet (Transaksi, Hutang, Pos Acara, Kategori, Petugas) untuk pembukuan fisik.
              </p>
            </div>
            <button
              onClick={handleExportExcel}
              disabled={exportingExcel}
              className="btn btn-ghost btn-sm border border-slate-300 dark:border-white/10 w-full flex items-center justify-center gap-2"
            >
              {exportingExcel ? <Spinner size={13} /> : <FileSpreadsheet size={13} />}
              {exportingExcel ? 'Menyiapkan...' : 'Download Excel (.xlsx)'}
            </button>
          </div>

          {/* Download Receipts ZIP */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
            <div className="space-y-1 mb-3">
              <div className="flex items-center gap-2">
                <Archive size={16} className="text-amber-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Bundel Foto Nota (.ZIP)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Unduh seluruh gambar fisik nota tersusun rapi per folder Pos Acara + file indeks CSV untuk arsip offline 100%.
              </p>
            </div>
            <button
              onClick={handleExportZip}
              disabled={exportingZip}
              className="btn btn-ghost btn-sm border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 w-full flex items-center justify-center gap-2"
            >
              {exportingZip ? <Spinner size={13} /> : <Archive size={13} />}
              {exportingZip ? (zipProgress ? `${zipProgress.current}/${zipProgress.total} (${zipProgress.percent}%)` : 'Mengunduh...') : 'Download Nota (.zip)'}
            </button>
          </div>
        </div>
      </div>

      {/* Card 2: Pemulihan Data Cadangan (Restore dengan Pre-flight Check) */}
      <div className="glass rounded-xl border border-slate-200 dark:border-white/5 p-5 space-y-4">
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Upload size={14} className="text-amber-500" />
            2. Pemulihan Data Cadangan (Smart Restore)
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Fitur pemulihan cerdas dengan <strong>validasi anti-duplikasi</strong>. Transaksi yang sudah tercatat di sistem tidak akan digandakan.
          </p>
        </div>

        {/* Input file area */}
        <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/20 text-center">
          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            id="backup-file-input"
          />
          <label
            htmlFor="backup-file-input"
            className="cursor-pointer flex flex-col items-center justify-center gap-2 py-4"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Upload size={18} />
            </div>
            <div>
              <span className="text-xs font-semibold text-blue-500 hover:text-blue-600 dark:text-blue-400">
                Klik untuk memilih file cadangan (.json)
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Hanya file snapshot resmi (.json) hasil ekspor dari aplikasi ini
              </p>
            </div>
            {selectedFileName && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 mt-1">
                <FileCode size={13} />
                {selectedFileName}
              </span>
            )}
          </label>
        </div>

        {/* Loading inspection */}
        {inspecting && (
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 flex items-center justify-center gap-2.5 text-xs text-blue-600 dark:text-blue-400">
            <Spinner size={14} />
            Menganalisis isi file dan memeriksa kesesuaian dengan database...
          </div>
        )}

        {/* Restore Result Alert (After execution) */}
        {restoreSuccessSummary && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 space-y-2 animate-fade-in">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
              <CheckCircle2 size={16} />
              Proses Pemulihan Selesai dengan Aman!
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-2 rounded bg-white/60 dark:bg-black/20">
                <span className="text-slate-400 text-[10px] block">Transaksi Baru Masuk</span>
                <strong className="text-emerald-600 dark:text-emerald-400">+{restoreSuccessSummary.restoredTxCount} Trx</strong>
              </div>
              <div className="p-2 rounded bg-white/60 dark:bg-black/20">
                <span className="text-slate-400 text-[10px] block">Transaksi Sudah Ada (Dilewati)</span>
                <strong className="text-slate-600 dark:text-slate-400">{restoreSuccessSummary.skippedTxCount} Trx (Skip)</strong>
              </div>
              <div className="p-2 rounded bg-white/60 dark:bg-black/20">
                <span className="text-slate-400 text-[10px] block">Hutang & Kategori Baru</span>
                <strong className="text-blue-600 dark:text-blue-400">+{restoreSuccessSummary.restoredDebtsCount + restoreSuccessSummary.restoredCatsCount} Data</strong>
              </div>
            </div>
          </div>
        )}

        {/* Pre-flight Inspection Report (Before execution) */}
        {inspectionResult && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Hasil Analisis Pra-Pemulihan (Pre-flight Inspection)
                </span>
              </div>
              <button
                type="button"
                onClick={cancelInspection}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs flex items-center gap-1 cursor-pointer"
              >
                <X size={14} /> Batal
              </button>
            </div>

            {/* File metadata */}
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-black/20 p-3 rounded-lg">
              <div>
                <span className="text-[10px] text-slate-400 block">Waktu Dibuatnya File:</span>
                <strong>{inspectionResult.exportedAt}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Petugas Pembuat:</span>
                <strong className="truncate block">{inspectionResult.exportedBy}</strong>
              </div>
            </div>

            {/* Anti-duplicate match details */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Rincian Status Data:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Transaksi Baru</span>
                    <strong className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      +{inspectionResult.transactions.newToInsert}
                    </strong>
                  </div>
                  <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                    Akan ditambahkan dengan aman ke database.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700/30 border border-slate-200 dark:border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-semibold">Sudah Ada di Sistem</span>
                    <strong className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {inspectionResult.transactions.alreadyExists}
                    </strong>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Akan dilewati (*skip*) agar <strong>tidak terjadi duplikasi</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Execution Box */}
            {inspectionResult.transactions.newToInsert === 0 && inspectionResult.debts.newToInsert === 0 ? (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                <Check size={16} className="shrink-0" />
                <span>
                  Seluruh data di dalam file cadangan ini sudah ada di database aktif saat ini. Tidak ada data baru yang perlu dipulihkan.
                </span>
              </div>
            ) : (
              <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-3">
                <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <div>
                    <strong className="block">Konfirmasi Keamanan Administrator:</strong>
                    Ketik kata <span className="font-mono font-bold bg-amber-500/20 px-1 rounded">RESTORE</span> di bawah untuk mengizinkan penambahan data baru ini.
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    placeholder='Ketik "RESTORE"'
                    className="input-field !text-xs !py-1.5 flex-1 font-mono uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    disabled={confirmText.trim().toUpperCase() !== 'RESTORE' || restoring}
                    className="btn btn-primary btn-sm flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                  >
                    {restoring ? <Spinner size={13} color="white" /> : <RefreshCw size={13} />}
                    {restoring ? 'Memulihkan Data...' : 'Jalankan Pemulihan Aman'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card 3: Panduan & Keamanan Terbaik */}
      <div className="glass rounded-xl border border-slate-200 dark:border-white/5 p-5 space-y-2.5">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Info size={14} className="text-blue-500" />
          Praktik Terbaik Menjaga Keamanan Data Panitia
        </h4>
        <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
          <li>
            <strong>Rutin Unduh Backup:</strong> Sangat disarankan mengunduh file snapshot <code>.json</code> setiap malam setelah penutupan kas harian.
          </li>
          <li>
            <strong>Simpan di Tempat Terpisah:</strong> Simpan file backup di Google Drive resmi panitia atau flashdisk khusus bendahara agar aman jika terjadi kendala laptop/perangkat.
          </li>
          <li>
            <strong>Supabase Cloud Protection:</strong> Database utama juga dilindungi sistem backup harian otomatis oleh server PostgreSQL Supabase.
          </li>
        </ul>
      </div>
    </div>
  )
}

export default BackupManager

