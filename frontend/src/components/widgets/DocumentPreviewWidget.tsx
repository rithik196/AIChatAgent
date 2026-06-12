"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { StepIndicator } from './StepIndicator';

interface Document {
  name: string;
  type: string;
  url?: string;
}

interface DocumentPreviewWidgetProps {
  data?: {
    documents?: Document[];
    title?: string;
    subtitle?: string;
    current_step?: number;
  };
}

export function DocumentPreviewWidget({ data }: DocumentPreviewWidgetProps) {
  const documents = data?.documents || [
    { name: 'Contract Letter', type: 'pdf', url: '/assets/Letter.pdf' },
    { name: 'Promissory Note', type: 'pdf', url: '/assets/Letter.pdf' },
  ];
  const title = data?.title || 'Digital Documents';
  const subtitle = data?.subtitle || 'Ready for E-Sign';
  const currentStep = data?.current_step || 4;

  const openDocument = (doc: Document) => {
    const url = doc.url || '/assets/Letter.pdf';
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const downloadDocument = (doc: Document) => {
    const url = doc.url || '/assets/Letter.pdf';
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] as [number, number, number, number], staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-sm mt-4"
    >
      <StepIndicator currentStep={currentStep} />
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-indigo-400">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight leading-tight">{title}</h3>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">{subtitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {documents.map((doc) => (
              <motion.div
                key={doc.name}
                variants={itemVariants}
                onClick={() => openDocument(doc)}
                className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3 relative group hover:bg-slate-700/50 transition-colors backdrop-blur-sm cursor-pointer"
              >
                <div className="bg-slate-900/50 rounded-xl p-2 mb-3 h-[70px] flex flex-col gap-1.5 justify-center items-center relative overflow-hidden border border-slate-800">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-blue-500/5" />
                  <svg className="w-8 h-8 text-indigo-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="absolute bottom-1 right-1.5 text-[8px] font-bold text-slate-500 uppercase">{doc.type}</span>
                </div>
                
                <button onClick={(e) => { e.stopPropagation(); downloadDocument(doc); }} className="absolute top-2 right-2 p-1.5 bg-slate-800/80 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white hover:bg-slate-700 border border-slate-600/50">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                
                <p className="text-[11px] text-slate-300 font-medium leading-tight line-clamp-2">{doc.name}</p>
              </motion.div>
            ))}
          </div>

          {/* Removed in-widget "Proceed to e-sign" button. Proceed action will be asked via chat. */}
        </div>
      </div>
    </motion.div>
  );
}
