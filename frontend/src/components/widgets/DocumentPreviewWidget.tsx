"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface Document {
  name: string;
  type: string;
}

interface DocumentPreviewWidgetProps {
  data?: {
    documents?: Document[];
  };
}

export function DocumentPreviewWidget({ data }: DocumentPreviewWidgetProps) {
  const documents = data?.documents || [
    { name: 'Contract Letter', type: 'pdf' },
    { name: 'Promissory Note', type: 'pdf' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-sm mt-3"
    >
      <div
        className="rounded-3xl p-5 shadow-sm border border-slate-100"
        style={{
          backgroundColor: '#FFFFFF',
          backgroundImage: 'linear-gradient(125.41deg, rgba(185, 220, 242, 0.12) -6.53%, rgba(235, 244, 245, 0.12) 110.14%)'
        }}
      >
        {/* Document Thumbnails */}
        <div className="flex gap-4 mb-5">
          {documents.map((doc, idx) => (
            <motion.div
              key={doc.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.15 }}
              className="flex-1"
            >
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 relative">
                {/* Mock document preview */}
                <div className="bg-white rounded-lg p-2 mb-2 min-h-[80px] flex flex-col gap-1">
                  <div className="w-3/4 h-1.5 bg-slate-200 rounded-full" />
                  <div className="w-full h-1 bg-slate-100 rounded-full" />
                  <div className="w-5/6 h-1 bg-slate-100 rounded-full" />
                  <div className="w-2/3 h-1 bg-slate-100 rounded-full" />
                  <div className="w-full h-1 bg-slate-100 rounded-full" />
                  <div className="w-4/5 h-1 bg-slate-100 rounded-full" />
                </div>
                {/* Download icon */}
                <button className="absolute top-3 right-3 text-slate-400 hover:text-slate-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-slate-600 font-medium truncate mt-1">{doc.name}</p>
            </motion.div>
          ))}
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            const event = new CustomEvent('mock-send-message', { detail: 'E-Sign via Nafath' });
            window.dispatchEvent(event);
          }}
          className="w-full py-3 text-white font-semibold rounded-full shadow-md hover:opacity-90 transition-all"
          style={{
            background: 'linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%)',
          }}
        >
          E-Sign via Nafath
        </button>
      </div>
    </motion.div>
  );
}
