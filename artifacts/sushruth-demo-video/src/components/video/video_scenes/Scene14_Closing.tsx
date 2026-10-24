import { motion } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText } from '@/lib/video';
import { Stethoscope } from 'lucide-react';

export function Scene14_Closing() {
  return (
    <SceneLayout className="bg-[var(--color-brand-teal-dark)] text-white" layout="center">
      <SafeFrame className="flex flex-col items-center justify-center text-center w-full h-full">
        
        <motion.div
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.5 } }}
          className="flex flex-col items-center"
        >
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, type: 'spring', bounce: 0.5 }}
            className="w-[12vw] h-[12vw] rounded-[3vw] bg-[var(--color-brand-accent)] shadow-2xl flex items-center justify-center mb-[8vh]"
          >
             <Stethoscope className="w-[6vw] h-[6vw] text-white" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <VideoText as="h2" scale="heading" className="font-bold w-[70vw] leading-tight mb-[4vh] text-center">
              Sushruth doesn't replace the doctor.
            </VideoText>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5 }}
          >
            <VideoText scale="body" className="text-teal-200 w-[60vw] leading-relaxed text-center mx-auto">
              It ensures the patient's story reaches the doctor already captured, organized, and ready to review.
            </VideoText>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 4.5 }}
            className="mt-[10vh]"
          >
            <p className="text-[1.5vw] font-bold uppercase tracking-widest text-[var(--color-brand-accent)] mb-[1vh]">Thank You</p>
            <p className="text-[1.2vw] text-teal-300">Team Invalid Syntax • SIH 2026</p>
          </motion.div>
        </motion.div>

      </SafeFrame>
    </SceneLayout>
  );
}
