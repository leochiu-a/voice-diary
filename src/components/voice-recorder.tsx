import { useState } from "react";
import { Drawer } from "@base-ui/react/drawer";
import { Popover } from "@base-ui/react/popover";
import { CheckIcon, XIcon } from "lucide-react";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { joinTranscripts } from "@/lib/voice-notes";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useVoiceRecording } from "@/hooks/use-voice-recording";
import { Waveform } from "./waveform";

// Matches Tailwind's `md`, where the toolbar shows its Record button.
const WIDE_QUERY = "(min-width: 48rem)";

export type RecorderPopover = Popover.Handle<unknown>;
export const createRecorderPopover = (): RecorderPopover => Popover.createHandle();

// Both Record buttons, the toolbar's and the phone's, are a glass pill with
// this dot: red like the recorder's own button, leaving purple to Done.
function RecordDot() {
  return <span aria-hidden className="size-2.5 rounded-full bg-destructive" />;
}

// The toolbar's Record button, shown on wide screens: a labeled pill, so the
// app's main action stands out from the icon buttons.
export function RecordButton({ popover }: { popover: RecorderPopover }) {
  return (
    <Popover.Trigger
      handle={popover}
      render={
        <Button
          variant="glass"
          size="sm"
          aria-label="Record a voice note"
          className="hidden h-9 gap-2 rounded-full px-3.5 md:inline-flex"
        />
      }
    >
      <RecordDot />
      Record
    </Popover.Trigger>
  );
}

// On phones, a Record button opens the recorder as a sheet inside
// `sheetContainer`, centered over it. Given `popover`, wide screens open it
// instead from that handle's trigger (the toolbar's Record button), as a
// popover. Either way the recording lives here, so it survives the window
// crossing between the two.
export function VoiceRecorder({
  entryId,
  entryDate,
  sheetContainer,
  popover: handle,
}: {
  entryId: string;
  entryDate: string;
  sheetContainer?: HTMLElement | null;
  popover?: RecorderPopover;
}) {
  const wide = useMediaQuery(WIDE_QUERY);
  const popover = wide ? handle : undefined;
  const [open, setOpen] = useState(false);
  const { status, elapsed, parts, levels, error, press, release, cancel, finish } =
    useVoiceRecording({ entryId, entryDate, onFinish: () => setOpen(false) });

  const recording = status === "holding" || status === "recording";
  const started = status !== "idle" && status !== "opening";
  const said = joinTranscripts(parts.map((part) => (part.status === "done" ? part.text : "")));
  const transcribing = parts.some((part) => part.status === "running");
  const failed = parts.some((part) => part.status === "failed");
  const errorMessage = error && (
    <p className="rounded-xl bg-popover px-3 py-2 text-center text-sm text-destructive shadow-lg">
      {error}
    </p>
  );

  const panel = (
    <>
      <p className="mt-2 text-xl text-muted-foreground tabular-nums">{formatDuration(elapsed)}</p>

      <div className="flex h-36 w-full flex-col items-center justify-center">
        {started ? (
          <Waveform levels={levels} live={recording} />
        ) : (
          <p className="text-xl font-semibold text-muted-foreground">
            Tap to record, or hold to talk
          </p>
        )}
      </div>

      {parts.length > 0 && (
        <div
          className="max-h-32 w-full overflow-y-auto text-[15px] leading-relaxed"
          aria-live="polite"
        >
          {said}
          {transcribing && (
            <span className="animate-pulse text-muted-foreground motion-reduce:animate-none">
              {said ? " …" : "Turning this into text…"}
            </span>
          )}
          {!said && !transcribing && !failed && (
            <span className="text-muted-foreground">No speech detected yet.</span>
          )}
          {failed && (
            <p className="mt-1 text-[13px] text-muted-foreground">
              Part of this couldn&apos;t be turned into text. The whole recording will be
              transcribed when you finish.
            </p>
          )}
        </div>
      )}
      {error && <div className="mt-3 w-full">{errorMessage}</div>}

      {/* Pressing and dragging here records; it must not swipe the sheet. */}
      <div
        data-base-ui-swipe-ignore
        className="mt-6 grid w-full grid-cols-[1fr_auto_1fr] items-center"
      >
        <div className="flex justify-start">
          {started && (
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Discard recording"
              title="Discard recording"
              className="size-12 rounded-full text-muted-foreground"
              onClick={cancel}
            >
              <XIcon />
            </Button>
          )}
        </div>
        <button
          type="button"
          aria-busy={status === "opening" || undefined}
          aria-label={
            status === "holding"
              ? "Recording"
              : status === "recording"
                ? "Pause recording"
                : status === "paused"
                  ? "Continue recording"
                  : "Record"
          }
          title={recording ? undefined : "Tap to record, or hold and let go to pause"}
          className="flex size-14 touch-none items-center justify-center rounded-full border-[3px] border-foreground/15 select-none [-webkit-touch-callout:none] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            void press();
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onContextMenu={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if (event.key !== " " && event.key !== "Enter") return;
            event.preventDefault();
            if (!event.repeat) void press();
          }}
          onKeyUp={(event) => {
            if (event.key !== " " && event.key !== "Enter") return;
            event.preventDefault();
            release();
          }}
        >
          {/* One shape that morphs: a dot to record, a square to pause. */}
          <span
            className={cn(
              "bg-destructive transition-all duration-300 ease-out motion-reduce:transition-none",
              status === "recording"
                ? "size-6 rounded-md"
                : status === "holding"
                  ? "size-10 rounded-full"
                  : "size-11 rounded-full",
              status === "opening" && "animate-pulse motion-reduce:animate-none",
            )}
          />
        </button>
        <div className="flex justify-end">
          {status === "paused" && (
            <Button
              size="icon-lg"
              aria-label="Finish recording"
              title="Finish recording"
              className="size-12 rounded-full"
              onClick={() => void finish()}
            >
              <CheckIcon />
            </Button>
          )}
        </div>
      </div>
    </>
  );

  function onOpenChange(next: boolean, details: { cancel: () => void }) {
    // A recording in progress is finished or discarded with its buttons, not
    // lost to a swipe, Esc or a click outside.
    if (!next && started) return details.cancel();
    setOpen(next);
  }

  // A recording that couldn't be saved reports it after the panel closed.
  const lateError = error && !open && (
    <div className="absolute bottom-full left-1/2 mb-4 w-80 max-w-[calc(100vw-2.5rem)] -translate-x-1/2">
      {errorMessage}
    </div>
  );

  // Wide screens open the panel from the toolbar's Record button, as a popover
  // under it; the page's own bottom button is for phones.
  if (popover) {
    return (
      <Popover.Root handle={popover} open={open} onOpenChange={onOpenChange}>
        <div className="relative">{lateError}</div>
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="center" sideOffset={8} className="z-50">
            <Popover.Popup className="flex w-96 origin-(--transform-origin) flex-col items-center rounded-[2rem] glass bg-card/90 px-6 pt-5 pb-6 transition-[opacity,scale] duration-200 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
              <Popover.Title className="sr-only">Voice note</Popover.Title>
              {panel}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  return (
    // Focus stays in the sheet, but the page isn't scroll-locked: locking it
    // reserves an empty scrollbar gutter on desktop.
    <Drawer.Root modal="trap-focus" open={open} onOpenChange={onOpenChange}>
      <div className="relative">
        <Drawer.Trigger
          render={
            <Button
              variant="glass"
              size="sm"
              className={cn(
                "h-12 gap-2 rounded-full px-5 text-[15px]",
                // Hidden from the first paint, before the media query is read.
                handle && "md:hidden",
              )}
            />
          }
          aria-label="Record a voice note"
        >
          <RecordDot />
          Record
        </Drawer.Trigger>
        {lateError}
      </div>
      <Drawer.Portal container={sheetContainer}>
        <Drawer.Backdrop className="pointer-events-auto fixed inset-0 bg-black/10 opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0" />
        <Drawer.Viewport className="pointer-events-auto absolute inset-x-0 bottom-0 z-50 flex items-end justify-center px-2.5 pb-[max(env(safe-area-inset-bottom),0.625rem)] max-md:-inset-x-5">
          <Drawer.Popup className="flex w-full max-w-md [transform:translateY(var(--drawer-swipe-movement-y))] flex-col items-center rounded-[2.25rem] glass bg-card/90 px-6 pt-3 pb-8 transition-transform duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-ending-style:[transform:translateY(calc(100%+2rem))] data-starting-style:[transform:translateY(calc(100%+2rem))] data-swiping:select-none">
            <div className="mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
            <Drawer.Title className="sr-only">Voice note</Drawer.Title>
            <Drawer.Content className="flex w-full flex-col items-center">{panel}</Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
