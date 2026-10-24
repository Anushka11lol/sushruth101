import { motion } from 'framer-motion';
import { Stethoscope, HeartPulse } from 'lucide-react';
import { SceneLayout, SafeFrame, VideoText } from '@/lib/video';

export function Scene1_Intro() {
  return (
    <SceneLayout className="bg-[var(--color-brand-bg)] text-[var(--color-brand-fg)]" layout="center">
      <motion.div
        className="absolute inset-0 z-0 opacity-40 mix-blend-multiply"
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.4 }}
        exit={{ scale: 1.05, opacity: 0 }}
        transition={{ duration: 7, ease: "linear" }}
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/medical_bg.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      <SafeFrame className="flex flex-col items-center justify-center z-10 h-full">
        <motion.div
          initial={{ y: '5vh', opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: '-5vh', opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          <div className="w-[15vmin] h-[15vmin] rounded-3xl bg-[var(--color-brand-teal)] shadow-2xl flex items-center justify-center mb-[4vh] relative overflow-hidden">
             <motion.div 
               className="absolute inset-0 bg-white/20"
               animate={{ x: ['-100%', '100%'] }}
               transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, repeatDelay: 3 }}
             />
             <HeartPulse className="w-[8vmin] h-[8vmin] text-white" />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="ui-badge mb-[4vh] px-[2vw] py-[1vh] uppercase tracking-widest border border-[var(--color-brand-teal-light)] text-[2vmin]"
          >
            Team Invalid Syntax
          </motion.div>

          <VideoText as="h1" scale="display" className="font-extrabold tracking-tight text-center leading-tight mb-[2vh]">
            Sushruth
          </VideoText>
          <VideoText as="h2" scale="heading" className="text-[var(--color-brand-accent)] font-medium text-center">
            SIH26047 — Patient Case-Taking Software
          </VideoText>
        </motion.div>
      </SafeFrame>
    </SceneLayout>
  );
}
