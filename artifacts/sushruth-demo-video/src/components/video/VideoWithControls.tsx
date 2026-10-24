import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  Repeat,
  Volume2,
  VolumeX,
} from 'lucide-react';
import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { useSceneControls } from './useSceneControls';

const SCENE_DETAILS: Record<string, { title: string; filePath: string }> = {
  intro: { title: 'Team Invalid Syntax', filePath: 'src/components/video/video_scenes/Scene1_Intro.tsx' },
  problem: { title: 'The Problem', filePath: 'src/components/video/video_scenes/Scene2_Problem.tsx' },
  pre_consultation: { title: 'Pre-Consultation', filePath: 'src/components/video/video_scenes/Scene3_PreConsultation.tsx' },
  ai_history: { title: 'Adaptive History', filePath: 'src/components/video/video_scenes/Scene4_AIHistory.tsx' },
  ayush: { title: 'AYUSH History', filePath: 'src/components/video/video_scenes/Scene5_AYUSH.tsx' },
  summary: { title: 'Physician Summary', filePath: 'src/components/video/video_scenes/Scene6_Summary.tsx' },
  doc_intelligence: { title: 'Document Intelligence', filePath: 'src/components/video/video_scenes/Scene7_DocIntelligence.tsx' },
  triage: { title: 'Multilingual Triage', filePath: 'src/components/video/video_scenes/Scene8_Triage.tsx' },
  supporting: { title: 'Daily Health Tools', filePath: 'src/components/video/video_scenes/Scene9_Supporting.tsx' },
  care_circle: { title: 'Care Network', filePath: 'src/components/video/video_scenes/Scene10_CareCircle.tsx' },
  doctor_portal: { title: 'Doctor Review', filePath: 'src/components/video/video_scenes/Scene11_DoctorPortal.tsx' },
  workflow: { title: 'Complete Workflow', filePath: 'src/components/video/video_scenes/Scene12_Workflow.tsx' },
  future_scope: { title: 'Future Scope', filePath: 'src/components/video/video_scenes/Scene13_FutureScope.tsx' },
  closing: { title: 'Closing', filePath: 'src/components/video/video_scenes/Scene14_Closing.tsx' },
};

const PROGRESS_TICK_MS = 60;

function formatTime(durationMs: number): string {
  const seconds = Math.max(0, Math.floor(durationMs / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function announceSceneSelection(index: number, sceneKeys: string[]) {
  const details = SCENE_DETAILS[sceneKeys[index]];
  if (!details?.filePath) return;
  window.parent.postMessage({
    type: 'REPLIT_VIDEO_SCENE_SELECTED',
    payload: {
      sceneIndex: index,
      sceneCount: sceneKeys.length,
      sceneTitle: details.title,
      filePath: details.filePath,
      lineNumber: 1,
    },
  }, '*');
}

function PlaybackStatus({
  sceneKeys,
  activeIndex,
  activeDuration,
  activeStartTime,
  totalDuration,
  tick,
  paused,
  onJumpTo,
}: {
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  activeStartTime: number;
  totalDuration: number;
  tick: number;
  paused: boolean;
  onJumpTo: (index: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const elapsedBaseRef = useRef(0);

  useEffect(() => {
    setElapsed(0);
    elapsedBaseRef.current = 0;
  }, [tick]);

  useEffect(() => {
    if (paused) return;
    const start = performance.now();
    const id = window.setInterval(() => {
      setElapsed(elapsedBaseRef.current + performance.now() - start);
    }, PROGRESS_TICK_MS);
    return () => {
      window.clearInterval(id);
      elapsedBaseRef.current += performance.now() - start;
    };
  }, [tick, paused]);

  const progress = activeDuration ? Math.min(1, elapsed / activeDuration) : 0;
  const totalElapsed = Math.min(totalDuration, activeStartTime + Math.min(elapsed, activeDuration));

  return (
    <>
      <div className="flex flex-1 items-center gap-1">
        {sceneKeys.map((key, index) => (
          <button
            key={key}
            type="button"
            onClick={() => onJumpTo(index)}
            className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/20 transition-all hover:h-4 hover:bg-white/25"
            aria-label={`Jump to ${SCENE_DETAILS[key]?.title ?? `scene ${index + 1}`}`}
            aria-current={index === activeIndex ? 'true' : undefined}
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-white/90 transition-[width] duration-100"
              style={{ width: `${index === activeIndex ? progress * 100 : 0}%` }}
            />
          </button>
        ))}
      </div>
      <span className="shrink-0 font-mono text-lg text-white/70">
        {activeIndex + 1}/{sceneKeys.length}
      </span>
      <span className="min-w-[11ch] shrink-0 text-right font-mono text-lg tabular-nums text-white/85">
        {formatTime(totalElapsed)} / {formatTime(totalDuration)}
      </span>
    </>
  );
}

export default function VideoWithControls() {
  const isIframed = typeof window !== 'undefined' && window.self !== window.top;
  if (!isIframed) return <VideoTemplate />;

  const controls = useSceneControls(SCENE_DURATIONS);
  const sensorRef = useRef<HTMLDivElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [tapPinned, setTapPinned] = useState(false);

  const handleJumpTo = useCallback((index: number) => {
    controls.jumpTo(index);
    announceSceneSelection(index, controls.sceneKeys);
  }, [controls.jumpTo, controls.sceneKeys]);

  useEffect(() => {
    if (!controls.paused) return;
    const frozen = document.getAnimations().filter((animation) => animation.playState === 'running');
    frozen.forEach((animation) => animation.pause());
    return () => frozen.forEach((animation) => animation.play());
  }, [controls.paused]);

  useEffect(() => {
    if (!(collapsed && tapPinned)) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      if (sensorRef.current && !sensorRef.current.contains(event.target as Node)) setTapPinned(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [collapsed, tapPinned]);

  const visible = !collapsed || hovering || tapPinned;

  return (
    <div className="relative h-screen w-full">
      <VideoTemplate
        key={controls.mountKey}
        durations={controls.durations}
        paused={controls.paused}
        muted={muted}
        onSceneChange={controls.onSceneChange}
      />
      <div
        ref={sensorRef}
        className="absolute inset-x-0 bottom-0 z-50 flex h-1/4 flex-col justify-end"
        onPointerEnter={(event) => event.pointerType === 'mouse' && setHovering(true)}
        onPointerLeave={(event) => event.pointerType === 'mouse' && setHovering(false)}
        onPointerDown={(event) => event.pointerType !== 'mouse' && collapsed && setTapPinned(true)}
      >
        <div className="flex-1" aria-hidden="true" />
        <div className={`flex items-center gap-3 bg-black/55 px-5 py-4 backdrop-blur-md transition-all duration-200 ${
          visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
        }`}>
          <button type="button" onClick={controls.togglePause} className="grid h-14 w-14 shrink-0 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white" aria-label={controls.paused ? 'Play' : 'Pause'}>
            {controls.paused ? <Play className="h-8 w-8" /> : <Pause className="h-8 w-8" />}
          </button>
          <button type="button" onClick={controls.toggleLock} className={`grid h-14 w-14 shrink-0 place-items-center rounded-lg ${controls.locked ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`} aria-label="Loop current scene" aria-pressed={controls.locked}>
            <Repeat className="h-8 w-8" />
          </button>
          <button type="button" onClick={() => setMuted((value) => !value)} className="grid h-14 w-14 shrink-0 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white" aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? <VolumeX className="h-8 w-8" /> : <Volume2 className="h-8 w-8" />}
          </button>
          <div className="w-px self-stretch bg-white/15" />
          <PlaybackStatus
            sceneKeys={controls.sceneKeys}
            activeIndex={controls.activeIndex}
            activeDuration={controls.activeDuration}
            activeStartTime={controls.activeStartTime}
            totalDuration={controls.totalDuration}
            tick={controls.tick}
            paused={controls.paused}
            onJumpTo={handleJumpTo}
          />
          <button
            type="button"
            onClick={() => {
              if (!collapsed) {
                setHovering(false);
                setTapPinned(false);
              }
              setCollapsed((value) => !value);
            }}
            className="grid h-14 w-14 shrink-0 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
            aria-label={collapsed ? 'Show controls' : 'Hide controls'}
          >
            {collapsed ? <ChevronUp className="h-10 w-10" /> : <ChevronDown className="h-10 w-10" />}
          </button>
        </div>
      </div>
    </div>
  );
}