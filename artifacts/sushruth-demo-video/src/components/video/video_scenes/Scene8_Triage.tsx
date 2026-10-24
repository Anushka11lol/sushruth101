import { motion } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText } from '@/lib/video';
import { Globe, MapPin, AlertTriangle, Stethoscope } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Scene8_Triage() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 2500),
      setTimeout(() => setStep(2), 5000),
      setTimeout(() => setStep(3), 8000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <SceneLayout className="bg-[var(--color-brand-bg)]" layout="center">
      <SafeFrame className="flex flex-col items-center justify-center pt-[5vh] w-full h-full relative">
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="text-center mb-[6vh] flex flex-col items-center"
        >
          <div className="bg-indigo-100 text-indigo-700 px-[1.5vw] py-[0.8vh] rounded-full text-[1.2vw] font-bold flex items-center gap-[0.5vw] mb-[2vh]">
            <Globe className="w-[1.2vw] h-[1.2vw]" /> Multilingual Support
          </div>
          <VideoText as="h2" scale="heading" className="font-bold">AI Triage & Localization</VideoText>
        </motion.div>

        <motion.div exit={{ opacity: 0, scale: 0.95 }} className="flex flex-row gap-[5vw] w-[80vw]">
          
          {/* Input side */}
          <div className="flex-[1] flex flex-col gap-[3vh]">
            <motion.div 
              initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
              className="bg-white p-[2vw] rounded-[1.5vw] shadow-lg border border-slate-200 relative"
            >
              <h3 className="text-[1vw] font-bold text-slate-400 uppercase tracking-widest mb-[2vh]">Input Symptom</h3>
              <div className="bg-slate-50 p-[2vw] rounded-[1vw] text-[1.8vw] font-serif text-slate-800 border border-slate-100 min-h-[12vh] flex items-center">
                 "मला कालपासून खूप ताप आहे आणि खोकला येत आहे."
              </div>
              <div className="absolute right-[2vw] bottom-[2.5vh] bg-[var(--color-brand-teal)] text-white px-[1vw] py-[0.5vh] rounded-[0.5vw] text-[1vw] font-bold shadow-md">
                Marathi
              </div>
            </motion.div>
            
            {/* Translation mapping */}
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={step >= 1 ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
              className="bg-slate-800 text-white p-[2vw] rounded-[1.5vw] shadow-lg overflow-hidden"
            >
              <p className="text-[1vw] font-bold text-slate-400 uppercase tracking-widest mb-[1vh]">Translation / Intent</p>
              <p className="text-[1.5vw]">"I have had a high fever and cough since yesterday."</p>
            </motion.div>
          </div>

          {/* Results Side */}
          <div className="flex-[1] flex flex-col gap-[3vh]">
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={step >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
              className="bg-orange-50 border border-orange-200 p-[2vw] rounded-[1.5vw] shadow-lg"
            >
              <div className="flex items-center gap-[1.5vw] mb-[1.5vh]">
                <div className="bg-orange-100 p-[1vw] rounded-full text-orange-600 shrink-0">
                  <Stethoscope className="w-[2vw] h-[2vw]" />
                </div>
                <div>
                  <h3 className="text-[1vw] font-bold text-orange-600 uppercase tracking-widest">Urgency: Moderate</h3>
                  <p className="text-[1.8vw] font-bold text-slate-800">General Physician</p>
                </div>
              </div>
              <p className="text-slate-600 text-[1.2vw]">Schedule a clinic visit soon.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={step >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              className="bg-white border border-slate-200 p-[2vw] rounded-[1.5vw] shadow-lg"
            >
              <h3 className="text-[1vw] font-bold text-slate-400 uppercase tracking-widest mb-[2vh] flex items-center gap-[0.5vw]">
                <MapPin className="w-[1.5vw] h-[1.5vw] text-blue-500" /> Facility Locator
              </h3>
              
              <div className="space-y-[1.5vh]">
                {[
                  { name: "City Care Clinic", dist: "1.2 km" },
                  { name: "Medicare General Hospital", dist: "3.5 km" }
                ].map((clinic, i) => (
                  <div key={i} className="flex justify-between items-center p-[1vw] bg-slate-50 rounded-[0.8vw] border border-slate-100">
                    <p className="font-bold text-slate-700 text-[1.2vw]">{clinic.name}</p>
                    <p className="text-[1vw] text-[var(--color-brand-teal)] font-semibold">{clinic.dist}</p>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ delay: 1 }}
          className="absolute bottom-[4vh] w-[70vw] bg-amber-50 border border-amber-200 p-[1.5vw] rounded-[1vw] flex items-center gap-[1.5vw] shadow-md"
        >
          <AlertTriangle className="w-[3vw] h-[3vw] text-amber-600 shrink-0" />
          <p className="text-amber-800 font-medium text-[1.2vw] leading-snug">
            Sushruth assists with triage and structuring information, not diagnosis. Clinical decisions and final diagnoses remain exclusively with the doctor.
          </p>
        </motion.div>

      </SafeFrame>
    </SceneLayout>
  );
}
