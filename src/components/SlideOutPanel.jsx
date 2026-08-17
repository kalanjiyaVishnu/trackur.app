import { Fragment } from 'react';
import { Dialog, DialogBackdrop, Transition, TransitionChild } from '@headlessui/react';

/**
 * Right-hand drawer. When `expanded` is true it grows to fill the viewport
 * instead, so a dense job can be worked on without the drawer's narrow column.
 * The slide-in transition is kept in both modes; only the width changes.
 */
export default function SlideOutPanel({ open, onClose, header, body, footer, expanded = false }) {
  return (
    <Transition show={open} appear as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <DialogBackdrop className="fixed inset-0 bg-zinc-950/25 dark:bg-zinc-950/50" />
        </TransitionChild>

        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div className="fixed inset-0 overflow-hidden" onClick={onClose}>
          <div className="absolute inset-0 overflow-hidden">
            <div className={`pointer-events-none fixed inset-y-0 right-0 flex max-w-full ${expanded ? '' : 'md:pl-16'}`}>
              <TransitionChild
                as={Fragment}
                enter="transform transition ease-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <div
                  className={`pointer-events-auto w-screen max-w-full transition-[max-width] duration-300 ${expanded ? '' : 'md:max-w-md'}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex h-full flex-col bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-zinc-950/10 dark:ring-white/10">
                    {header && (
                      <div className={`border-b border-zinc-950/5 dark:border-white/5 px-5 py-4 ${expanded ? 'mx-auto w-full max-w-6xl' : ''}`}>
                        {header}
                      </div>
                    )}
                    <div className="flex-1 overflow-y-auto">
                      <div className={`px-5 py-5 ${expanded ? 'mx-auto w-full max-w-6xl' : ''}`}>
                        {body}
                      </div>
                    </div>
                    {footer && (
                      <div className={`border-t border-zinc-950/5 dark:border-white/5 px-5 py-4 ${expanded ? 'mx-auto w-full max-w-6xl' : ''}`}>
                        {footer}
                      </div>
                    )}
                  </div>
                </div>
              </TransitionChild>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
