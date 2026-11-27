import React from 'react';
import Image from 'next/image';
import { BiUser, BiStar, BiCheckShield, BiCube } from 'react-icons/bi';
export default function Review({ review }: any) {
  if (!review)
    return null;
  const name = review.creator_name || review.reviewer_name || review.name || 'Verified Client';
  const avatar = review.creator_avatar || null;
  const rating = Number(review.rating || 5);
  const packageName = review.package_name || review.institution_name || review.country || 'Subscriber';
  return (<div className="w-[320px] sm:w-[380px] bg-slate-50 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 rounded-3xl p-6 flex flex-col justify-between gap-4 shrink-0 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all">
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex text-amber-400 text-sm">
          {[1, 2, 3, 4, 5].map((s: any) => (<BiStar key={s} className={s <= rating ? 'fill-current' : 'opacity-25'} />))}
        </div>

      </div>

      {review.title && (<h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
        {review.title}
      </h4>)}

      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic line-clamp-4 min-h-[4.5rem]">
        &ldquo;{review.comment || review.review_text}&rdquo;
      </p>
    </div>

    <div className="pt-3 border-t border-slate-200/70 dark:border-slate-700/80 flex items-center gap-3">
      {avatar ? (<Image src={avatar} alt={name} width={36} height={36} className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0" />) : (<div className="w-9 h-9 rounded-full bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
        {name.charAt(0).toUpperCase()}
      </div>)}

      <div className="flex flex-col min-w-0">
        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{name}</p>

      </div>
    </div>
  </div>);
}
