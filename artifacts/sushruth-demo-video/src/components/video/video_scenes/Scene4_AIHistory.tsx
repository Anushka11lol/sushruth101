import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText } from '@/lib/video';
import { Bot, AlertTriangle, Activity, ShieldCheck } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Scene4_AIHistory() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1500),
      setTimeout(() => setStep(2), 3500),
      setTimeout(() => setStep(3), 5500),
      setTimeout(() => setStep(4), 7500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <SceneLayout className="bg-[var(--color-brand-bg)]" layout="center">
      <SafeFrame className="flex flex-row items-center justify-between gap-[5vw] px-[5vw] h-full w-full">
        
        {/* Left Side: Chat UI */}
        <motion.div exit={{ opacity: 0, scale: 0.9 }} className="flex-[0.8] h-[80vh] bg-white rounded-[2vw] shadow-xl border border-slate-200 overflow-hidden flex flex-col relative z-10">
          <div className="bg-slate-50 border-b p-[1.5vw] flex items-center gap-[1vw]">
             <div className="w-[3vw] h-[3vw] bg-[var(--color-brand-accent)] rounded-full flex items-center justify-center text-white">
               <Bot className="w-[1.5vw] h-[1.5vw]" />
             </div>
             <div>
               <h3 className="font-bold text-slate-800 text-[1.5vw]">Sushruth AI</h3>
               <p className="text-[1vw] text-slate-500">Adaptive Clinical Intake</p>
             </div>
          </div>
          
          <div className="p-[2vw] flex flex-col gap-[2vh] overflow-hidden relative">
            <AnimatePresence>
              {step >= 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="flex gap-[1vw] items-end justify-end"
                >
                  <div className="bg-[var(--color-brand-teal)] text-white px-[1.5vw] py-[1vh] rounded-[1.5vw] rounded-br-[0.2vw] shadow-sm max-w-[85%] text-[1.2vw]">
                    I have had severe chest pain since this morning.
                  </div>
                </motion.div>
              )}
              
              {step >= 1 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="flex gap-[1vw] items-start"
                >
                  <div className="w-[2vw] h-[2vw] rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                    <Bot className="w-[1.2vw] h-[1.2vw] text-slate-600" />
                  </div>
                  <div className="bg-slate-100 text-slate-800 px-[1.5vw] py-[1vh] rounded-[1.5vw] rounded-bl-[0.2vw] shadow-sm max-w-[85%] text-[1.2vw] border border-slate-200">
                    Does the pain radiate to your arm, neck, or jaw?
                  </div>
                </motion.div>
              )}

              {step >= 2 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="flex gap-[1vw] items-end justify-end"
                >
                  <div className="bg-[var(--color-brand-teal)] text-white px-[1.5vw] py-[1vh] rounded-[1.5vw] rounded-br-[0.2vw] shadow-sm max-w-[85%] text-[1.2vw]">
                    Yes, it goes down my left arm.
                  </div>
                </motion.div>
              )}
              
              {step >= 3 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="flex gap-[1vw] items-start"
                >
                  <div className="w-[2vw] h-[2vw] rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                    <Bot className="w-[1.2vw] h-[1.2vw] text-slate-600" />
                  </div>
                  <div className="bg-slate-100 text-slate-800 px-[1.5vw] py-[1vh] rounded-[1.5vw] rounded-bl-[0.2vw] shadow-sm max-w-[85%] text-[1.2vw] border border-slate-200">
                    Are you experiencing shortness of breath or sweating?
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Right Side: Structured Data Building */}
        <motion.div exit={{ opacity: 0, x: 50 }} className="flex-[1.2] flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <VideoText as="h2" scale="heading" className="font-bold mb-[4vh] leading-tight">Adaptive AI Case-Taking</VideoText>
          </motion.div>
          
          <div className="space-y-[3vh] relative">
             <div className="absolute left-[-3vw] top-[4vh] bottom-[4vh] w-[0.2vw] bg-indigo-200 border-dashed border-l-[0.2vw]" />
             
             {[
               { title: "Chief Complaint", val: "Chest Pain", step: 0, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
               { title: "HPI", val: "Radiating to left arm. Started morning.", step: 2, icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50" },
               { title: "Review of Systems", val: "Checking for dyspnea, diaphoresis...", step: 3, icon: ShieldCheck, color: "text-teal-600", bg: "bg-teal-50" }
             ].map((item, i) => (
               <motion.div
                 key={i}
                 initial={{ opacity: 0, x: 50, scale: 0.95 }}
                 animate={step >= item.step ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 50, scale: 0.95 }}
                 transition={{ duration: 0.5, type: 'spring' }}
                 className="ui-card p-[1.5vw] relative overflow-hidden"
               >
                 <motion.div
                   initial={{ scaleX: 0 }}
                   animate={step >= item.step ? { scaleX: 1 } : { scaleX: 0 }}
                   className="absolute top-0 left-0 w-full h-[0.5vh] bg-gradient-to-r from-[var(--color-brand-teal)] to-[var(--color-brand-accent)] origin-left"
                 />
                 <div className="flex gap-[1vw] items-center">
                   <div className={`w-[4vw] h-[4vw] rounded-[1vw] ${item.bg} flex items-center justify-center shrink-0`}>
                     <item.icon className={`w-[2vw] h-[2vw] ${item.color}`} />
                   </div>
                   <div>
                     <p className="text-[1vw] font-bold uppercase text-slate-400 tracking-wider mb-[0.5vh]">{item.title}</p>
                     <p className="text-[1.5vw] font-medium text-slate-800">{item.val}</p>
                   </div>
                 </div>
               </motion.div>
             ))}
          </div>
        </motion.div>

      </SafeFrame>
    </SceneLayout>
  );
}
