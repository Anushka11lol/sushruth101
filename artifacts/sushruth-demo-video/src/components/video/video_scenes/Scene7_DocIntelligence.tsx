import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText } from '@/lib/video';
import { FileSearch, CheckCircle, Pill, FileSignature } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Scene7_DocIntelligence() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 2000), // Scan line
      setTimeout(() => setStep(2), 3500), // Extracting
      setTimeout(() => setStep(3), 5000), // Extracted data appears
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <SceneLayout className="bg-slate-900 text-white" layout="center">
      <SafeFrame className="flex flex-col items-center justify-center relative w-full h-full">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="text-center mb-[6vh] absolute top-[8vh]"
        >
          <VideoText as="h2" scale="heading" className="font-bold mb-[2vh]">Medical Document Intelligence</VideoText>
          <VideoText scale="body" className="text-slate-400 max-w-[50vw] mx-auto">
            Digitize handwritten prescriptions and lab reports instantly.
          </VideoText>
        </motion.div>

        <motion.div exit={{ opacity: 0, scale: 0.9 }} className="flex flex-row items-center gap-[5vw] mt-[10vh] w-full justify-center">
          
          {/* Phone scanning document */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-[22vw] h-[65vh] bg-black rounded-[3vw] border-[0.6vw] border-slate-800 relative overflow-hidden flex flex-col justify-center items-center shadow-2xl shadow-teal-900/20"
          >
            {/* Fake document */}
            <div className="w-[80%] h-[60%] bg-[#f4f1ea] rounded-[0.5vw] text-slate-800 p-[2vw] flex flex-col relative overflow-hidden">
               <h3 className="font-serif text-[1.5vw] border-b border-slate-300 pb-[1vh] mb-[2vh] font-bold text-slate-700">Sample Prescription</h3>
               <div className="opacity-60 blur-[1px]">
                 <div className="h-[1vh] bg-slate-300 rounded w-3/4 mb-[1.5vh]" />
                 <div className="h-[1vh] bg-slate-300 rounded w-1/2 mb-[1.5vh]" />
                 <div className="h-[1vh] bg-slate-300 rounded w-5/6 mb-[3vh]" />
                 
                 <div className="h-[1vh] bg-slate-300 rounded w-2/3 mb-[1.5vh]" />
                 <div className="h-[1vh] bg-slate-300 rounded w-1/3 mb-[1.5vh]" />
               </div>
               
               <FileSignature className="absolute bottom-[2vh] right-[2vw] w-[4vw] h-[4vw] text-slate-300" />
            </div>

            {/* Scan overlay */}
            <AnimatePresence>
              {step >= 1 && step < 3 && (
                <motion.div
                  initial={{ top: '15%' }}
                  animate={{ top: '85%' }}
                  transition={{ duration: 1.5, ease: "linear", repeat: Infinity, repeatType: 'reverse' }}
                  className="absolute left-0 right-0 h-[0.5vh] bg-teal-400 shadow-[0_0_15px_rgba(45,212,191,1)] z-10"
                />
              )}
            </AnimatePresence>

            {/* Camera UI */}
            <div className="absolute bottom-[4vh] w-[4vw] h-[4vw] rounded-full border-[0.3vw] border-white flex items-center justify-center">
               <div className="w-[3vw] h-[3vw] rounded-full bg-white/20 backdrop-blur" />
            </div>
          </motion.div>

          {/* Results Side */}
          <div className="w-[40vw]">
            <AnimatePresence mode="popLayout">
              {step < 3 ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center justify-center h-full text-teal-400"
                >
                  <FileSearch className="w-[6vw] h-[6vw] mb-[2vh] animate-pulse" />
                  <VideoText scale="body" className="font-bold tracking-widest uppercase">Extracting...</VideoText>
                </motion.div>
              ) : (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-[3vh]"
                >
                  <div className="flex items-center gap-[1vw] text-teal-400 mb-[3vh]">
                    <CheckCircle className="w-[3vw] h-[3vw]" />
                    <h3 className="text-[2.5vw] font-bold">Extraction Complete</h3>
                  </div>

                  {[
                    { name: "Amoxicillin 500mg", detail: "1 pill, 3x daily for 7 days" },
                    { name: "Paracetamol 650mg", detail: "1 pill, PRN for fever" },
                    { name: "Cough Syrup", detail: "10ml before sleep" }
                  ].map((med, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.2 }}
                      className="bg-slate-800 p-[1.5vw] rounded-[1vw] border border-slate-700 flex items-center gap-[1.5vw]"
                    >
                      <div className="w-[4vw] h-[4vw] bg-teal-900/50 rounded-full flex items-center justify-center shrink-0">
                        <Pill className="w-[2vw] h-[2vw] text-teal-400" />
                      </div>
                      <div>
                        <h4 className="text-[1.5vw] font-bold text-white">{med.name}</h4>
                        <p className="text-slate-400 text-[1.2vw]">{med.detail}</p>
                      </div>
                    </motion.div>
                  ))}
                  
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-[3vh] bg-amber-900/30 border border-amber-700/50 p-[1.5vw] rounded-[1vw] text-amber-200/80 text-[1.2vw]"
                  >
                    Please verify the AI-extracted details above before saving.
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </SafeFrame>
    </SceneLayout>
  );
}
