'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiPlusCircle, FiArrowRight } from 'react-icons/fi';
import TiptapEditor from 'src/component/helper/TiptapEditor';
import Image from 'next/image';


const AdminForm = ({ title, fields = [], apiEndpoint, onSuccess, onCancel, icon: Icon = FiPlusCircle }) => {
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const initialData = {};
    fields.forEach(field => {
      initialData[field.name] = field.defaultValue || '';
    });
    setFormData(initialData);
  }, [fields]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [name]: reader.result }));
      };
      reader.onerror = () => {
        toast.error('Failed to read image file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    for (const field of fields) {
      if (field.required && !formData[field.name]) {
        toast.error(`${field.label} is required.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Failed to submit form data.');
      }

      toast.success(resData.message || 'Form submitted successfully!');
      
      const clearedData = {};
      fields.forEach(field => {
        clearedData[field.name] = field.defaultValue || '';
      });
      setFormData(clearedData);
      
      const fileInputs = e.target.querySelectorAll('input[type="file"]');
      fileInputs.forEach(input => {
        input.value = '';
      });

      if (onSuccess) onSuccess(resData);
    } catch (err) {
      console.error('Form submission error:', err);
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.02)] animate-fade-up">
      <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
        <Icon className="text-tertiary text-xl" /> {title}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {fields.map((field) => {
            const isFullWidth = field.type === 'textarea' || field.fullWidth;
            
            return (
              <div key={field.name} className={`flex flex-col gap-1.5 ${isFullWidth ? 'md:col-span-2' : ''}`}>
                <label className="text-[10px] font-bold text-tertiary uppercase tracking-wider pl-1">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>

                {field.type === 'textarea' ? (
                  <TiptapEditor
                    value={formData[field.name] || ''}
                    onChange={(val) => setFormData(prev => ({ ...prev, [field.name]: val }))}
                  />
                ) : field.type === 'select' ? (
                  <select
                    name={field.name}
                    value={formData[field.name] || ''}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-primary rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none transition-colors"
                  >
                    <option value="" disabled>{field.placeholder || 'Select option'}</option>
                    {field.options && field.options.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'file' ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      name={field.name}
                      onChange={handleFileChange}
                      className="w-full text-xs text-secondary file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-light file:text-secondary hover:file:bg-primary-light cursor-pointer"
                    />
                    {formData[field.name] && (
                      <div className="w-24 h-24 relative rounded-xl overflow-hidden border border-slate-100 mt-1">
                        <Image width={500} height={500}
                          src={formData[field.name]} 
                          alt="Upload preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type={field.type || 'text'}
                    name={field.name}
                    value={formData[field.name] || ''}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200  rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none transition-colors"
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-slate-50">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>Publish Details</span>
                <FiArrowRight />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminForm;
