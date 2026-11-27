"use client";

import { useFormState } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { ORIENTATION_MODULES } from "@/lib/domain/mentor-orientation";
import { orientationVideoAction, type MState } from "../actions";

const INITIAL_STATE: MState = {};

export function OrientationVideos({ completed, orientationDone }: { completed: string[]; orientationDone: boolean }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-[18px] border border-line">
      {ORIENTATION_MODULES.map((module) => (
        <VideoLesson
          key={module.id}
          module={module}
          done={orientationDone || completed.includes(module.id)}
        />
      ))}
    </div>
  );
}

function VideoLesson({ module, done }: { module: (typeof ORIENTATION_MODULES)[number]; done: boolean }) {
  const [state, action] = useFormState(orientationVideoAction, INITIAL_STATE);
  const complete = done || !!state.ok;

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <Icon name={complete ? "check" : "play"} size={18} className={complete ? "text-forest" : "text-stone"} />
        <span className="flex-1 text-[15px] font-semibold">{module.title}</span>
        <span className="text-[13px] text-stone">{module.duration}</span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-line bg-sand/50 p-4">
        <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-[16px] border border-line bg-card px-5 py-6 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-mint text-mint-ink"><Icon name="play" size={20} /></span>
          <p className="font-semibold">Video coming soon</p>
          <p className="max-w-md text-[13.5px] leading-normal text-stone">This is a temporary placeholder for the recorded lesson. Replace it with the orientation video when it is ready.</p>
        </div>
        {complete ? (
          <p className="flex items-center gap-2 text-[14px] font-semibold text-forest"><Icon name="check" size={17} />Watched</p>
        ) : (
          <form action={action}>
            <input type="hidden" name="moduleId" value={module.id} />
            <button type="submit" className="dc-btn dc-btn-primary h-11">
              <Icon name="check" size={17} />Mark as watched
            </button>
            {state.error && <p role="alert" className="mt-2 text-[13.5px] font-semibold text-clay">{state.error}</p>}
          </form>
        )}
      </div>
    </details>
  );
}
