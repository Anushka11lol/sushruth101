import { motion } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText } from '@/lib/video';
import { Mic, Keyboard, Touchpad, Check } from 'lucide-react';

export function Scene3_PreConsultation() {
  return (
    <SceneLayout className="bg-[var(--color-brand-bg)]" layout="center">
      <SafeFrame className="flex flex-row items-center justify-center gap-[10vw] h-full w-full">
        
        {/* Floating Text Context */}
        <motion.div 
          className="max-w-[40vw] flex flex-col justify-center"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="ui-badge mb-[2vh] w-max px-[1.5vw] py-[0.5vh] text-[2vmin]">Accessible Intake</div>
          <VideoText as="h2" scale="heading" className="font-bold leading-tight mb-[2vh]">Voice, Text, or Touch</VideoText>
          <VideoText scale="body" className="text-gray-600 leading-relaxed">
            Eliminate friction for elderly and low-literacy patients with multi-modal input.
          </VideoText>
        </motion.div>

        {/* Phone mock-up UI */}
        <motion.div 
          initial={{ y: '100%' }}
          animate={{ y: '0%' }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 1, type: 'spring', bounce: 0.2 }}
          className="w-[28vw] h-[80vh] bg-white rounded-[3vw] shadow-2xl border-[0.8vw] border-slate-800 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-[var(--color-brand-teal)] text-white p-[2vw] pt-[4vh] pb-[3vh] rounded-b-3xl shadow-md z-10">
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 1 }}
             >
               <h3 className="text-[1.2vw] font-semibold uppercase tracking-wider text-teal-100 mb-[1vh]">Stage 1 of 9</h3>
               <VideoText scale="body" className="font-bold">How would you like to answer?</VideoText>
             </motion.div>
          </div>

          {/* Options */}
          <div className="p-[2vw] flex flex-col gap-[2vh] mt-[2vh] flex-1">
            {[
              { icon: Mic, title: "Use Voice", desc: "Speak in your preferred language", active: true },
              { icon: Keyboard, title: "Type Text", desc: "Type your symptoms out", active: false },
              { icon: Touchpad, title: "Tap Choices", desc: "Select from simple options", active: false }
            ].map((opt, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.5 + i * 0.2, type: 'spring' }}
                className={`p-[1.5vw] rounded-[1.5vw] border-[0.2vw] flex items-center gap-[1vw] transition-all
                  ${opt.active ? 'border-[var(--color-brand-teal)] bg-[var(--color-brand-teal-light)]' : 'border-slate-200 bg-white'}
                `}
              >
                <div className={`w-[4vw] h-[4vw] rounded-full flex items-center justify-center ${opt.active ? 'bg-[var(--color-brand-teal)] text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <opt.icon className="w-[2vw] h-[2vw]" />
                </div>
                <div className="flex-1">
                  <h4 className={`text-[1.8vw] font-bold ${opt.active ? 'text-[var(--color-brand-teal-dark)]' : 'text-slate-800'}`}>{opt.title}</h4>
                  <p className="text-slate-500 text-[1vw] mt-[0.5vh]">{opt.desc}</p>
                </div>
                {opt.active && <Check className="w-[2vw] h-[2vw] text-[var(--color-brand-teal)]" />}
              </motion.div>
            ))}
            
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 3, type: 'spring' }}
              className="mt-auto mb-[1vh]"
            >
              <div className="w-full py-[2vh] bg-[var(--color-brand-teal)] text-white text-center rounded-[1vw] font-bold text-[1.8vw] shadow-lg flex justify-center items-center gap-[1vw]">
                 <Mic className="w-[2vw] h-[2vw]" /> Start Speaking
              </div>
            </motion.div>
          </div>
        </motion.div>

      </SafeFrame>
    </SceneLayout>
  );
}
