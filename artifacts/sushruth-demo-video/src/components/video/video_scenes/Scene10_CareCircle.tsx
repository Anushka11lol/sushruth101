import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText } from '@/lib/video';
import { Users, ShieldAlert } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Scene10_CareCircle() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 2000), // Show alert
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <SceneLayout className="bg-[var(--color-brand-bg)]" layout="center">
      <SafeFrame className="flex flex-row items-center justify-between gap-[5vw] px-[5vw] h-full w-full">
        
        <motion.div exit={{ opacity: 0, x: -30 }} className="flex-[1] flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="ui-badge mb-[2vh] px-[1vw] py-[0.5vh] text-[1.2vw] w-max">Care Circle & Management</div>
            <VideoText as="h2" scale="heading" className="font-bold mb-[3vh] leading-tight">Keep Trusted Family Connected</VideoText>
            <VideoText scale="body" className="text-gray-600 mb-[4vh] leading-relaxed max-w-[40vw]">
              Manage in-home nurses and stay informed of important health alerts from elderly family members remotely.
            </VideoText>
          </motion.div>
        </motion.div>

        {/* UI Mockup */}
        <motion.div exit={{ opacity: 0, scale: 0.9 }} className="flex-[1] relative flex justify-center">
           <motion.div
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="w-[35vw] h-[70vh] bg-white rounded-[2vw] shadow-2xl border-[0.2vw] border-slate-200 p-[3vw] flex flex-col relative overflow-hidden"
           >
             <div className="flex items-center gap-[1vw] mb-[4vh]">
               <div className="w-[4vw] h-[4vw] bg-teal-100 rounded-full flex items-center justify-center shrink-0">
                 <Users className="w-[2vw] h-[2vw] text-teal-700" />
               </div>
               <h3 className="text-[2vw] font-bold">My Care Circle</h3>
             </div>

             <div className="space-y-[2vh]">
               {[
                 { name: "Rahul (Son)", role: "Family", active: true },
                 { name: "Anjali (Nurse)", role: "Caretaker", active: true },
                 { name: "Priya (Daughter)", role: "Family", active: false }
               ].map((member, i) => (
                 <motion.div
                   key={i}
                   initial={{ opacity: 0, x: 50 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: 0.5 + i * 0.1 }}
                   className="flex items-center justify-between p-[1.5vw] bg-slate-50 rounded-[1vw] border border-slate-100"
                 >
                   <div className="flex items-center gap-[1vw]">
                     <div className="w-[3vw] h-[3vw] bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-500 text-[1.2vw]">
                       {member.name.charAt(0)}
                     </div>
                     <div>
                       <p className="font-bold text-[1.2vw]">{member.name}</p>
                       <p className="text-[0.8vw] text-slate-500 uppercase">{member.role}</p>
                     </div>
                   </div>
                   <div className={`w-[1vw] h-[1vw] rounded-full ${member.active ? 'bg-green-500' : 'bg-slate-300'}`} />
                 </motion.div>
               ))}
             </div>

             {/* The Alert pop-up overlay */}
             <AnimatePresence>
               {step >= 1 && (
                 <motion.div
                   initial={{ y: '100%', opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   exit={{ y: '100%', opacity: 0 }}
                   transition={{ type: 'spring', bounce: 0.3 }}
                   className="absolute bottom-[2vh] left-[2vw] right-[2vw] bg-red-50 border-2 border-red-200 p-[1.5vw] rounded-[1.5vw] shadow-xl flex items-start gap-[1vw]"
                 >
                   <div className="bg-red-100 p-[0.8vw] rounded-full text-red-600 shrink-0">
                     <ShieldAlert className="w-[2vw] h-[2vw]" />
                   </div>
                   <div>
                     <h4 className="text-[1.2vw] font-bold text-red-800 mb-[0.5vh]">Urgent Alert: Dad</h4>
                     <p className="text-red-700 font-medium text-[1vw]">Dad's AI Triage indicated emergency urgency. ER visit recommended.</p>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>

           </motion.div>
        </motion.div>

      </SafeFrame>
    </SceneLayout>
  );
}
