import { motion } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText } from '@/lib/video';
import { FileText, Download, Share2 } from 'lucide-react';

export function Scene6_Summary() {
  return (
    <SceneLayout className="bg-[var(--color-brand-bg)]" layout="center">
      <SafeFrame className="flex flex-row items-center justify-center gap-[5vw] h-full w-full">
        
        <motion.div exit={{ opacity: 0, x: -50 }} className="flex-[1] flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="ui-badge mb-[2vh] text-[1.5vw] px-[1vw] py-[0.5vh] w-max">Export & Share</div>
            <VideoText as="h2" scale="heading" className="font-bold mb-[3vh] leading-tight">Physician-Ready Summary</VideoText>
            <VideoText scale="body" className="text-gray-600 mb-[4vh]">
              A clean, structured clinical note ready for the doctor's review before the consultation begins.
            </VideoText>
          </motion.div>

          <div className="flex gap-[2vw]">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <div className="bg-slate-800 text-white px-[1.5vw] py-[1.5vh] rounded-[1vw] flex items-center gap-[1vw] font-semibold text-[1.5vw] shadow-lg">
                <Download className="w-[1.5vw] h-[1.5vw]" /> Export PDF
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <div className="bg-white border-[0.2vw] border-slate-200 text-slate-800 px-[1.5vw] py-[1.5vh] rounded-[1vw] flex items-center gap-[1vw] font-semibold text-[1.5vw] shadow-sm">
                <Share2 className="w-[1.5vw] h-[1.5vw]" /> Save to Records
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Paper Mockup */}
        <motion.div 
          initial={{ y: '100%', rotate: 10, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          exit={{ y: '100%', rotate: -10, opacity: 0 }}
          transition={{ duration: 1, type: 'spring', bounce: 0.3 }}
          className="flex-[0.8] h-[75vh] bg-white rounded-[0.5vw] shadow-2xl border-[0.1vw] border-slate-200 p-[3vw] relative flex flex-col"
          style={{ transformOrigin: 'bottom center' }}
        >
          <div className="flex justify-between items-start mb-[3vh] border-b pb-[2vh] border-slate-100">
            <div>
              <h3 className="text-[2vw] font-bold text-slate-800">Pre-Consultation</h3>
              <p className="text-slate-500 text-[1.2vw]">Patient: Demo Profile, Adult</p>
            </div>
            <FileText className="w-[3vw] h-[3vw] text-[var(--color-brand-teal)]" />
          </div>

          <div className="space-y-[3vh] flex-1">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
              <p className="text-[1vw] font-bold text-slate-400 uppercase tracking-widest mb-[0.5vh]">Chief Complaint</p>
              <p className="font-semibold text-slate-800 text-[1.5vw]">Chest Pain (Onset: Morning)</p>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
              <p className="text-[1vw] font-bold text-slate-400 uppercase tracking-widest mb-[0.5vh]">HPI</p>
              <p className="text-slate-700 text-[1.2vw] leading-relaxed">Pain radiating to left arm. Accompanied by mild shortness of breath. No previous history of similar episodes.</p>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
              <p className="text-[1vw] font-bold text-slate-400 uppercase tracking-widest mb-[0.5vh]">Vitals & Meds</p>
              <div className="flex gap-[1vw] mb-[1vh]">
                <span className="bg-slate-100 px-[1vw] py-[0.5vh] rounded-[0.5vw] text-[1vw]">BP: 140/90</span>
                <span className="bg-slate-100 px-[1vw] py-[0.5vh] rounded-[0.5vw] text-[1vw]">Atorvastatin 50mg</span>
              </div>
            </motion.div>
          </div>
          
          <motion.div
             initial={{ scaleX: 0 }}
             animate={{ scaleX: 1 }}
             transition={{ delay: 2, duration: 1 }}
             className="h-[0.5vh] bg-[var(--color-brand-teal)] w-full mt-auto origin-left"
          />
        </motion.div>

      </SafeFrame>
    </SceneLayout>
  );
}
