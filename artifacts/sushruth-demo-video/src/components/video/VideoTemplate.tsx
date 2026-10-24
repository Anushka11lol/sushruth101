import { useEffect, useRef, type ComponentType } from 'react';
import {
  VideoCanvas,
  VideoPausedContext,
  type VideoAspectRatio,
  useVideoPlayer,
} from '@/lib/video';
import { AnimatePresence } from 'framer-motion';

import { Scene1_Intro } from './video_scenes/Scene1_Intro';
import { Scene2_Problem } from './video_scenes/Scene2_Problem';
import { Scene3_PreConsultation } from './video_scenes/Scene3_PreConsultation';
import { Scene4_AIHistory } from './video_scenes/Scene4_AIHistory';
import { Scene5_AYUSH } from './video_scenes/Scene5_AYUSH';
import { Scene6_Summary } from './video_scenes/Scene6_Summary';
import { Scene7_DocIntelligence } from './video_scenes/Scene7_DocIntelligence';
import { Scene8_Triage } from './video_scenes/Scene8_Triage';
import { Scene9_Supporting } from './video_scenes/Scene9_Supporting';
import { Scene10_CareCircle } from './video_scenes/Scene10_CareCircle';
import { Scene11_DoctorPortal } from './video_scenes/Scene11_DoctorPortal';
import { Scene12_Workflow } from './video_scenes/Scene12_Workflow';
import { Scene13_FutureScope } from './video_scenes/Scene13_FutureScope';
import { Scene14_Closing } from './video_scenes/Scene14_Closing';

export const SCENE_DURATIONS: Record<string, number> = {
  intro: 10000,
  problem: 12000,
  pre_consultation: 9000,
  ai_history: 13000,
  ayush: 9000,
  summary: 9000,
  doc_intelligence: 14000,
  triage: 18000,
  supporting: 12000,
  care_circle: 10000,
  doctor_portal: 10000,
  workflow: 15000,
  future_scope: 11000,
  closing: 12000,
};

const VIDEO_ASPECT_RATIO: VideoAspectRatio = '16:9';

const SCENE_COMPONENTS: Record<string, ComponentType> = {
  intro: Scene1_Intro,
  problem: Scene2_Problem,
  pre_consultation: Scene3_PreConsultation,
  ai_history: Scene4_AIHistory,
  ayush: Scene5_AYUSH,
  summary: Scene6_Summary,
  doc_intelligence: Scene7_DocIntelligence,
  triage: Scene8_Triage,
  supporting: Scene9_Supporting,
  care_circle: Scene10_CareCircle,
  doctor_portal: Scene11_DoctorPortal,
  workflow: Scene12_Workflow,
  future_scope: Scene13_FutureScope,
  closing: Scene14_Closing,
};

const SCENE_START_SEC = (() => {
  const result: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, duration] of Object.entries(SCENE_DURATIONS)) {
    result[key] = cumulativeMs / 1000;
    cumulativeMs += duration;
  }
  return result;
})();

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  paused = false,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  paused?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop, paused });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSceneKeyRef = useRef<string | null>(null);
  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (paused) {
      audio.pause();
      return;
    }
    if (lastSceneKeyRef.current !== currentSceneKey) {
      lastSceneKeyRef.current = currentSceneKey;
      const target = SCENE_START_SEC[baseSceneKey] ?? 0;
      if (Math.abs(audio.currentTime - target) > 0.18) audio.currentTime = target;
    }
    audio.play().catch(() => {});
  }, [baseSceneKey, currentSceneKey, muted, paused]);

  return (
    <VideoPausedContext.Provider value={paused}>
      <VideoCanvas aspectRatio={VIDEO_ASPECT_RATIO} className="bg-[#FCFAF8] overflow-hidden">
        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>
        <audio
          ref={audioRef}
          src={`${import.meta.env.BASE_URL}audio/composite_audio.mp3`}
          preload="auto"
          autoPlay
          muted={muted}
        />
      </VideoCanvas>
    </VideoPausedContext.Provider>
  );
}
