import { motion } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText } from '@/lib/video';
import { Mic, Building, Server, Database, Network } from 'lucide-react';

export function Scene13_FutureScope() {
  const scope = [
    { text: "Multi-Accent Voice Support", icon: Mic },
    { text: "Hospital Kiosk Deployment", icon: Building },
    { text: "Advanced Document Processing", icon: Server },
    { text: "ABHA & ABDM Integration", icon: Database },
    { text: "FHIR & HIS Connectivity", icon: Network },
  ];

  return (
    <SceneLayout className="bg-slate-900 text-white" layout="center">
       <motion.div
         className="absolute inset-0 opacity-40 mix-blend-screen"
         exit={{ opacity: 0 }}
         style={{
           backgroundImage: `url(${import.meta.env.BASE_URL}images/future_bg.jpg)`,
           backgroundSize: 'cover',
           backgroundPosition: 'center',
         }}
       />
       <SafeFrame className="flex flex-col items-center justify-center relative z-10 w-full h-full">
         
         <motion.div
           initial={{ scale: 0.9, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           exit={{ opacity: 0, scale: 0.9 }}
           className="bg-red-500 text-white px-[2vw] py-[1vh] rounded-full font-bold uppercase tracking-widest text-[1.2vw] mb-[6vh] shadow-[0_0_20px_rgba(239,68,68,0.5)]"
         >
           Future Scope
         </motion.div>

         <motion.div exit={{ opacity: 0, y: -20 }}>
           <VideoText as="h2" scale="heading" className="font-bold mb-[8vh] text-center">
             Scaling Beyond Case-Taking
           </VideoText>
         </motion.div>

         <motion.div exit={{ opacity: 0, scale: 0.9 }} className="grid grid-cols-2 gap-[4vw] w-[80vw]">
           {scope.map((item, i) => (
             <motion.div
               key={i}
               initial={{ opacity: 0, x: -30 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.8 + i * 0.2 }}
               className={`flex items-center gap-[2vw] p-[3vw] rounded-[1.5vw] bg-white/10 backdrop-blur-md border border-white/20
                 ${i === scope.length - 1 ? 'col-span-2 w-[50vw] mx-auto' : ''}`}
             >
               <div className="w-[6vw] h-[6vw] rounded-full bg-[var(--color-brand-teal)] flex items-center justify-center shrink-0">
                 <item.icon className="w-[3vw] h-[3vw] text-white" />
               </div>
               <span className="text-[2vw] font-semibold">{item.text}</span>
             </motion.div>
           ))}
         </motion.div>

       </SafeFrame>
    </SceneLayout>
  );
}
