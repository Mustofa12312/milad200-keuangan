import { format, parseISO, isValid } from 'date-fns'
import { id } from 'date-fns/locale'

export const formatCurrency = (amount, compact = false) => {
  const num = Number(amount) || 0
  if (compact && num >= 1_000_000) {
    return `Rp ${(num / 1_000_000).toFixed(1)}jt`
  }
  if (compact && num >= 1_000) {
    return `Rp ${(num / 1_000).toFixed(0)}rb`
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export const formatDate = (dateStr, fmt = 'dd MMM yyyy') => {
  if (!dateStr) return '-'
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    if (!isValid(date)) return '-'
    return format(date, fmt, { locale: id })
  } catch {
    return '-'
  }
}

export const formatDateTime = (dateStr) => {
  return formatDate(dateStr, 'dd MMM yyyy, HH:mm')
}

export const formatRelative = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return 'Baru saja'
  if (diff < hour) return `${Math.floor(diff / minute)} menit lalu`
  if (diff < day) return `${Math.floor(diff / hour)} jam lalu`
  if (diff < 7 * day) return `${Math.floor(diff / day)} hari lalu`
  return formatDate(dateStr)
}

export const parseCurrency = (str) => {
  return Number(String(str).replace(/[^0-9,-]/g, '').replace(',', '.')) || 0
}

export const truncate = (str, maxLen = 50) => {
  if (!str) return '-'
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
}

export const getStatusColor = (status) => {
  const map = {
    'LUNAS': 'badge-paid',
    'SEBAGIAN': 'badge-partial',
    'BELUM LUNAS': 'badge-unpaid',
    'INCOME': 'badge-income',
    'EXPENSE': 'badge-expense',
  }
  return map[status] || 'badge-debt'
}

export const getStatusLabel = (status) => {
  const map = {
    'LUNAS': 'Lunas',
    'SEBAGIAN': 'Sebagian',
    'BELUM LUNAS': 'Belum Lunas',
    'INCOME': 'Pemasukan',
    'EXPENSE': 'Pengeluaran',
  }
  return map[status] || status
}

export const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export const formatMonth = (dateStr) => {
  return formatDate(dateStr, 'MMMM yyyy')
}

export const formatYear = (dateStr) => {
  return formatDate(dateStr, 'yyyy')
}

export const formatNumber = (num) => {
  return Number(num || 0).toLocaleString('id-ID')
}

export const formatFileSize = (bytes) => {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const formatPercent = (value, total) => {
  if (!total || total === 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

