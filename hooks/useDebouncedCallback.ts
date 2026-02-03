import { useRef, useCallback, useEffect } from 'react';

/**
 * A hook that returns a debounced version of the callback.
 * The callback will only be called after the specified delay has passed
 * since the last invocation.
 *
 * @param callback The function to debounce
 * @param delay The debounce delay in milliseconds
 * @returns A debounced version of the callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);
}

/**
 * A hook that returns a debounced callback that can also be flushed immediately.
 * Useful for scenarios where you want debouncing but also need to flush on blur.
 */
export function useDebouncedCallbackWithFlush<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): {
  debouncedCallback: (...args: Parameters<T>) => void;
  flush: () => void;
  cancel: () => void;
} {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  const pendingArgsRef = useRef<Parameters<T> | null>(null);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    pendingArgsRef.current = args;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (pendingArgsRef.current) {
        callbackRef.current(...pendingArgsRef.current);
        pendingArgsRef.current = null;
      }
    }, delay);
  }, [delay]);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (pendingArgsRef.current) {
      callbackRef.current(...pendingArgsRef.current);
      pendingArgsRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingArgsRef.current = null;
  }, []);

  return { debouncedCallback, flush, cancel };
}
