import { motion } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText } from '@/lib/video';
import { Baby, Pill, FileText, Activity } from 'lucide-react';

export function Scene9_Supporting() {
  const features = [
    { title: "Child Health", desc: "Vaccination tracking & growth charts", icon: Baby, color: "text-pink-500", bg: "bg-pink-50" },
    { title: "Medication Management", desc: "Smart reminders & adherence logs", icon: Pill, color: "text-purple-500", bg: "bg-purple-50" },
    { title: "Medical Reports", desc: "Centralized lab & document storage", icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
    { title: "Health Tracker", desc: "Daily vitals & wellness insights", icon: Activity, color: "text-green-500", bg: "bg-green-50" },
  ];

  return (
    <SceneLayout className="bg-[var(--color-brand-bg)]" layout="center">
      <SafeFrame className="flex flex-col items-center justify-center w-full h-full">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-[8vh]"
        >
           <VideoText as="h2" scale="heading" className="font-bold">Comprehensive Supporting Features</VideoText>
        </motion.div>

        <motion.div exit={{ opacity: 0, scale: 0.9 }} className="grid grid-cols-2 gap-[4vw] w-[80vw]">
          {features.map((feat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.15, type: 'spring' }}
              className="ui-card p-[3vw] flex items-center gap-[2vw] hover:shadow-xl transition-shadow"
            >
              <div className={`w-[8vw] h-[8vw] rounded-[1.5vw] flex items-center justify-center shrink-0 ${feat.bg}`}>
                <feat.icon className={`w-[4vw] h-[4vw] ${feat.color}`} />
              </div>
              <div>
                <h3 className="text-[1.8vw] font-bold text-slate-800 mb-[0.5vh]">{feat.title}</h3>
                <p className="text-[1.2vw] text-slate-500">{feat.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </SafeFrame>
    </SceneLayout>
  );
}
