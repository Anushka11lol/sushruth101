import { motion } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText } from '@/lib/video';
import { FileText, Clock, Languages, UserMinus, ArrowRight } from 'lucide-react';

export function Scene2_Problem() {
  const problems = [
    { icon: FileText, text: "Repetitive Intake" },
    { icon: Clock, text: "Time-Consuming" },
    { icon: Languages, text: "Language Barriers" },
    { icon: UserMinus, text: "Low-Literacy Hurdles" },
  ];

  return (
    <SceneLayout className="bg-[var(--color-brand-bg)]" layout="center">
      <SafeFrame className="flex flex-col justify-center items-center h-full w-full relative">
        
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-[8vh] text-center w-full"
        >
          <VideoText as="h2" scale="heading" className="font-bold mb-[2vh]">The Clinical Bottleneck</VideoText>
          <VideoText scale="body" className="text-gray-500 mx-auto w-[60vw]">
            Manual history-taking delays care and misses critical patient context.
          </VideoText>
        </motion.div>

        <div className="grid grid-cols-2 gap-[4vmin] w-[70vw]">
          {problems.map((prob, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: 0.4 + i * 0.15, duration: 0.8, type: 'spring' }}
              className="ui-card p-[3vmin] flex items-center gap-[2vmin]"
            >
              <div className="w-[8vmin] h-[8vmin] rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <prob.icon className="w-[4vmin] h-[4vmin] text-red-500" />
              </div>
              <VideoText scale="body" className="font-semibold">{prob.text}</VideoText>
            </motion.div>
          ))}
        </div>

        {/* The Solution Transition */}
        <motion.div
          initial={{ clipPath: 'circle(0% at 50% 50%)' }}
          animate={{ clipPath: 'circle(150% at 50% 50%)' }}
          exit={{ opacity: 0 }}
          transition={{ delay: 3, duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0 bg-[var(--color-brand-teal)] z-20 flex flex-col items-center justify-center text-white"
        >
           <VideoText as="h2" scale="heading" className="font-bold mb-[8vh]">One Connected Workflow</VideoText>
           <div className="flex items-center gap-[3vw]">
             {["Patient Intake", "AI History", "Documents", "Doctor Review"].map((step, i) => (
               <motion.div key={i} className="flex items-center gap-[3vw]"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: 4 + i * 0.2 }}
               >
                 <div className="bg-white/10 px-[2vw] py-[2vh] rounded-xl font-medium border border-white/20">
                   <VideoText scale="body">{step}</VideoText>
                 </div>
                 {i < 3 && <ArrowRight className="w-[4vmin] h-[4vmin] text-[var(--color-brand-accent)]" />}
               </motion.div>
             ))}
           </div>
        </motion.div>

      </SafeFrame>
    </SceneLayout>
  );
}
