import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import {
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { CHAR_LIMITS } from '../constants.js';
import MarkdownContent from './MarkdownContent.jsx';

const MODES = ['Write', 'Preview'];

function ModeToggle({ mode, onChange }) {
  return (
    <div className="inline-flex rounded-md bg-zinc-100 dark:bg-zinc-800 p-0.5">
      {MODES.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
            mode === m
              ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-sm'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

/**
 * Markdown notes with a Write/Preview toggle and a full-screen editor.
 *
 * Draft state is local; `onSave` fires on blur and when the full-screen editor
 * closes, matching the save-on-blur behaviour of InlineEditableField elsewhere
 * in the panel. Escape reverts the draft rather than saving it.
 */
export default function NotesEditor({ value = '', onSave, maxLength = CHAR_LIMITS.notes }) {
  const [draft, setDraft] = useState(value ?? '');
  const [mode, setMode] = useState('Write');
  const [fullscreen, setFullscreen] = useState(false);
  const textareaRef = useRef(null);
  const fullscreenRef = useRef(null);

  // Re-sync when the job changes underneath us, or when another surface saves
  // notes — but never while the user is mid-edit in the full-screen editor.
  useEffect(() => {
    if (fullscreen) return;
    setDraft(value ?? '');
  }, [value, fullscreen]);

  const commit = useCallback(() => {
    const next = draft ?? '';
    if (next === (value ?? '')) return;
    onSave(next);
  }, [draft, value, onSave]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setDraft(value ?? '');
      e.currentTarget.blur();
    }
  };

  const openFullscreen = () => {
    setFullscreen(true);
    setTimeout(() => fullscreenRef.current?.focus(), 50);
  };

  const closeFullscreen = () => {
    commit();
    setFullscreen(false);
  };

  const charCountClass = draft.length >= maxLength
    ? 'text-red-500 dark:text-red-400'
    : 'text-zinc-400 dark:text-zinc-500';

  const editor = (ref, className) => (
    <textarea
      ref={ref}
      value={draft}
      maxLength={maxLength}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      placeholder="Add notes... Markdown supported — **bold**, - lists, [links](https://), `code`"
      className={`w-full resize-none bg-transparent text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none ${className}`}
    />
  );

  const preview = (className = '') => (
    draft.trim()
      ? <MarkdownContent className={className}>{draft}</MarkdownContent>
      : <p className={`text-sm text-zinc-400 dark:text-zinc-500 ${className}`}>Nothing to preview yet.</p>
  );

  return (
    <>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Notes
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle mode={mode} onChange={setMode} />
          <button
            type="button"
            onClick={openFullscreen}
            title="Edit full screen"
            aria-label="Edit notes full screen"
            className="rounded-sm p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-950/5 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-white/5 transition-colors"
          >
            <ArrowsPointingOutIcon className="size-4" />
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-950/5 dark:ring-white/5 px-3 py-2">
        {mode === 'Write'
          ? editor(textareaRef, 'min-h-24 field-sizing-content')
          : <div className="min-h-24">{preview()}</div>}
      </div>

      {draft.length > maxLength * 0.9 && (
        <p className={`mt-1 text-right text-xs ${charCountClass}`}>
          {draft.length.toLocaleString()} / {maxLength.toLocaleString()}
        </p>
      )}

      <Transition show={fullscreen} appear as={Fragment}>
        <Dialog onClose={closeFullscreen} className="relative z-[60]">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
          >
            <DialogBackdrop className="fixed inset-0 bg-zinc-950/40 dark:bg-zinc-950/70" />
          </TransitionChild>

          <div className="fixed inset-0 p-0 sm:p-6 lg:p-10">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200" enterFrom="opacity-0 scale-[0.99]" enterTo="opacity-100 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-[0.99]"
            >
              <DialogPanel className="flex h-full w-full flex-col overflow-hidden bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-zinc-950/10 dark:ring-white/10 sm:rounded-xl">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-950/5 dark:border-white/5 px-5 py-3">
                  <h2 className="text-base/7 font-semibold text-zinc-950 dark:text-white">Notes</h2>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${charCountClass}`}>
                      {draft.length.toLocaleString()} / {maxLength.toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={closeFullscreen}
                      title="Exit full screen"
                      aria-label="Exit full screen"
                      className="rounded-sm p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-950/5 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-white/5 transition-colors"
                    >
                      <ArrowsPointingInIcon className="size-5" />
                    </button>
                    <button
                      type="button"
                      onClick={closeFullscreen}
                      aria-label="Close"
                      className="rounded-sm p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-950/5 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-white/5 transition-colors"
                    >
                      <XMarkIcon className="size-5" />
                    </button>
                  </div>
                </div>

                {/* Side-by-side on wide screens, toggled on narrow ones. */}
                <div className="flex min-h-0 flex-1 flex-col md:flex-row">
                  <div className={`min-h-0 flex-1 flex-col md:flex ${mode === 'Preview' ? 'hidden md:flex' : 'flex'}`}>
                    <div className="flex items-center justify-between px-5 pt-3 md:hidden">
                      <ModeToggle mode={mode} onChange={setMode} />
                    </div>
                    <div className="hidden md:block px-5 pt-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Write
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
                      {editor(fullscreenRef, 'h-full min-h-full')}
                    </div>
                  </div>

                  <div className={`min-h-0 flex-1 flex-col border-zinc-950/5 dark:border-white/5 md:flex md:border-l ${mode === 'Write' ? 'hidden md:flex' : 'flex'}`}>
                    <div className="flex items-center justify-between px-5 pt-3 md:hidden">
                      <ModeToggle mode={mode} onChange={setMode} />
                    </div>
                    <div className="hidden md:block px-5 pt-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Preview
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
                      {preview()}
                    </div>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
