import { motion } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText } from '@/lib/video';
import { Leaf, Flame, Sun, Droplets } from 'lucide-react';

export function Scene5_AYUSH() {
  const ayushTraits = [
    { title: "Prakriti", val: "Vata-Pitta", icon: Leaf, color: "text-green-600", bg: "bg-green-50" },
    { title: "Agni", val: "Vishamagni", icon: Flame, color: "text-orange-600", bg: "bg-orange-50" },
    { title: "Koshtha", val: "Krura (Hard)", icon: Droplets, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Ahara-Vihara", val: "Irregular meals", icon: Sun, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <SceneLayout className="bg-[#107575] text-white" layout="center">
      <motion.div
        className="absolute inset-0 opacity-20 mix-blend-overlay"
        exit={{ opacity: 0 }}
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/future_bg.jpg)`,
          backgroundSize: 'cover',
        }}
      />
      <SafeFrame className="flex flex-col items-center justify-center relative z-10 w-full h-full">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          className="text-center mb-[8vh] w-full"
        >
          <div className="inline-flex items-center gap-[1vw] px-[1.5vw] py-[1vh] rounded-full bg-white/10 border border-white/20 mb-[3vh]">
            <Leaf className="w-[1.5vw] h-[1.5vw]" />
            <span className="font-semibold uppercase tracking-widest text-[1vw]">Integrative Medicine</span>
          </div>
          <VideoText as="h2" scale="heading" className="font-bold mb-[2vh]">AYUSH History Built-In</VideoText>
          <VideoText scale="body" className="text-teal-100 max-w-[60vw] mx-auto">
            Capturing Dashavidha Pariksha, dietary habits, and systemic constitution directly from the patient.
          </VideoText>
        </motion.div>

        <motion.div exit={{ opacity: 0, scale: 0.9 }} className="grid grid-cols-2 gap-[3vw] w-[60vw]">
          {ayushTraits.map((trait, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.15, type: 'spring' }}
              className="bg-white text-slate-800 rounded-[1.5vw] p-[2vw] flex items-center gap-[1.5vw] shadow-2xl"
            >
              <div className={`w-[5vw] h-[5vw] rounded-full ${trait.bg} flex items-center justify-center shrink-0`}>
                <trait.icon className={`w-[2.5vw] h-[2.5vw] ${trait.color}`} />
              </div>
              <div>
                <p className="text-[1vw] font-bold uppercase text-slate-400 tracking-wider mb-[0.5vh]">{trait.title}</p>
                <p className="text-[1.8vw] font-bold text-slate-800">{trait.val}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </SafeFrame>
    </SceneLayout>
  );
}
