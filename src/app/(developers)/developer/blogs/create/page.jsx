'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BlogForm from 'src/component/marketing/developer/forms/BlogForm';
import { BiBookContent, BiArrowBack } from 'react-icons/bi';

export default function CreateBlogPage() {
  const router = useRouter();

  const handleCreateSuccess = (newBlog) => {
    if (newBlog?.id) {
      router.push(`/developer/blogs/${newBlog.id}`);
    } else {
      router.push('/developer/blogs');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header and Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 sm:p-8 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-normal text-slate-500 dark:text-slate-400">
            <Link href="/developer" className="hover:text-blue-600 dark:hover:text-blue-400">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/developer/blogs" className="hover:text-blue-600 dark:hover:text-blue-400">
              Blogs
            </Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200">New Article</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 flex items-center justify-center text-xl shrink-0">
              <BiBookContent />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-medium text-slate-900 dark:text-white tracking-tight">
                Create New Article
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Draft a new company announcement, educational article, or product guide.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/developer/blogs"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-all self-start sm:self-auto"
        >
          <BiArrowBack className="text-sm" />
          <span>Back to Blogs</span>
        </Link>
      </div>

      {/* Direct Create Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 sm:p-8 shadow-xs">
        <BlogForm
          blog={null}
          initialData={null}
          onSuccess={handleCreateSuccess}
          onCancel={() => router.push('/developer/blogs')}
        />
      </div>
    </div>
  );
}
