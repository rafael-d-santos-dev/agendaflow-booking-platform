/**
 * AgendaFlow — Common Form Input Component
 * Accessible labels, clear validation errors, and editorial luxury styling
 */

import React, { InputHTMLAttributes, forwardRef, useId } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31]"
          >
            {label}
            {props.required && <span className="text-[#8C4336] ml-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3.5 text-[#80664F] pointer-events-none flex items-center">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] placeholder:text-[#80664F]/50 text-sm px-4 py-2.5 rounded-sm border transition-colors duration-200 outline-none
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${error ? 'border-[#8C4336] focus:border-[#8C4336] focus:ring-1 focus:ring-[#8C4336]' : 'border-[#D8C3A5] focus:border-[#B58A55] focus:ring-1 focus:ring-[#B58A55]'}
              ${disabled ? 'opacity-50 cursor-not-allowed bg-[#EFE5D5]' : 'hover:border-[#80664F]/60'}
              ${className}
            `}
            {...props}
          />

          {rightIcon && (
            <span className="absolute right-3.5 text-[#80664F] pointer-events-none flex items-center">
              {rightIcon}
            </span>
          )}
        </div>

        {error && (
          <p id={errorId} role="alert" className="text-xs text-[#8C4336] font-medium mt-0.5">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={helperId} className="text-xs text-[#594231] mt-0.5">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
