import { Fragment, useState, useCallback, useEffect } from 'react';
import { Dialog, DialogBackdrop, Transition, TransitionChild } from '@headlessui/react';
import { XMarkIcon, BellIcon, BellSlashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { Switch, SwitchField, Input, Field, Label, ErrorMessage } from './catalyst';
import { Button } from './catalyst';
import { CHAR_LIMITS } from '../constants.js';
import profileService from '../services/profileService.js';
import { useGDriveContext } from '../context/GDriveContext.js';

export default function SettingsModal({ open, onClose, user, profile, refreshProfile, notificationsSupported, permissionState, requestPermission }) {
  const {
    enabled: gdriveEnabled,
    connected: gdriveConnected,
    connect: onConnectGdrive,
    disconnect: onDisconnectGdrive,
  } = useGDriveContext();
  const [saving, setSaving] = useState(false);

  const profileNameValid = !!(profile?.firstName?.trim() && profile?.lastName?.trim());
  const [editingName, setEditingName] = useState(!profileNameValid);
  const [draftFirst, setDraftFirst] = useState(profile?.firstName ?? '');
  const [draftLast, setDraftLast] = useState(profile?.lastName ?? '');
  const [nameSaving, setNameSaving] = useState(false);

  useEffect(() => {
    const nameIsValid = !!(profile?.firstName?.trim() && profile?.lastName?.trim());
    if (!editingName) {
      setDraftFirst(profile?.firstName ?? '');
      setDraftLast(profile?.lastName ?? '');
    }
    if (!nameIsValid) setEditingName(true);
  }, [profile?.firstName, profile?.lastName]); // eslint-disable-line react-hooks/exhaustive-deps

  const firstEmpty = !draftFirst.trim();
  const lastEmpty = !draftLast.trim();
  const canSaveName = !firstEmpty && !lastEmpty && !nameSaving;

  const handleGuardedClose = () => {
    if (!profileNameValid) return;
    setDraftFirst(profile?.firstName ?? '');
    setDraftLast(profile?.lastName ?? '');
    setEditingName(false);
    onClose();
  };

  const handleSaveName = async () => {
    if (!canSaveName) return;
    const trimmedFirst = draftFirst.trim();
    const trimmedLast = draftLast.trim();
    setNameSaving(true);
    try {
      await profileService.updateProfile({
        id: profile.id,
        firstName: trimmedFirst,
        lastName: trimmedLast,
      });
      await refreshProfile();
      setDraftFirst(trimmedFirst);
      setDraftLast(trimmedLast);
      setEditingName(false);
    } finally {
      setNameSaving(false);
    }
  };

  const handleCancelName = () => {
    setDraftFirst(profile?.firstName ?? '');
    setDraftLast(profile?.lastName ?? '');
    setEditingName(false);
  };

  const updatePref = useCallback(async (key, value) => {
    if (!profile) return;
    setSaving(true);
    try {
      await profileService.updateProfile({ id: profile.id, [key]: value });
      await refreshProfile();
    } catch {
      // silently fail — preference will reset on next load
    } finally {
      setSaving(false);
    }
  }, [profile, refreshProfile]);

  const handleEnableNotifications = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      // Ensure all toggles are on by default when first enabling
      if (profile && !profile.notifyDueToday && !profile.notifyOverdue && !profile.notifyDueTomorrow) {
        await profileService.updateProfile({
          id: profile.id,
          notifyDueToday: true,
          notifyOverdue: true,
          notifyDueTomorrow: true,
        });
        await refreshProfile();
      }
    }
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={handleGuardedClose} className="relative z-50">
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

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full md:pl-16">
              <TransitionChild
                as={Fragment}
                enter="transform transition ease-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <div className="pointer-events-auto w-screen max-w-full md:max-w-md">
                  <div className="flex h-full flex-col bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-zinc-950/10 dark:ring-white/10">
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-zinc-950/5 dark:border-white/5">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base/7 font-semibold text-zinc-950 dark:text-white">
                          Settings
                        </h2>
                        <button
                          type="button"
                          onClick={handleGuardedClose}
                          className="rounded-sm p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-950/5 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-white/5 transition-colors"
                        >
                          <XMarkIcon className="size-5" />
                        </button>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-8">
                      {/* Account section */}
                      <section>
                        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                          Account
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Name</p>
                            {!editingName ? (
                              <div
                                className="group/field flex items-center gap-1 min-w-0 cursor-pointer border-b border-transparent hover:border-mauve-400 dark:hover:border-mauve-500 transition-colors"
                                onClick={() => setEditingName(true)}
                                title="Edit Name"
                              >
                                <span className="min-w-0 flex-1 truncate text-sm text-zinc-950 dark:text-white">
                                  {profile?.firstName} {profile?.lastName}
                                </span>
                                <PencilIcon className="h-4 w-4 shrink-0 text-zinc-400 opacity-0 group-hover/field:opacity-100 dark:text-zinc-500 transition-opacity" />
                              </div>
                            ) : (
                              <div className="mt-1 space-y-3">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <Field>
                                    <Label>First Name</Label>
                                    <Input
                                      type="text"
                                      name="firstName"
                                      required
                                      maxLength={CHAR_LIMITS.firstName}
                                      value={draftFirst}
                                      onChange={(e) => setDraftFirst(e.target.value)}
                                      placeholder="First name"
                                    />
                                    {firstEmpty && <ErrorMessage>First name is required</ErrorMessage>}
                                  </Field>
                                  <Field>
                                    <Label>Last Name</Label>
                                    <Input
                                      type="text"
                                      name="lastName"
                                      required
                                      maxLength={CHAR_LIMITS.lastName}
                                      value={draftLast}
                                      onChange={(e) => setDraftLast(e.target.value)}
                                      placeholder="Last name"
                                    />
                                    {lastEmpty && <ErrorMessage>Last name is required</ErrorMessage>}
                                  </Field>
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                  {profileNameValid && (
                                    <Button plain onClick={handleCancelName} disabled={nameSaving}>
                                      Cancel
                                    </Button>
                                  )}
                                  <Button
                                    color="violet"
                                    onClick={handleSaveName}
                                    disabled={!canSaveName}
                                  >
                                    Save
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Email</p>
                            <p className="text-sm text-zinc-950 dark:text-white">{user?.email}</p>
                          </div>
                        </div>
                      </section>

                      {/* Integrations section */}
                      {gdriveEnabled && (
                        <section>
                          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                            Integrations
                          </h3>
                          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-950/5 dark:ring-white/5 p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-zinc-950 dark:text-white">
                                  Google Drive
                                </p>
                                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                  {gdriveConnected
                                    ? 'Link resumes from your Google Drive to jobs.'
                                    : 'Connect to link resumes from your Google Drive.'}
                                </p>
                              </div>
                              <div className="shrink-0">
                                {gdriveConnected ? (
                                  <Button plain onClick={onDisconnectGdrive} className="text-xs">
                                    Disconnect
                                  </Button>
                                ) : (
                                  <Button color="violet" onClick={onConnectGdrive} className="text-xs">
                                    Connect
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </section>
                      )}

                      {/* Notifications section */}
                      <section>
                        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                          Notifications
                        </h3>

                        {!notificationsSupported ? (
                          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-950/5 dark:ring-white/5 p-4">
                            <div className="flex items-start gap-3">
                              <BellSlashIcon className="size-5 text-zinc-500 dark:text-zinc-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                                  Browser notifications are not supported in this browser.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : permissionState === 'denied' ? (
                          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-950/5 dark:ring-white/5 p-4">
                            <div className="flex items-start gap-3">
                              <BellSlashIcon className="size-5 text-zinc-500 dark:text-zinc-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                                  Notifications are blocked.
                                </p>
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                  To enable, allow notifications for this site in your browser.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : permissionState !== 'granted' ? (
                          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-950/5 dark:ring-white/5 p-4">
                            <div className="flex items-start gap-3">
                              <BellIcon className="size-5 text-violet-500 dark:text-violet-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                                  Get reminders when to-do steps are due.
                                </p>
                                <Button
                                  color="violet"
                                  className="mt-3"
                                  onClick={handleEnableNotifications}
                                >
                                  Enable notifications
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              We&apos;ll notify you when the app is open and to-do steps need attention.
                            </p>

                            <SwitchField>
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="text-sm font-medium text-zinc-950 dark:text-white">Due today</p>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Get notified when a step is due today
                                  </p>
                                </div>
                                <Switch
                                  color="violet"
                                  checked={profile?.notifyDueToday ?? true}
                                  onChange={(val) => updatePref('notifyDueToday', val)}
                                  disabled={saving}
                                />
                              </div>
                            </SwitchField>

                            <SwitchField>
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="text-sm font-medium text-zinc-950 dark:text-white">Overdue</p>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Get notified about past-due steps
                                  </p>
                                </div>
                                <Switch
                                  color="violet"
                                  checked={profile?.notifyOverdue ?? true}
                                  onChange={(val) => updatePref('notifyOverdue', val)}
                                  disabled={saving}
                                />
                              </div>
                            </SwitchField>

                            <SwitchField>
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="text-sm font-medium text-zinc-950 dark:text-white">Due tomorrow</p>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Get a heads-up the day before a step is due
                                  </p>
                                </div>
                                <Switch
                                  color="violet"
                                  checked={profile?.notifyDueTomorrow ?? true}
                                  onChange={(val) => updatePref('notifyDueTomorrow', val)}
                                  disabled={saving}
                                />
                              </div>
                            </SwitchField>
                          </div>
                        )}
                      </section>

                      {/* Version footer */}
                      <div className="pt-4 border-t border-zinc-950/5 dark:border-white/5">
                        <p className="text-xs text-zinc-400 dark:text-zinc-500" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                          Trackur v{__APP_VERSION__}
                        </p>
                      </div>
                    </div>
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
