import imageCompression from 'browser-image-compression'

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/webp',
  initialQuality: 0.8,
}

export const compressImage = async (file) => {
  if (!file) return null

  // Validate type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    throw new Error('Format foto tidak valid. Gunakan JPG, PNG, atau WEBP.')
  }

  // Validate size (max 10MB before compression)
  const maxSizeBytes = 10 * 1024 * 1024
  if (file.size > maxSizeBytes) {
    throw new Error('Ukuran foto terlalu besar. Maksimum 10MB.')
  }

  try {
    const compressed = await imageCompression(file, COMPRESSION_OPTIONS)
    // Convert to webp file
    const webpFile = new File([compressed], file.name.replace(/\.[^.]+$/, '.webp'), {
      type: 'image/webp',
    })
    return webpFile
  } catch (err) {
    console.error('Compression error:', err)
    // Fallback to original if compression fails
    return file
  }
}

export const createPreviewUrl = (file) => {
  return URL.createObjectURL(file)
}

export const revokePreviewUrl = (url) => {
  URL.revokeObjectURL(url)
}
