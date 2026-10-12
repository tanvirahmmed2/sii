'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const TiptapEditor = ({ value, onChange, placeholder = 'Write description...' }) => {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'w-full min-h-[150px] max-h-[300px] overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all duration-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 focus:outline-none placeholder:text-slate-400',
      },
    },
  });

  // Keep editor content in sync with value prop (for edit modes/resets)
  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-6 flex justify-center items-center">
        <div className="loader loader-sm" />
      </div>
    );
  }

  return <EditorContent editor={editor} />;
};

export default TiptapEditor;
