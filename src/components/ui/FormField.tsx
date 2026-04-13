import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

interface BaseFieldProps {
  label: string;
  error?: string;
  required?: boolean;
}

interface InputFieldProps extends BaseFieldProps, InputHTMLAttributes<HTMLInputElement> {
  as?: 'input';
}

interface SelectFieldProps extends BaseFieldProps, SelectHTMLAttributes<HTMLSelectElement> {
  as: 'select';
  children: ReactNode;
}

interface TextareaFieldProps extends BaseFieldProps, TextareaHTMLAttributes<HTMLTextAreaElement> {
  as: 'textarea';
}

type FormFieldProps = InputFieldProps | SelectFieldProps | TextareaFieldProps;

export default function FormField(props: FormFieldProps) {
  const { label, error, required, as = 'input', ...rest } = props;
  const id = rest.id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {as === 'select' ? (
        <select
          id={id}
          className={`input ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
          {...(rest as SelectHTMLAttributes<HTMLSelectElement>)}
        >
          {(props as SelectFieldProps).children}
        </select>
      ) : as === 'textarea' ? (
        <textarea
          id={id}
          className={`input min-h-[80px] ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={id}
          className={`input ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
