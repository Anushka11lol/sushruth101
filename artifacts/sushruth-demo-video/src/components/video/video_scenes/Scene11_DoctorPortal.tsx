import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText } from '@/lib/video';
import { Stethoscope, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Scene11_DoctorPortal() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1500), // Show verification checkmarks
      setTimeout(() => setStep(2), 3000), // Doctor clicks confirm
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <SceneLayout className="bg-slate-50" layout="center">
      <SafeFrame className="flex flex-col items-center justify-center w-full h-full">
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="text-center mb-[4vh] flex flex-col items-center"
        >
          <div className="bg-slate-200 text-slate-700 px-[1.5vw] py-[0.8vh] rounded-full text-[1vw] font-bold flex items-center gap-[0.5vw] mb-[2vh]">
            <Stethoscope className="w-[1.2vw] h-[1.2vw]" /> Dedicated Provider Portal
          </div>
          <VideoText as="h2" scale="heading" className="font-bold text-slate-800">Review Before Consultation</VideoText>
        </motion.div>

        {/* Browser Mockup */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          transition={{ duration: 0.8, type: 'spring' }}
          className="w-[85vw] h-[65vh] bg-white rounded-[1vw] shadow-2xl border-[0.1vw] border-slate-300 overflow-hidden flex flex-col"
        >
          {/* Fake Browser Header */}
          <div className="bg-slate-100 border-b border-slate-200 h-[4vh] flex items-center px-[1vw] gap-[0.5vw]">
            <div className="w-[1vh] h-[1vh] rounded-full bg-red-400" />
            <div className="w-[1vh] h-[1vh] rounded-full bg-amber-400" />
            <div className="w-[1vh] h-[1vh] rounded-full bg-green-400" />
          </div>

          <div className="flex-1 p-[3vw] grid grid-cols-3 gap-[3vw] overflow-hidden bg-slate-50/50">
            {/* Left Col */}
            <div className="col-span-2 space-y-[3vh]">
              <div className="flex items-center justify-between">
                <h3 className="text-[2vw] font-bold text-slate-900">Patient Intake Review: Demo Profile</h3>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-[0.8vw] shadow-sm">
                <div className="bg-slate-50 border-b border-slate-200 px-[2vw] py-[1.5vh] flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 text-[1.2vw]">Chief Complaint & HPI</h4>
                  {step >= 1 && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-[0.5vw] text-green-600 bg-green-50 px-[1vw] py-[0.5vh] rounded-[0.5vw] text-[1vw] font-bold">
                      <CheckCircle className="w-[1.2vw] h-[1.2vw]" /> VERIFIED
                    </motion.div>
                  )}
                </div>
                <div className="p-[2vw]">
                  <p className="text-[1vw] font-bold text-slate-400 uppercase tracking-widest mb-[1vh]">Main Problem</p>
                  <p className="text-[1.5vw] font-medium">Chest Pain</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-[0.8vw] shadow-sm">
                <div className="bg-slate-50 border-b border-slate-200 px-[2vw] py-[1.5vh] flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 text-[1.2vw]">Medical History</h4>
                  {step >= 1 && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-[0.5vw] text-green-600 bg-green-50 px-[1vw] py-[0.5vh] rounded-[0.5vw] text-[1vw] font-bold">
                      <CheckCircle className="w-[1.2vw] h-[1.2vw]" /> VERIFIED
                    </motion.div>
                  )}
                </div>
                <div className="p-[2vw] flex gap-[4vw]">
                   <div>
                     <p className="text-[1vw] font-bold text-slate-400 uppercase mb-[0.5vh]">Medications</p>
                     <p className="text-[1.2vw]">Atorvastatin 50mg</p>
                   </div>
                   <div>
                     <p className="text-[1vw] font-bold text-slate-400 uppercase mb-[0.5vh]">Conditions</p>
                     <p className="text-[1.2vw]">Hypertension</p>
                   </div>
                </div>
              </div>
            </div>

            {/* Right Col */}
            <div>
              <div className="bg-white border border-slate-200 rounded-[0.8vw] shadow-sm sticky top-0">
                <div className="bg-slate-50 border-b border-slate-200 px-[2vw] py-[1.5vh]">
                  <h4 className="font-bold text-slate-800 text-[1.2vw]">Clinician Notes</h4>
                </div>
                <div className="p-[2vw]">
                  <div className="h-[15vh] bg-slate-50 border border-slate-200 rounded-[0.5vw] p-[1vw] text-slate-500 italic text-[1vw] mb-[3vh]">
                    Type internal notes here...
                  </div>

                  <AnimatePresence mode="wait">
                    {step < 2 ? (
                      <motion.div
                        key="btn"
                        exit={{ opacity: 0, y: 10 }}
                        className="w-full bg-[var(--color-brand-teal)] text-white font-bold py-[1.5vh] rounded-[0.5vw] flex items-center justify-center gap-[0.5vw] text-[1.2vw]"
                      >
                        <CheckCircle className="w-[1.5vw] h-[1.5vw]" /> Confirm Consultation
                      </motion.div>
                    ) : (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full bg-green-100 text-green-800 font-bold py-[1.5vh] rounded-[0.5vw] flex items-center justify-center gap-[0.5vw] border border-green-300 text-[1.2vw]"
                      >
                        <CheckCircle className="w-[1.5vw] h-[1.5vw]" /> Reviewed Successfully
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

      </SafeFrame>
    </SceneLayout>
  );
}
