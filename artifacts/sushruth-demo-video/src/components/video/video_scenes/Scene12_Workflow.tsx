import { motion } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText } from '@/lib/video';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export function Scene12_Workflow() {
  const workflow = [
    "Patient Intake", 
    "AI History", 
    "Digitization", 
    "Summary", 
    "Doctor Review", 
    "Consultation"
  ];

  const differentiators = [
    "Adaptive multilingual case-taking",
    "Voice & touch accessibility",
    "AYUSH-specific history",
    "Medical document intelligence",
    "Physician verification workflow"
  ];

  return (
    <SceneLayout className="bg-[var(--color-brand-bg)]" layout="center">
      <SafeFrame className="flex flex-col items-center justify-center pt-[5vh] h-full w-full">
        
        <motion.div exit={{ opacity: 0, y: -20 }}>
          <VideoText as="h2" scale="heading" className="font-bold mb-[8vh] text-center text-slate-800">The Complete Sushruth Workflow</VideoText>
        </motion.div>
        
        {/* Workflow Diagram */}
        <motion.div exit={{ opacity: 0 }} className="flex items-center flex-wrap justify-center w-[90vw] gap-y-[3vh] mb-[12vh]">
          {workflow.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.3, type: 'spring' }}
              className="flex items-center"
            >
              <div className={`px-[1.5vw] py-[1vh] rounded-[1vw] font-bold text-[1.5vw] border-[0.2vw] shadow-sm
                ${i === workflow.length - 1 ? 'bg-[var(--color-brand-teal)] text-white border-[var(--color-brand-teal)]' : 'bg-white text-slate-700 border-slate-200'}`}
              >
                {step}
              </div>
              {i < workflow.length - 1 && (
                <ArrowRight className="w-[3vw] h-[3vw] mx-[1vw] text-slate-400" />
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Differentiators */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ delay: 2.5 }}
          className="w-[80vw] bg-white p-[4vw] rounded-[2vw] shadow-xl border border-[var(--color-brand-teal-light)] relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-[0.5vw] h-full bg-[var(--color-brand-accent)]" />
          <h3 className="text-[2vw] font-bold mb-[4vh] text-slate-800 uppercase tracking-widest text-center">Key Differentiators</h3>
          <div className="grid grid-cols-2 gap-x-[4vw] gap-y-[2vh]">
            {differentiators.map((diff, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 3 + i * 0.2 }}
                className="flex items-center gap-[1vw]"
              >
                <CheckCircle2 className="w-[2.5vw] h-[2.5vw] text-[var(--color-brand-teal)] shrink-0" />
                <span className="text-[1.5vw] font-medium text-slate-700">{diff}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </SafeFrame>
    </SceneLayout>
  );
}
