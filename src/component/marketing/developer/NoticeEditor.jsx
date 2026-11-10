'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  FiBold,
  FiItalic,
  FiList,
  FiCode,
  FiRotateCcw,
  FiRotateCw
} from 'react-icons/fi';

export default function NoticeEditor({ value = '', onChange }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (onChange) {
        onChange(editor.isEmpty ? '' : html);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-xs dark:prose-invert max-w-none focus:outline-hidden min-h-[160px] p-3 text-xs leading-relaxed text-slate-800 dark:text-slate-100',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    const cleanValue = value || '';
    if (cleanValue !== currentHtml && (cleanValue || !editor.isEmpty)) {
      editor.commands.setContent(cleanValue, false);
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-4 text-xs text-slate-400">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="w-full border border-slate-200 dark:border-slate-700 rounded overflow-hidden bg-white dark:bg-slate-800 transition-colors">
      <div className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-xs">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          title="Heading 2"
        >
          H2
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          title="Heading 3"
        >
          H3
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
            editor.isActive('paragraph')
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          title="Paragraph"
        >
          P
        </button>

        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive('bold')
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          title="Bold"
        >
          <FiBold className="text-xs" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive('italic')
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          title="Italic"
        >
          <FiItalic className="text-xs" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`px-1.5 py-1 rounded text-xs line-through transition-colors cursor-pointer ${
            editor.isActive('strike')
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          title="Strike"
        >
          S
        </button>

        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive('bulletList')
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          title="Bullet List"
        >
          <FiList className="text-xs" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-1.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
            editor.isActive('orderedList')
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          title="Numbered List"
        >
          1.
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-1.5 py-1 rounded text-xs font-serif italic transition-colors cursor-pointer ${
            editor.isActive('blockquote')
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          title="Blockquote"
        >
          &ldquo;
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive('codeBlock')
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          title="Code Block"
        >
          <FiCode className="text-xs" />
        </button>

        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer transition-colors"
          title="Undo"
        >
          <FiRotateCcw className="text-xs" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer transition-colors"
          title="Redo"
        >
          <FiRotateCw className="text-xs" />
        </button>
      </div>

      <div className="notice-tiptap-editor min-h-[160px]">
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .notice-tiptap-editor .ProseMirror {
          min-height: 160px;
          outline: none;
        }
        .notice-tiptap-editor .ProseMirror h2 {
          font-size: 1.15rem;
          font-weight: 700;
          margin-top: 0.6rem;
          margin-bottom: 0.3rem;
          line-height: 1.3;
        }
        .notice-tiptap-editor .ProseMirror h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-top: 0.5rem;
          margin-bottom: 0.25rem;
        }
        .notice-tiptap-editor .ProseMirror p {
          margin-top: 0.3rem;
          margin-bottom: 0.3rem;
          line-height: 1.5;
        }
        .notice-tiptap-editor .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.3rem;
          margin-top: 0.3rem;
          margin-bottom: 0.3rem;
        }
        .notice-tiptap-editor .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.3rem;
          margin-top: 0.3rem;
          margin-bottom: 0.3rem;
        }
        .notice-tiptap-editor .ProseMirror blockquote {
          border-left: 3px solid #64748b;
          padding-left: 0.75rem;
          font-style: italic;
          margin: 0.5rem 0;
          color: #64748b;
        }
        .notice-tiptap-editor .ProseMirror pre {
          background-color: #0f172a;
          color: #f8fafc;
          padding: 0.6rem 0.8rem;
          border-radius: 0.375rem;
          margin: 0.5rem 0;
          font-family: monospace;
          font-size: 0.85em;
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
}

