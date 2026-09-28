import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Debounce a value by given delay
 */
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

/**
 * Pagination state management
 */
export function usePagination(initialPage = 1) {
  const [page, setPage] = useState(initialPage)

  const resetPage = useCallback(() => setPage(1), [])

  return { page, setPage, resetPage }
}

/**
 * Toggle boolean state
 */
export function useToggle(initial = false) {
  const [state, setState] = useState(initial)
  const toggle = useCallback(() => setState(s => !s), [])
  const set = useCallback((v) => setState(v), [])
  return [state, toggle, set]
}

/**
 * Previous value for comparisons
 */
export function usePrevious(value) {
  const ref = useRef()
  useEffect(() => { ref.current = value }, [value])
  return ref.current
}

/**
 * Local storage state with JSON serialize/deserialize
 */
export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const setStoredValue = useCallback((newValue) => {
    setValue(newValue)
    try {
      window.localStorage.setItem(key, JSON.stringify(newValue))
    } catch {
      // ignore
    }
  }, [key])

  return [value, setStoredValue]
}

/**
 * Click outside to close
 */
export function useClickOutside(ref, callback) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        callback()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, callback])
}
