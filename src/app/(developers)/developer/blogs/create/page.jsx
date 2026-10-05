'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BlogForm from 'src/component/marketing/developer/forms/BlogForm';

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
    <div className="w-full space-y-4">
      {/* Header and Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Link href="/developer" className="hover:text-slate-800">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/developer/blogs" className="hover:text-slate-800">
              Blogs
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">New Article</span>
          </div>

          <h1 className="text-base font-semibold text-slate-900">
            Create New Article
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Draft a new company announcement, educational article, or product guide.
          </p>
        </div>

        <Link
          href="/developer/blogs"
          className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors self-start sm:self-auto"
        >
          Back to Blogs
        </Link>
      </div>

      {/* Direct Create Form */}
      <div className="bg-white border border-slate-200 rounded p-4">
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
