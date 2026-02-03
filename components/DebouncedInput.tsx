import React, { useState, useEffect, useRef, useCallback } from 'react';

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onDebouncedChange: (value: string) => void;
  debounceMs?: number;
}

/**
 * A text input component that debounces onChange events.
 * Maintains local state for immediate UI feedback while debouncing
 * the actual update callback to prevent race conditions.
 */
export const DebouncedInput: React.FC<DebouncedInputProps> = ({
  value: externalValue,
  onDebouncedChange,
  debounceMs = 300,
  onBlur,
  ...props
}) => {
  const [localValue, setLocalValue] = useState(externalValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDebouncedChangeRef = useRef(onDebouncedChange);
  const lastExternalValueRef = useRef(externalValue);
  const isLocalChangeRef = useRef(false);
  const pendingValueRef = useRef<string | null>(null);

  // Keep callback ref current
  useEffect(() => {
    onDebouncedChangeRef.current = onDebouncedChange;
  }, [onDebouncedChange]);

  // Sync local state with external value changes (but not during local edits)
  useEffect(() => {
    if (externalValue !== lastExternalValueRef.current && !isLocalChangeRef.current) {
      setLocalValue(externalValue);
      pendingValueRef.current = null;
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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    pendingValueRef.current = newValue;
    isLocalChangeRef.current = true;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onDebouncedChangeRef.current(newValue);
      pendingValueRef.current = null;
    }, debounceMs);
  }, [debounceMs]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Flush pending changes on blur
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (pendingValueRef.current !== null) {
      onDebouncedChangeRef.current(pendingValueRef.current);
      pendingValueRef.current = null;
    }
    // Call original onBlur if provided
    onBlur?.(e);
  }, [onBlur]);

  return (
    <input
      {...props}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

interface DebouncedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  value: string;
  onDebouncedChange: (value: string) => void;
  debounceMs?: number;
}

/**
 * A textarea component that debounces onChange events.
 * Maintains local state for immediate UI feedback while debouncing
 * the actual update callback to prevent race conditions.
 */
export const DebouncedTextarea: React.FC<DebouncedTextareaProps> = ({
  value: externalValue,
  onDebouncedChange,
  debounceMs = 300,
  onBlur,
  ...props
}) => {
  const [localValue, setLocalValue] = useState(externalValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDebouncedChangeRef = useRef(onDebouncedChange);
  const lastExternalValueRef = useRef(externalValue);
  const isLocalChangeRef = useRef(false);
  const pendingValueRef = useRef<string | null>(null);

  // Keep callback ref current
  useEffect(() => {
    onDebouncedChangeRef.current = onDebouncedChange;
  }, [onDebouncedChange]);

  // Sync local state with external value changes (but not during local edits)
  useEffect(() => {
    if (externalValue !== lastExternalValueRef.current && !isLocalChangeRef.current) {
      setLocalValue(externalValue);
      pendingValueRef.current = null;
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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    pendingValueRef.current = newValue;
    isLocalChangeRef.current = true;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onDebouncedChangeRef.current(newValue);
      pendingValueRef.current = null;
    }, debounceMs);
  }, [debounceMs]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Flush pending changes on blur
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (pendingValueRef.current !== null) {
      onDebouncedChangeRef.current(pendingValueRef.current);
      pendingValueRef.current = null;
    }
    // Call original onBlur if provided
    onBlur?.(e);
  }, [onBlur]);

  return (
    <textarea
      {...props}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

interface DebouncedNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: number;
  onDebouncedChange: (value: number) => void;
  debounceMs?: number;
  allowFloat?: boolean;
}

/**
 * A number input component that debounces onChange events.
 * Maintains local state for immediate UI feedback while debouncing
 * the actual update callback to prevent race conditions.
 */
export const DebouncedNumberInput: React.FC<DebouncedNumberInputProps> = ({
  value: externalValue,
  onDebouncedChange,
  debounceMs = 300,
  allowFloat = false,
  min,
  max,
  onBlur,
  ...props
}) => {
  const [localValue, setLocalValue] = useState(String(externalValue));
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDebouncedChangeRef = useRef(onDebouncedChange);
  const lastExternalValueRef = useRef(externalValue);
  const isLocalChangeRef = useRef(false);
  const pendingValueRef = useRef<string | null>(null);

  // Keep callback ref current
  useEffect(() => {
    onDebouncedChangeRef.current = onDebouncedChange;
  }, [onDebouncedChange]);

  // Sync local state with external value changes (but not during local edits)
  useEffect(() => {
    if (externalValue !== lastExternalValueRef.current && !isLocalChangeRef.current) {
      setLocalValue(String(externalValue));
      pendingValueRef.current = null;
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
    let num = allowFloat ? parseFloat(value) : parseInt(value, 10);
    if (isNaN(num)) num = 0;
    if (min !== undefined && num < Number(min)) num = Number(min);
    if (max !== undefined && num > Number(max)) num = Number(max);
    return num;
  }, [min, max, allowFloat]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    pendingValueRef.current = newValue;
    isLocalChangeRef.current = true;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onDebouncedChangeRef.current(parseValue(newValue));
      pendingValueRef.current = null;
    }, debounceMs);
  }, [debounceMs, parseValue]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Flush pending changes on blur
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (pendingValueRef.current !== null) {
      const numValue = parseValue(pendingValueRef.current);
      onDebouncedChangeRef.current(numValue);
      setLocalValue(String(numValue)); // Normalize display
      pendingValueRef.current = null;
    }
    // Call original onBlur if provided
    onBlur?.(e);
  }, [onBlur, parseValue]);

  return (
    <input
      {...props}
      type="number"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      min={min}
      max={max}
    />
  );
};
