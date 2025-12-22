import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailChipsInputProps {
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  className?: string;
}

export function EmailChipsInput({
  value,
  onChange,
  placeholder = 'Add recipients...',
  label,
  required,
  error,
  className,
}: EmailChipsInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isValidEmail = (email: string): boolean => {
    return EMAIL_REGEX.test(email.trim());
  };

  const parseEmails = (text: string): string[] => {
    return text
      .split(/[\s,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0);
  };

  const addEmail = (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
  };

  const removeEmail = (email: string) => {
    onChange(value.filter(e => e !== email));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === ' ') {
      e.preventDefault();
      if (inputValue.trim()) {
        const emails = parseEmails(inputValue);
        const newEmails = emails.filter(e => !value.includes(e));
        if (newEmails.length > 0) {
          onChange([...value, ...newEmails]);
        }
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeEmail(value[value.length - 1]);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const emails = parseEmails(text);
    const newEmails = emails.filter(e => !value.includes(e));
    if (newEmails.length > 0) {
      onChange([...value, ...newEmails]);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      const emails = parseEmails(inputValue);
      const newEmails = emails.filter(e => !value.includes(e));
      if (newEmails.length > 0) {
        onChange([...value, ...newEmails]);
      }
      setInputValue('');
    }
  };

  const invalidEmails = value.filter(e => !isValidEmail(e));

  return (
    <div className={className}>
      {label && (
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <div
        className={cn(
          'flex flex-wrap gap-1.5 p-2 min-h-[42px] rounded-lg border bg-background transition-colors cursor-text',
          error ? 'border-destructive' : 'border-input hover:border-primary/50 focus-within:border-primary'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map(email => {
          const valid = isValidEmail(email);
          return (
            <span
              key={email}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium transition-colors',
                valid
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-destructive/10 text-destructive border border-destructive/20'
              )}
            >
              {email}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeEmail(email);
                }}
                className="hover:bg-black/10 rounded-full p-0.5"
                aria-label={`Remove ${email}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="email"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>
      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
      {invalidEmails.length > 0 && !error && (
        <p className="text-xs text-destructive mt-1">
          Invalid email{invalidEmails.length > 1 ? 's' : ''}: {invalidEmails.join(', ')}
        </p>
      )}
    </div>
  );
}
