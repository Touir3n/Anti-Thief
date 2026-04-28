import { motion } from 'motion/react';
import { X, Copy, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { toUpperCaseAccentFree } from '../lib/Typography';

interface ShareModalProps {
  onClose: () => void;
}

export default function ShareModal({ onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  
  const shareUrl = window.location.origin;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-xl w-full max-w-md relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50 shrink-0">
          <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
            {toUpperCaseAccentFree('ΕΓΚΑΤΑΣΤΑΣΗ ΕΦΑΡΜΟΓΗΣ')}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-3 sm:p-4 overflow-y-auto custom-scrollbar text-center flex flex-col gap-3">
          <p className="text-[11px] text-slate-600 leading-tight font-medium px-2">
            {toUpperCaseAccentFree('Σκανάρετε το QR Code για να ανοίξετε και να εγκαταστήσετε την εφαρμογή στο κινητό σας.')}
          </p>

          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-200 inline-flex">
              <QRCodeSVG 
                value={shareUrl} 
                size={130}
                bgColor={"#ffffff"}
                fgColor={"#0f172a"}
                level={"Q"}
              />
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition-all shadow-sm"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'ΑΝΤΙΓΡΑΦΗΚΕ!' : 'ΑΝΤΙΓΡΑΦΗ ΔΙΕΥΘΥΝΣΗΣ'}
            </button>
          </div>

          <div className="bg-blue-50/50 p-3 rounded-xl text-left border border-blue-100/50 flex flex-col gap-1.5">
             <h4 className="font-bold text-blue-900 text-[9px] tracking-wider flex items-center gap-2">
               {toUpperCaseAccentFree('ΟΔΗΓΙΕΣ ΕΓΚΑΤΑΣΤΑΣΗΣ')}
             </h4>
             <ul className="text-[9px] text-blue-800 space-y-1 font-medium leading-tight px-1">
               <li className="flex items-start gap-1.5">
                 <span className="bg-blue-200 text-blue-800 rounded-full w-3 h-3 flex items-center justify-center shrink-0 mt-0.5 text-[7px] font-black">1</span>
                 <span>{toUpperCaseAccentFree('Ανοίξτε την εφαρμογή της κάμερας στο κινητό σας.')}</span>
               </li>
               <li className="flex items-start gap-1.5">
                 <span className="bg-blue-200 text-blue-800 rounded-full w-3 h-3 flex items-center justify-center shrink-0 mt-0.5 text-[7px] font-black">2</span>
                 <span>{toUpperCaseAccentFree('Στοχεύστε το QR Code παραπάνω.')}</span>
               </li>
               <li className="flex items-start gap-1.5">
                 <span className="bg-blue-200 text-blue-800 rounded-full w-3 h-3 flex items-center justify-center shrink-0 mt-0.5 text-[7px] font-black">3</span>
                 <span>{toUpperCaseAccentFree('Πατήστε το link που θα εμφανιστεί στην οθόνη.')}</span>
               </li>
               <li className="flex items-start gap-1.5">
                 <span className="bg-blue-200 text-blue-800 rounded-full w-3 h-3 flex items-center justify-center shrink-0 mt-0.5 text-[7px] font-black">4</span>
                 <span>{toUpperCaseAccentFree('Στο Safari (iPhone), επιλέξτε "Κοινοποίηση" (Share) και "Προσθήκη στην οθόνη Αφετηρίας".')}</span>
               </li>
               <li className="flex items-start gap-1.5">
                 <span className="bg-blue-200 text-blue-800 rounded-full w-3 h-3 flex items-center justify-center shrink-0 mt-0.5 text-[7px] font-black">5</span>
                 <span>{toUpperCaseAccentFree('Στο Chrome (Android), επιλέξτε "Εγκατάσταση Εφαρμογής" ή "Προσθήκη στην οθόνη".')}</span>
               </li>
             </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
