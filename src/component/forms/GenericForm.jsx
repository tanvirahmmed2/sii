'use client';

import React from 'react';

const GenericForm = ({
  fields = [],
  values = {},
  onChange,
  onSubmit,
  submitText = 'Submit',
  submitting = false,
  cancelText,
  onCancel,
  readOnlySection,
  extraLink,
  gridClass = 'grid grid-cols-1 md:grid-cols-2 gap-5',
  focusClass = 'focus:border-primary focus:ring-primary/5',
}) => {
  return (
    <form onSubmit={onSubmit} className="w-full flex flex-col gap-5">
      {/* Read Only Details Section (optional) */}
      {readOnlySection && (
        <div className="w-full mb-1">
          {readOnlySection}
        </div>
      )}

      {/* Grid containing fields */}
      <div className={gridClass}>
        {fields.map((field) => {
          const {
            name,
            label,
            type = 'text',
            placeholder,
            required = false,
            options = [],
            rows = 2,
            colSpan = '',
            icon: Icon,
          } = field;

          const hasIcon = !!Icon;

          return (
            <div
              key={name}
              className={`flex flex-col gap-1.5 ${colSpan}`}
            >
              {label && (
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  {Icon && <Icon className="text-sm text-slate-400" />} {label}
                </label>
              )}

              {type === 'select' ? (
                <select
                  required={required}
                  value={values[name] || ''}
                  onChange={(e) => onChange(name, e.target.value)}
                  disabled={submitting}
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:ring-4 cursor-pointer disabled:opacity-50 ${focusClass}`}
                >
                  <option value="" disabled>-- Select {label || 'option'} --</option>
                  {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : type === 'textarea' ? (
                <textarea
                  required={required}
                  rows={rows}
                  value={values[name] || ''}
                  onChange={(e) => onChange(name, e.target.value)}
                  disabled={submitting}
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white focus:ring-4 resize-none disabled:opacity-50 ${focusClass}`}
                />
              ) : (
                <input
                  type={type}
                  required={required}
                  value={values[name] || ''}
                  onChange={(e) => onChange(name, e.target.value)}
                  disabled={submitting}
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white focus:ring-4 disabled:opacity-50 ${focusClass}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Extra Link/Content in form footer (like forgot password, register setups) */}
      {extraLink && (
        <div className="w-full">
          {extraLink}
        </div>
      )}

      {/* Actions (Buttons) */}
      <div className="flex justify-end gap-3 items-center mt-2">
        {onCancel && cancelText && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors duration-150 cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          {submitting ? (
            <div className="loader loader-sm loader-white" />
          ) : (
            submitText
          )}
        </button>
      </div>
    </form>
  );
};

export default GenericForm;
