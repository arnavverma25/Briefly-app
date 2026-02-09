import React, { useState } from 'react';
import { Article } from '../types';
import { TrashIcon, LinkIcon, DocumentTextIcon } from './Icons';

// Helper to validate URL
const getUrlValidationError = (string: string): string | null => {
  try {
    const url = new URL(string);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "URL must start with http:// or https://";
    }
    if (!url.hostname.includes('.')) {
      return "Domain name seems incomplete";
    }
    return null;
  } catch (_) {
    return "Invalid URL format";
  }
};

interface ArticleCardProps {
  article: Article;
  index: number;
  onUpdate: (updates: Partial<Article>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, index, onUpdate, onRemove, canRemove }) => {
  const [isExpanded, setIsExpanded] = useState(!article.content);

  const urlError = article.type === 'url' && article.content.length > 0 ? getUrlValidationError(article.content) : null;
  const isUrlValid = article.type === 'url' && article.content.length > 0 && !urlError;

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 transition-all duration-300 overflow-hidden ${isExpanded ? 'ring-2 ring-slate-50 shadow-md' : ''}`}>
      {/* Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 transition-colors select-none"
      >
        <div className="flex items-center gap-3 overflow-hidden">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                article.type === 'url' ? 'bg-cyan-100 text-cyan-600' : 'bg-indigo-100 text-indigo-600'
            }`}>
                {article.type === 'url' ? <LinkIcon className="w-4 h-4" /> : <DocumentTextIcon className="w-4 h-4" />}
            </div>
            <div className="min-w-0 flex flex-col justify-center">
                <h3 className="text-sm font-bold text-slate-700 leading-tight">Article {index + 1}</h3>
                {!isExpanded && article.content && (
                    <span className={`text-xs truncate max-w-[200px] leading-tight ${urlError ? 'text-red-400' : 'text-slate-400'}`}>
                        {article.type === 'url' ? article.content : article.content.substring(0, 30) + '...'}
                    </span>
                )}
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            {article.isProcessing && (
               <div className="flex items-center gap-2 mr-1 bg-cyan-50 px-2 py-1 rounded-full border border-cyan-100">
                  <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] font-bold text-cyan-600 hidden sm:inline whitespace-nowrap">Fetching content...</span>
               </div>
            )}

            {canRemove && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                    title="Remove article"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            )}
            <div className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
            </div>
        </div>
      </div>

      {/* Expanded Content */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
         <div className="px-4 pb-4 pt-0">
            <div className="flex gap-4 mb-3 text-xs font-bold text-slate-400 border-b border-slate-100 pb-2">
                 <button 
                    onClick={() => onUpdate({ type: 'text' })}
                    className={`flex items-center gap-1.5 transition-colors ${article.type === 'text' ? 'text-indigo-600' : 'hover:text-slate-600'}`}
                 >
                    <span className={`w-2 h-2 rounded-full ${article.type === 'text' ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                    Text
                 </button>
                 <button 
                    onClick={() => onUpdate({ type: 'url' })}
                    className={`flex items-center gap-1.5 transition-colors ${article.type === 'url' ? 'text-cyan-600' : 'hover:text-slate-600'}`}
                 >
                    <span className={`w-2 h-2 rounded-full ${article.type === 'url' ? 'bg-cyan-600' : 'bg-slate-300'}`} />
                    URL
                 </button>
            </div>

            {article.type === 'text' ? (
                <textarea
                    className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-y leading-relaxed"
                    placeholder="Paste the article text here..."
                    value={article.content}
                    onChange={(e) => onUpdate({ content: e.target.value })}
                />
            ) : (
                <div className="relative pb-5">
                    <div className={`absolute top-3 left-0 pl-3 flex items-center pointer-events-none ${
                        urlError ? 'text-red-400' : isUrlValid ? 'text-green-500' : 'text-slate-400'
                    }`}>
                        <LinkIcon className="w-4 h-4" />
                    </div>
                    <input
                        type="url"
                        className={`w-full pl-10 pr-3 py-3 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all ${
                            urlError 
                            ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500' 
                            : isUrlValid
                            ? 'border-green-300 focus:border-green-500 focus:ring-1 focus:ring-green-500'
                            : 'border-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                        }`}
                        placeholder="https://news.site/article"
                        value={article.content}
                        onChange={(e) => onUpdate({ content: e.target.value })}
                    />
                    {urlError && (
                        <div className="absolute left-1 bottom-0 text-[10px] font-bold text-red-500 flex items-center gap-1 animate-pulse">
                            <span>•</span>
                            {urlError}
                        </div>
                    )}
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default ArticleCard;