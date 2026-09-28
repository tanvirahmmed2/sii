'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';
import {
  BiBold,
  BiItalic,
  BiStrikethrough,
  BiCode,
  BiCodeBlock,
  BiListUl,
  BiListOl,
  BiParagraph,
  BiUndo,
  BiRedo,
  BiReset,
} from 'react-icons/bi';

export default function TiptapEditor({
  value = '',
  onChange,
  placeholder = 'Write detailed description...',
  minHeight = '180px',
  editable = true,
  className = '',
}) {
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-secondary underline hover:text-secondary-dark font-medium cursor-pointer',
        },
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // If it's just an empty paragraph `<p></p>`, treat as empty string
      const isEmpty = editor.isEmpty;
      if (onChange) {
        onChange(isEmpty ? '' : html);
      }
    },
    editorProps: {
      attributes: {
        class:
          'focus:outline-none px-4 py-3 text-slate-800 dark:text-slate-100 text-sm leading-relaxed prose prose-slate dark:prose-invert max-w-none min-h-[160px]',
      },
    },
  });

  // Keep internal content in sync when external `value` changes (e.g. form reset or initial load)
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
      <div
        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs text-slate-400 dark:text-slate-500 animate-pulse flex items-center justify-center"
        style={{ minHeight }}
      >
        Loading rich text editor...
      </div>
    );
  }

  return (
    <div
      className={`tiptap-container bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:border-secondary focus-within:bg-white dark:focus-within:bg-slate-800 transition-all shadow-xs ${className}`}
    >
      {/* Editor Toolbar */}
      <div className="bg-slate-100/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 px-2 py-1.5 flex flex-wrap items-center gap-1">
        {/* Headings */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`px-2 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            editor.isActive('paragraph')
              ? 'bg-secondary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700'
          }`}
          title="Normal Paragraph"
        >
          <BiParagraph className="text-sm inline mr-0.5" /> Normal
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-secondary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700'
          }`}
          title="Heading 2"
        >
          H2
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-secondary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700'
          }`}
          title="Heading 3"
        >
          H3
        </button>

        <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

        {/* Text formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`p-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            editor.isActive('bold')
              ? 'bg-secondary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700'
          }`}
          title="Bold (Ctrl+B)"
        >
          <BiBold className="text-base" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`p-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            editor.isActive('italic')
              ? 'bg-secondary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700'
          }`}
          title="Italic (Ctrl+I)"
        >
          <BiItalic className="text-base" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`p-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            editor.isActive('strike')
              ? 'bg-secondary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700'
          }`}
          title="Strikethrough"
        >
          <BiStrikethrough className="text-base" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!editor.can().chain().focus().toggleCode().run()}
          className={`p-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            editor.isActive('code')
              ? 'bg-secondary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700'
          }`}
          title="Inline Code"
        >
          <BiCode className="text-base" />
        </button>

        <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

        {/* Lists & Blocks */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            editor.isActive('bulletList')
              ? 'bg-secondary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700'
          }`}
          title="Bullet List"
        >
          <BiListUl className="text-base" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            editor.isActive('orderedList')
              ? 'bg-secondary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700'
          }`}
          title="Ordered List"
        >
          <BiListOl className="text-base" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            editor.isActive('codeBlock')
              ? 'bg-secondary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700'
          }`}
          title="Code Block"
        >
          <BiCodeBlock className="text-base" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-2 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            editor.isActive('blockquote')
              ? 'bg-secondary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700'
          }`}
          title="Quote"
        >
          &ldquo; Quote
        </button>

        <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

        {/* Undo / Redo / Clear */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="p-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer"
          title="Undo (Ctrl+Z)"
        >
          <BiUndo className="text-base" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="p-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer"
          title="Redo (Ctrl+Y)"
        >
          <BiRedo className="text-base" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          className="p-1.5 text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer ml-auto"
          title="Clear formatting"
        >
          <BiReset className="text-base" />
        </button>
      </div>

      {/* Editor Content Body with Embedded Styling */}
      <div className="tiptap-content" style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .tiptap-container .ProseMirror {
          min-height: ${minHeight};
          outline: none;
        }
        .tiptap-container .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #94a3b8;
          pointer-events: none;
          height: 0;
        }
        html.dark .tiptap-container .ProseMirror p.is-editor-empty:first-child::before {
          color: #64748b;
        }
        .tiptap-container .ProseMirror h1 {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          margin-top: 0.8rem;
          margin-bottom: 0.4rem;
          line-height: 1.25;
        }
        html.dark .tiptap-container .ProseMirror h1 {
          color: #f8fafc;
        }
        .tiptap-container .ProseMirror h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
          margin-top: 0.7rem;
          margin-bottom: 0.35rem;
          line-height: 1.3;
        }
        html.dark .tiptap-container .ProseMirror h2 {
          color: #f1f5f9;
        }
        .tiptap-container .ProseMirror h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #334155;
          margin-top: 0.6rem;
          margin-bottom: 0.3rem;
        }
        html.dark .tiptap-container .ProseMirror h3 {
          color: #e2e8f0;
        }
        .tiptap-container .ProseMirror p {
          margin-top: 0.35rem;
          margin-bottom: 0.35rem;
          color: #1e293b;
          line-height: 1.6;
        }
        html.dark .tiptap-container .ProseMirror p {
          color: #cbd5e1;
        }
        .tiptap-container .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.4rem;
          margin-top: 0.4rem;
          margin-bottom: 0.4rem;
        }
        .tiptap-container .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.4rem;
          margin-top: 0.4rem;
          margin-bottom: 0.4rem;
        }
        .tiptap-container .ProseMirror li {
          margin-top: 0.2rem;
          margin-bottom: 0.2rem;
        }
        .tiptap-container .ProseMirror blockquote {
          border-left: 3px solid #cc3a63;
          padding-left: 0.85rem;
          font-style: italic;
          color: #475569;
          margin: 0.6rem 0;
        }
        html.dark .tiptap-container .ProseMirror blockquote {
          border-left-color: #cc3a63;
          color: #94a3b8;
        }
        .tiptap-container .ProseMirror code {
          background-color: #f1f5f9;
          color: #0f172a;
          padding: 0.15rem 0.35rem;
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.85em;
        }
        html.dark .tiptap-container .ProseMirror code {
          background-color: #1e293b;
          color: #e48ea6;
        }
        .tiptap-container .ProseMirror pre {
          background: #0f172a;
          color: #f8fafc;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          margin: 0.6rem 0;
          overflow-x: auto;
          font-family: monospace;
          font-size: 0.85em;
        }
        html.dark .tiptap-container .ProseMirror pre {
          background: #020617;
          color: #f8fafc;
        }
        .tiptap-container .ProseMirror pre code {
          background: transparent;
          color: inherit;
          padding: 0;
        }
      `}</style>
    </div>
  );
}
