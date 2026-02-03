import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * A hook for managing debounced input state.
 * Maintains local state for immediate UI feedback while debouncing
 * the actual update callback to prevent race conditions.
 *
 * @param externalValue The current value from props/parent state
 * @param onUpdate Callback to call with the new value after debounce
 * @param delay Debounce delay in milliseconds (default: 300ms)
 * @returns Object containing localValue, onChange handler, and onBlur handler
 */
export function useDebouncedInput<T extends string | number>(
  externalValue: T,
  onUpdate: (value: T) => void,
  delay: number = 300
): {
  localValue: T;
  onChange: (value: T) => void;
  onBlur: () => void;
  isPending: boolean;
} {
  const [localValue, setLocalValue] = useState<T>(externalValue);
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const lastExternalValueRef = useRef(externalValue);
  const isLocalChangeRef = useRef(false);

  // Keep onUpdate ref current
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Sync local state with external value changes, but only if:
  // 1. The external value actually changed (not just a re-render)
  // 2. We're not in the middle of a local change
  useEffect(() => {
    // If external value changed and it wasn't from our own update
    if (externalValue !== lastExternalValueRef.current && !isLocalChangeRef.current) {
      setLocalValue(externalValue);
    }
    lastExternalValueRef.current = externalValue;
    isLocalChangeRef.current = false;
  }, [externalValue]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const onChange = useCallback((value: T) => {
    // Update local state immediately for responsive UI
    setLocalValue(value);
    setIsPending(true);
    isLocalChangeRef.current = true;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new debounced timeout
    timeoutRef.current = setTimeout(() => {
      onUpdateRef.current(value);
      setIsPending(false);
    }, delay);
  }, [delay]);

  const onBlur = useCallback(() => {
    // Flush any pending changes immediately on blur
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // Only call onUpdate if value differs from what was last sent
    if (isPending) {
      onUpdateRef.current(localValue);
      setIsPending(false);
    }
  }, [localValue, isPending]);

  return { localValue, onChange, onBlur, isPending };
}

/**
 * A hook for managing debounced textarea/text input with string values.
 * Convenience wrapper around useDebouncedInput for the most common use case.
 */
export function useDebouncedTextInput(
  externalValue: string,
  onUpdate: (value: string) => void,
  delay: number = 300
) {
  return useDebouncedInput(externalValue, onUpdate, delay);
}

/**
 * A hook for managing debounced number inputs.
 * Handles string-to-number conversion.
 */
export function useDebouncedNumberInput(
  externalValue: number,
  onUpdate: (value: number) => void,
  delay: number = 300,
  options: { min?: number; max?: number; allowFloat?: boolean } = {}
): {
  localValue: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  isPending: boolean;
} {
  const [localValue, setLocalValue] = useState<string>(String(externalValue));
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const lastExternalValueRef = useRef(externalValue);
  const isLocalChangeRef = useRef(false);

  // Keep onUpdate ref current
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Sync local state with external value changes
  useEffect(() => {
    if (externalValue !== lastExternalValueRef.current && !isLocalChangeRef.current) {
      setLocalValue(String(externalValue));
    }
    lastExternalValueRef.current = externalValue;
    isLocalChangeRef.current = false;
  }, [externalValue]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const parseValue = useCallback((value: string): number => {
    let num = options.allowFloat ? parseFloat(value) : parseInt(value, 10);
    if (isNaN(num)) num = 0;
    if (options.min !== undefined && num < options.min) num = options.min;
    if (options.max !== undefined && num > options.max) num = options.max;
    return num;
  }, [options.min, options.max, options.allowFloat]);

  const onChange = useCallback((value: string) => {
    setLocalValue(value);
    setIsPending(true);
    isLocalChangeRef.current = true;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onUpdateRef.current(parseValue(value));
      setIsPending(false);
    }, delay);
  }, [delay, parseValue]);

  const onBlur = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (isPending) {
      const num = parseValue(localValue);
      onUpdateRef.current(num);
      setLocalValue(String(num)); // Normalize the display value
      setIsPending(false);
    }
  }, [localValue, isPending, parseValue]);

  return { localValue, onChange, onBlur, isPending };
}
