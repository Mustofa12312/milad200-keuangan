import supabase from './supabase'
import { logAudit } from './auditLog'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { formatDate } from '@/utils/format'

const APP_IDENTIFIER = 'milad200-keuangan'
const BACKUP_SCHEMA_VERSION = '1.0'

// Helper Pagination Otomatis untuk mencegah limit 1.000 baris Supabase
async function fetchAllRows(table, select = '*', orderCol = 'created_at', ascending = true) {
  const allRows = []
  let from = 0
  const step = 1000
  while (true) {
    let query = supabase
      .from(table)
      .select(select)
      .range(from, from + step - 1)

    if (orderCol) {
      query = query.order(orderCol, { ascending })
    }

    const { data, error } = await query
    if (error) throw error
    if (!data || data.length === 0) break
    allRows.push(...data)
    if (data.length < step) break
    from += step
  }
  return allRows
}

export const backupService = {
  // 1. Dapatkan statistik ringkas sistem untuk tampilan dashboard backup
  async getSystemStats() {
    const [txs, debts, cats, receipts] = await Promise.all([
      fetchAllRows('transactions', 'type, amount, is_deleted', null),
      fetchAllRows('debts', 'original_amount, remaining_amount, status', null),
      fetchAllRows('categories', 'id, description, name', null),
      fetchAllRows('transaction_receipts', 'id', null),
    ])

    const activeTxs = txs.filter(t => !t.is_deleted)
    const incomeTotal = activeTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount || 0), 0)
    const expenseTotal = activeTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount || 0), 0)
    const debtTotal = debts.reduce((s, d) => s + Number(d.original_amount || 0), 0)

    const posAcaraCount = cats.filter(c => c.description === 'POS_ACARA').length
    const categoryCount = cats.filter(c => c.description !== 'POS_ACARA' && !c.name?.startsWith('__CONFIG_')).length

    return {
      totalTransactions: activeTxs.length,
      incomeTotal,
      expenseTotal,
      debtTotal,
      posAcaraCount,
      categoryCount,
      receiptsCount: receipts.length,
    }
  },

  // 2. Ekspor Full Snapshot JSON (Didukung Pagination Tanpa Limit 1.000 Baris)
  async exportFullBackup(user) {
    const [categories, transactions, receipts, debts, debtPayments, profiles] = await Promise.all([
      fetchAllRows('categories', '*', 'created_at', true),
      fetchAllRows('transactions', '*', 'transaction_date', true),
      fetchAllRows('transaction_receipts', '*', 'created_at', true),
      fetchAllRows('debts', '*', 'debt_date', true),
      fetchAllRows('debt_payments', '*', 'payment_date', true),
      fetchAllRows('profiles', 'id, user_id, full_name, email, role_id, is_active', 'created_at', true),
    ])

    const now = new Date()
    const isoString = now.toISOString()
    const dateStamp = isoString.split('T')[0]
    const timeStamp = isoString.split('T')[1].substring(0, 5).replace(':', '')
    const filename = `backup_milad200_keuangan_${dateStamp}_${timeStamp}`

    const incomeSum = transactions.filter(t => t.type === 'INCOME' && !t.is_deleted).reduce((s, t) => s + Number(t.amount || 0), 0)
    const expenseSum = transactions.filter(t => t.type === 'EXPENSE' && !t.is_deleted).reduce((s, t) => s + Number(t.amount || 0), 0)
    const debtSum = debts.reduce((s, d) => s + Number(d.original_amount || 0), 0)

    const backupPayload = {
      meta: {
        app: APP_IDENTIFIER,
        schema_version: BACKUP_SCHEMA_VERSION,
        exported_at: isoString,
        exported_by: {
          id: user?.id,
          email: user?.email,
        },
        counts: {
          categories: categories.length,
          transactions: transactions.length,
          transaction_receipts: receipts.length,
          debts: debts.length,
          debt_payments: debtPayments.length,
          profiles: profiles.length,
        },
        financial_summary: {
          total_income: incomeSum,
          total_expense: expenseSum,
          balance: incomeSum - expenseSum,
          total_debt: debtSum,
        },
      },
      data: {
        categories,
        transactions,
        transaction_receipts: receipts,
        debts,
        debt_payments: debtPayments,
        profiles,
      },
    }

    // Trigger download JSON
    const jsonStr = JSON.stringify(backupPayload, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    // Audit log
    if (user?.id) {
      await logAudit(user.id, 'EXPORT_BACKUP', 'system', null, null, {
        filename: `${filename}.json`,
        transactionsCount: transactions.length,
        debtsCount: debts.length,
      })
    }

    return { filename: `${filename}.json`, counts: backupPayload.meta.counts }
  },

  // 3. Ekspor Seluruh Data ke Master Excel (Didukung Pagination Tanpa Limit 1.000 Baris)
  async exportMasterExcel(user) {
    const [categories, transactions, debts, debtPayments, profiles] = await Promise.all([
      fetchAllRows('categories', '*', 'created_at', true),
      fetchAllRows('transactions', '*, categories(name), creator:profiles!transactions_created_by_fkey(full_name)', 'transaction_date', true),
      fetchAllRows('debts', '*, creator:profiles!debts_created_by_fkey(full_name)', 'debt_date', true),
      fetchAllRows('debt_payments', '*, creator:profiles!debt_payments_created_by_fkey(full_name)', 'payment_date', true),
      fetchAllRows('profiles', '*, roles(name)', 'created_at', true),
    ])

    const wb = XLSX.utils.book_new()
    const now = new Date()
    const dateStamp = now.toISOString().split('T')[0]

    // Sheet 1: Ringkasan Sistem
    const activeTxs = transactions.filter(t => !t.is_deleted)
    const totalIncome = activeTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount || 0), 0)
    const totalExpense = activeTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount || 0), 0)
    const totalDebt = debts.reduce((s, d) => s + Number(d.original_amount || 0), 0)

    const summaryRows = [
      { 'Indikator': 'Aplikasi', 'Nilai': 'Laporan Keuangan 2 Abad Panyeppen' },
      { 'Indikator': 'Waktu Ekspor', 'Nilai': now.toLocaleString('id-ID') },
      { 'Indikator': 'Petugas Ekspor', 'Nilai': user?.email || 'Administrator' },
      { 'Indikator': '', 'Nilai': '' },
      { 'Indikator': 'Total Pemasukan (Aktif)', 'Nilai': totalIncome },
      { 'Indikator': 'Total Pengeluaran (Aktif)', 'Nilai': totalExpense },
      { 'Indikator': 'Saldo Kas', 'Nilai': totalIncome - totalExpense },
      { 'Indikator': 'Total Hutang Tercatat', 'Nilai': totalDebt },
      { 'Indikator': '', 'Nilai': '' },
      { 'Indikator': 'Jumlah Transaksi', 'Nilai': transactions.length },
      { 'Indikator': 'Jumlah Transaksi Dibatalkan (Soft Delete)', 'Nilai': transactions.filter(t => t.is_deleted).length },
      { 'Indikator': 'Jumlah Rekening Hutang', 'Nilai': debts.length },
      { 'Indikator': 'Jumlah Kategori & Pos Acara', 'Nilai': categories.length },
    ]
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
    wsSummary['!cols'] = [{ wch: 38 }, { wch: 35 }]
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Sistem')

    // Sheet 2: Master Transaksi
    const txRows = transactions.map((t, idx) => ({
      'No': idx + 1,
      'ID Transaksi': t.id,
      'Tanggal': t.transaction_date,
      'Jenis': t.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran',
      'Pos Acara': t.source || 'Umum',
      'Kategori': t.categories?.name || '-',
      'Keterangan / Uraian': t.description || '-',
      'Nominal (Rp)': Number(t.amount),
      'Status': t.is_deleted ? 'DIBATALKAN' : 'AKTIF',
      'Petugas': t.creator?.full_name || '-',
      'Waktu Dibuat': t.created_at,
    }))
    const wsTx = XLSX.utils.json_to_sheet(txRows)
    wsTx['!cols'] = [
      { wch: 6 }, { wch: 36 }, { wch: 13 }, { wch: 14 },
      { wch: 22 }, { wch: 25 }, { wch: 45 }, { wch: 18 },
      { wch: 15 }, { wch: 20 }, { wch: 22 }
    ]
    XLSX.utils.book_append_sheet(wb, wsTx, 'Semua Transaksi')

    // Sheet 3: Hutang
    const debtRows = debts.map((d, idx) => ({
      'No': idx + 1,
      'ID Hutang': d.id,
      'Pihak Terkait': d.party_name,
      'Tanggal Hutang': d.debt_date,
      'Jatuh Tempo': d.due_date || '-',
      'Total Hutang (Rp)': Number(d.original_amount),
      'Sisa Hutang (Rp)': Number(d.remaining_amount),
      'Status': d.status,
      'Keterangan': d.description || '-',
      'Petugas': d.creator?.full_name || '-',
    }))
    const wsDebt = XLSX.utils.json_to_sheet(debtRows)
    wsDebt['!cols'] = [
      { wch: 6 }, { wch: 36 }, { wch: 25 }, { wch: 14 },
      { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 14 },
      { wch: 30 }, { wch: 20 }
    ]
    XLSX.utils.book_append_sheet(wb, wsDebt, 'Daftar Hutang')

    // Sheet 4: Pembayaran Hutang (Cicilan)
    const payRows = debtPayments.map((p, idx) => ({
      'No': idx + 1,
      'ID Pembayaran': p.id,
      'ID Hutang': p.debt_id,
      'Tanggal Bayar': p.payment_date,
      'Nominal Bayar (Rp)': Number(p.amount),
      'Catatan': p.notes || '-',
      'Petugas': p.creator?.full_name || '-',
      'Waktu Input': p.created_at,
    }))
    const wsPay = XLSX.utils.json_to_sheet(payRows)
    wsPay['!cols'] = [
      { wch: 6 }, { wch: 36 }, { wch: 36 }, { wch: 14 },
      { wch: 18 }, { wch: 30 }, { wch: 20 }, { wch: 22 }
    ]
    XLSX.utils.book_append_sheet(wb, wsPay, 'Cicilan Hutang')

    // Sheet 5: Kategori & Pos Acara
    const catRows = categories.map((c, idx) => ({
      'No': idx + 1,
      'ID': c.id,
      'Nama': c.name,
      'Jenis': c.description === 'POS_ACARA' ? 'Pos Acara' : (c.name?.startsWith('__CONFIG_') ? 'Konfigurasi Sistem' : 'Kategori Biaya'),
      'Status': c.is_active ? 'Aktif' : 'Nonaktif',
      'Waktu Dibuat': c.created_at,
    }))
    const wsCat = XLSX.utils.json_to_sheet(catRows)
    wsCat['!cols'] = [{ wch: 6 }, { wch: 36 }, { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 22 }]
    XLSX.utils.book_append_sheet(wb, wsCat, 'Kategori & Pos Acara')

    // Sheet 6: Pengguna Sistem
    const userRows = profiles.map((p, idx) => ({
      'No': idx + 1,
      'ID Profile': p.id,
      'User ID': p.user_id,
      'Nama Lengkap': p.full_name,
      'Email': p.email,
      'Role': p.roles?.name || 'USER',
      'Status': p.is_active ? 'Aktif' : 'Nonaktif',
    }))
    const wsUser = XLSX.utils.json_to_sheet(userRows)
    wsUser['!cols'] = [{ wch: 6 }, { wch: 36 }, { wch: 36 }, { wch: 25 }, { wch: 30 }, { wch: 12 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, wsUser, 'Daftar Pengguna')

    const filename = `arsip_master_keuangan_milad200_${dateStamp}.xlsx`
    XLSX.writeFile(wb, filename)

    if (user?.id) {
      await logAudit(user.id, 'EXPORT_EXCEL_MASTER', 'system', null, null, {
        filename,
        transactionsCount: transactions.length,
      })
    }

    return { filename, totalTransactions: transactions.length }
  },

  // 4. Unduh Bundel Seluruh Gambar Nota Fisik (.ZIP) - Terorganisir per Folder Pos Acara
  async downloadReceiptsZip({ transactions = null, zipFilename = 'arsip_nota_milad200', onProgress = null }) {
    let receiptsList = []

    if (transactions && Array.isArray(transactions)) {
      // Ambil transaksi yang memiliki relasi receipts
      transactions.forEach(t => {
        if (t.receipts && t.receipts.length > 0) {
          t.receipts.forEach(r => {
            if (r.storage_path) {
              receiptsList.push({
                receipt: r,
                transaction: t,
              })
            }
          })
        }
      })
    } else {
      // Unduh semua nota yang ada di database secara otomatis
      const receiptsData = await fetchAllRows(
        'transaction_receipts',
        '*, transactions(id, type, source, transaction_date, amount, description, categories(name))',
        'created_at',
        true
      )
      receiptsList = (receiptsData || [])
        .filter(r => r.storage_path)
        .map(r => ({
          receipt: r,
          transaction: r.transactions || {},
        }))
    }

    if (receiptsList.length === 0) {
      throw new Error('Tidak ada file nota yang ditemukan untuk diunduh.')
    }

    const zip = new JSZip()
    const indexRows = [
      ['No', 'Tanggal', 'Jenis', 'Pos Acara', 'Kategori', 'Uraian', 'Nominal (Rp)', 'Lokasi File di ZIP']
    ]

    let downloadedCount = 0
    let failedCount = 0
    const total = receiptsList.length

    for (let i = 0; i < total; i++) {
      const item = receiptsList[i]
      const r = item.receipt
      const t = item.transaction || {}

      if (onProgress) {
        onProgress({
          current: i + 1,
          total,
          percent: Math.round(((i + 1) / total) * 100),
          fileName: r.file_name || r.storage_path,
        })
      }

      try {
        const { data: blob, error } = await supabase.storage
          .from('transaction-receipts')
          .download(r.storage_path)

        if (error || !blob) {
          failedCount++
          continue
        }

        const safePos = (t.source || (t.type === 'INCOME' ? 'Pemasukan' : 'Umum')).replace(/[/\\?%*:|"<>]/g, '_').trim()
        const safeDesc = (t.description || 'nota').substring(0, 30).replace(/[/\\?%*:|"<>]/g, '_').trim()
        const ext = r.storage_path.split('.').pop() || 'webp'
        const amountStr = Number(t.amount || 0).toLocaleString('id-ID')
        const dateStr = t.transaction_date || 'tgl'

        const fileNameInsideZip = `${dateStr}_Rp${amountStr}_${safeDesc}_${r.id.substring(0, 4)}.${ext}`
        const fullZipPath = `${safePos}/${fileNameInsideZip}`

        zip.file(fullZipPath, blob)
        downloadedCount++

        indexRows.push([
          String(downloadedCount),
          dateStr,
          t.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran',
          t.source || 'Umum',
          t.categories?.name || '-',
          `"${(t.description || '-').replace(/"/g, '""')}"`,
          amountStr,
          `"${fullZipPath}"`
        ])
      } catch (err) {
        console.warn(`Gagal mengunduh nota ${r.storage_path}:`, err)
        failedCount++
      }
    }

    if (downloadedCount === 0) {
      throw new Error('Gagal mengunduh gambar nota dari storage server.')
    }

    // Tambahkan CSV Indeks di root ZIP (dengan UTF-8 BOM agar rapi di Microsoft Excel)
    const csvContent = '\uFEFF' + indexRows.map(row => row.join(',')).join('\r\n')
    zip.file('INDEX_DAFTAR_NOTA.csv', csvContent)

    // Tambahkan file README petunjuk
    const readmeContent = `ARSIP BUKTI NOTA DIGITAL
Milad 2 Abad Pondok Pesantren Panyeppen
===========================================
Total File Berhasil Diunduh : ${downloadedCount} nota
Total File Gagal / Dihapus  : ${failedCount} nota
Waktu Pembuatan Arsip       : ${new Date().toLocaleString('id-ID')}

Petunjuk:
1. File gambar nota telah dikelompokkan ke dalam folder sesuai Pos Acara masing-masing.
2. Buka file "INDEX_DAFTAR_NOTA.csv" menggunakan Microsoft Excel untuk melihat daftar lengkap beserta nominal dan rincian transaksi.`
    zip.file('README_PETUNJUK.txt', readmeContent)

    // Generate ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${zipFilename}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return {
      success: true,
      downloadedCount,
      failedCount,
      total,
      filename: `${zipFilename}.zip`,
    }
  },

  // 5. Pre-flight Inspection: Analisa file backup sebelum dieksekusi (Anti-Error & Anti-Duplikat)
  async inspectBackupFile(fileContent) {
    let parsed
    try {
      parsed = typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent
    } catch {
      throw new Error('File tidak valid: Format bukan JSON atau file rusak.')
    }

    // Normalisasi struktur (support format dengan meta atau tanpa meta)
    const backupData = parsed.data || parsed
    const backupMeta = parsed.meta || {}

    if (!backupData || !Array.isArray(backupData.transactions)) {
      throw new Error('File cadangan tidak sesuai standar: Tabel transaksi tidak ditemukan dalam file.')
    }

    // Ambil data aktif dari database untuk dicocokkan (Pre-flight check)
    const [txCheck, debtCheck, catCheck] = await Promise.all([
      supabase.from('transactions').select('id, amount, transaction_date, type'),
      supabase.from('debts').select('id, party_name'),
      supabase.from('categories').select('id, name'),
    ])

    if (txCheck.error) throw txCheck.error
    if (debtCheck.error) throw debtCheck.error
    if (catCheck.error) throw catCheck.error

    const existingTxIds = new Set((txCheck.data || []).map(t => t.id))
    const existingDebtIds = new Set((debtCheck.data || []).map(d => d.id))
    const existingCatNames = new Set((catCheck.data || []).map(c => c.name.toLowerCase().trim()))
    const existingCatIds = new Set((catCheck.data || []).map(c => c.id))

    const backupTxs = backupData.transactions || []
    const backupDebts = backupData.debts || []
    const backupCats = backupData.categories || []
    const backupReceipts = backupData.transaction_receipts || []

    // Hitung berapa yang sudah ada (akan di-skip) dan berapa yang baru (akan di-insert)
    let txExistingCount = 0
    let txNewCount = 0
    let txNewAmount = 0

    backupTxs.forEach(t => {
      if (existingTxIds.has(t.id)) {
        txExistingCount++
      } else {
        txNewCount++
        txNewAmount += Number(t.amount || 0)
      }
    })

    let debtExistingCount = 0
    let debtNewCount = 0
    backupDebts.forEach(d => {
      if (existingDebtIds.has(d.id)) {
        debtExistingCount++
      } else {
        debtNewCount++
      }
    })

    let catExistingCount = 0
    let catNewCount = 0
    backupCats.forEach(c => {
      if (existingCatIds.has(c.id) || existingCatNames.has(c.name?.toLowerCase().trim())) {
        catExistingCount++
      } else {
        catNewCount++
      }
    })

    return {
      isValid: true,
      app: backupMeta.app || 'Unknown',
      exportedAt: backupMeta.exported_at ? formatDate(backupMeta.exported_at) : 'Tidak tercatat',
      exportedBy: backupMeta.exported_by?.email || 'Tidak diketahui',
      transactions: {
        totalInFile: backupTxs.length,
        alreadyExists: txExistingCount,
        newToInsert: txNewCount,
        newAmount: txNewAmount,
      },
      debts: {
        totalInFile: backupDebts.length,
        alreadyExists: debtExistingCount,
        newToInsert: debtNewCount,
      },
      categories: {
        totalInFile: backupCats.length,
        alreadyExists: catExistingCount,
        newToInsert: catNewCount,
      },
      receipts: {
        totalInFile: backupReceipts.length,
      },
      rawBackup: backupData,
    }
  },

  // 5. Eksekusi Restore Cerdas & Aman (Idempotent Merge by UUID)
  async executeSafeRestore(inspectionReport, currentUser) {
    if (!inspectionReport || !inspectionReport.rawBackup) {
      throw new Error('Laporan inspeksi tidak valid.')
    }

    const { rawBackup } = inspectionReport
    const currentUserId = currentUser?.id
    if (!currentUserId) throw new Error('Otorisasi gagal: User ID tidak ditemukan.')

    // Dapatkan data eksisting untuk validasi foreign key
    const [catRes, profRes, txRes, debtRes] = await Promise.all([
      supabase.from('categories').select('id, name'),
      supabase.from('profiles').select('user_id'),
      supabase.from('transactions').select('id'),
      supabase.from('debts').select('id'),
    ])

    const existingCatIds = new Set((catRes.data || []).map(c => c.id))
    const existingCatNames = new Map((catRes.data || []).map(c => [c.name.toLowerCase().trim(), c.id]))
    const existingUserIds = new Set((profRes.data || []).map(p => p.user_id))
    const existingTxIds = new Set((txRes.data || []).map(t => t.id))
    const existingDebtIds = new Set((debtRes.data || []).map(d => d.id))

    // Helper untuk foreign key user: Jika user_id pembuat lama tidak ada di sistem ini, gunakan user admin saat ini
    const safeUserId = (uid) => (uid && existingUserIds.has(uid) ? uid : currentUserId)

    let restoredCatsCount = 0
    let restoredDebtsCount = 0
    let restoredTxCount = 0
    let skippedTxCount = 0

    // LANGKAH 1: Kategori & Pos Acara
    const backupCats = rawBackup.categories || []
    for (const c of backupCats) {
      const lowerName = c.name?.toLowerCase().trim()
      if (!existingCatIds.has(c.id) && !existingCatNames.has(lowerName)) {
        const { error: catErr } = await supabase.from('categories').insert({
          id: c.id,
          name: c.name,
          description: c.description || null,
          is_active: c.is_active ?? true,
          created_by: safeUserId(c.created_by),
        })
        if (!catErr) {
          existingCatIds.add(c.id)
          existingCatNames.set(lowerName, c.id)
          restoredCatsCount++
        }
      }
    }

    // LANGKAH 2: Hutang (Debts)
    const backupDebts = rawBackup.debts || []
    for (const d of backupDebts) {
      if (!existingDebtIds.has(d.id)) {
        const { error: debtErr } = await supabase.from('debts').insert({
          id: d.id,
          party_name: d.party_name,
          original_amount: d.original_amount,
          remaining_amount: d.remaining_amount,
          debt_date: d.debt_date,
          due_date: d.due_date || null,
          description: d.description || null,
          status: d.status || 'BELUM LUNAS',
          created_by: safeUserId(d.created_by),
        })
        if (!debtErr) {
          existingDebtIds.add(d.id)
          restoredDebtsCount++
        }
      }
    }

    // LANGKAH 3: Cicilan Hutang (Debt Payments)
    const backupPayments = rawBackup.debt_payments || []
    if (backupPayments.length > 0) {
      const { data: existingPays } = await supabase.from('debt_payments').select('id')
      const existingPayIds = new Set((existingPays || []).map(p => p.id))

      for (const p of backupPayments) {
        if (!existingPayIds.has(p.id) && existingDebtIds.has(p.debt_id)) {
          await supabase.from('debt_payments').insert({
            id: p.id,
            debt_id: p.debt_id,
            amount: p.amount,
            payment_date: p.payment_date,
            notes: p.notes || null,
            created_by: safeUserId(p.created_by),
          })
        }
      }
    }

    // LANGKAH 4: Transaksi (Hanya masukkan yang ID-nya belum ada di DB)
    const backupTxs = rawBackup.transactions || []
    const newTxsToInsert = []

    // Kategori default jika category_id tidak valid
    let defaultCatId = existingCatNames.get('lainnya') || existingCatNames.get('lain-lain') || Array.from(existingCatIds)[0]

    for (const t of backupTxs) {
      if (existingTxIds.has(t.id)) {
        skippedTxCount++
        continue
      }

      // Pastikan category_id valid
      let validCatId = t.category_id
      if (validCatId && !existingCatIds.has(validCatId)) {
        validCatId = defaultCatId || null
      }

      newTxsToInsert.push({
        id: t.id,
        type: t.type,
        transaction_date: t.transaction_date,
        category_id: validCatId,
        source: t.source || null,
        amount: Number(t.amount),
        description: t.description || null,
        created_by: safeUserId(t.created_by),
        is_deleted: t.is_deleted ?? false,
        created_at: t.created_at || new Date().toISOString(),
      })
    }

    // Insert transaksi dalam batch (misal 50 transaksi per batch)
    const BATCH_SIZE = 50
    for (let i = 0; i < newTxsToInsert.length; i += BATCH_SIZE) {
      const batch = newTxsToInsert.slice(i, i + BATCH_SIZE)
      const { error: batchErr } = await supabase.from('transactions').insert(batch)
      if (batchErr) {
        throw new Error(`Gagal memulihkan sebagian transaksi (Batch ${i + 1}): ${batchErr.message}`)
      }
      restoredTxCount += batch.length
    }

    // LANGKAH 5: Metadata Foto Nota (Receipts)
    const backupReceipts = rawBackup.transaction_receipts || []
    if (backupReceipts.length > 0) {
      const { data: currentReceipts } = await supabase.from('transaction_receipts').select('id')
      const existingReceiptIds = new Set((currentReceipts || []).map(r => r.id))

      const receiptsToInsert = []
      for (const r of backupReceipts) {
        if (!existingReceiptIds.has(r.id)) {
          receiptsToInsert.push({
            id: r.id,
            transaction_id: r.transaction_id,
            storage_path: r.storage_path,
            file_name: r.file_name || null,
            file_size: r.file_size || null,
            mime_type: r.mime_type || null,
            uploaded_by: safeUserId(r.uploaded_by),
          })
        }
      }

      if (receiptsToInsert.length > 0) {
        // Abaikan error pada metadata nota jika file fisik hilang
        try {
          await supabase.from('transaction_receipts').insert(receiptsToInsert)
        } catch {
          // Non-blocking
        }
      }
    }

    // LANGKAH 6: Audit Log Aktivitas Pemulihan
    await logAudit(currentUserId, 'RESTORE_BACKUP', 'system', null, null, {
      restoredTxCount,
      skippedTxCount,
      restoredDebtsCount,
      restoredCatsCount,
      exportedAt: inspectionReport.exportedAt,
    })

    return {
      success: true,
      restoredTxCount,
      skippedTxCount,
      restoredDebtsCount,
      restoredCatsCount,
    }
  },
}
