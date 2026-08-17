import { useState, useCallback } from 'react';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  UserCircleIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';
import { CHAR_LIMITS, MAX_FOLLOWUPS } from '../constants.js';
import { Button } from './catalyst';
import MarkdownContent from './MarkdownContent.jsx';
import { formatDate, isDueOrOverdue } from '../utils/formatDate.js';

function todayISO() {
  // Local calendar date, not UTC — a follow-up logged at 9pm shouldn't file
  // itself under tomorrow.
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const EMPTY = {
  pocName: '',
  pocRole: '',
  pocEmail: '',
  conversation: '',
  followedUpOn: '',
  nextFollowUp: '',
};

const inputClass =
  'w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-violet-500 dark:focus:border-violet-400';

function FollowupForm({ initial, onSubmit, onCancel, submitLabel }) {
  const [values, setValues] = useState({ ...EMPTY, followedUpOn: todayISO(), ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    // An entry with neither a contact nor a conversation carries no
    // information — don't create an empty row.
    if (!values.pocName.trim() && !values.conversation.trim()) {
      setError('Add a contact name or some conversation notes.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err?.message || 'Could not save. Please try again.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-950/5 dark:ring-white/5 p-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="text" value={values.pocName} onChange={set('pocName')}
          maxLength={CHAR_LIMITS.pocName} placeholder="Contact name" className={inputClass}
          /* eslint-disable-next-line jsx-a11y/no-autofocus */
          autoFocus
        />
        <input
          type="text" value={values.pocRole} onChange={set('pocRole')}
          maxLength={CHAR_LIMITS.pocRole} placeholder="Their role (e.g. Recruiter)" className={inputClass}
        />
      </div>
      <input
        type="email" value={values.pocEmail} onChange={set('pocEmail')}
        maxLength={CHAR_LIMITS.pocEmail} placeholder="Their email (optional)" className={inputClass}
      />
      <textarea
        value={values.conversation} onChange={set('conversation')}
        maxLength={CHAR_LIMITS.conversation} rows={4}
        placeholder="What was discussed? Markdown supported."
        className={`${inputClass} resize-y`}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Contacted on</span>
          <input
            type="date" min="2000-01-01" max="2099-12-31"
            value={values.followedUpOn} onChange={set('followedUpOn')} className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Next follow-up</span>
          <input
            type="date" min="2000-01-01" max="2099-12-31"
            value={values.nextFollowUp} onChange={set('nextFollowUp')} className={inputClass}
          />
        </label>
      </div>

      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button plain type="button" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : submitLabel}</Button>
      </div>
    </form>
  );
}

function FollowupItem({ followup, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (editing) {
    return (
      <FollowupForm
        initial={followup}
        submitLabel="Save changes"
        onCancel={() => setEditing(false)}
        onSubmit={async (values) => {
          await onUpdate(followup.id, values);
          setEditing(false);
        }}
      />
    );
  }

  const chaseDue = followup.nextFollowUp && isDueOrOverdue(followup.nextFollowUp);

  return (
    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-950/5 dark:ring-white/5 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-950 dark:text-white">
            <UserCircleIcon className="size-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
            <span className="truncate">{followup.pocName || 'Unnamed contact'}</span>
            {followup.pocRole && (
              <span className="shrink-0 truncate text-xs font-normal text-zinc-500 dark:text-zinc-400">
                · {followup.pocRole}
              </span>
            )}
          </div>
          {followup.pocEmail && (
            <a
              href={`mailto:${followup.pocEmail}`}
              className="mt-0.5 block truncate text-xs text-violet-600 dark:text-violet-400 hover:underline"
            >
              {followup.pocEmail}
            </a>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {followup.followedUpOn && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {formatDate(followup.followedUpOn)}
            </span>
          )}
          <button
            type="button" onClick={() => setEditing(true)} aria-label="Edit follow-up"
            className="rounded-sm p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-950/5 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-white/5 transition-colors"
          >
            <PencilSquareIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => (confirmDelete ? onRemove(followup.id) : setConfirmDelete(true))}
            onBlur={() => setConfirmDelete(false)}
            aria-label={confirmDelete ? 'Confirm delete follow-up' : 'Delete follow-up'}
            className={`rounded-sm p-1 transition-colors ${
              confirmDelete
                ? 'text-red-500 dark:text-red-400 bg-red-500/10'
                : 'text-zinc-400 hover:text-red-500 hover:bg-zinc-950/5 dark:text-zinc-500 dark:hover:text-red-400 dark:hover:bg-white/5'
            }`}
          >
            <TrashIcon className="size-4" />
          </button>
        </div>
      </div>

      {followup.conversation && (
        <MarkdownContent className="mt-1.5">{followup.conversation}</MarkdownContent>
      )}

      {followup.nextFollowUp && (
        <div className={`mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs ${
          chaseDue
            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
            : 'bg-zinc-950/5 dark:bg-white/5 text-zinc-500 dark:text-zinc-400'
        }`}>
          <BellAlertIcon className="size-3.5" />
          Next: {formatDate(followup.nextFollowUp)}
        </div>
      )}
    </div>
  );
}

export default function FollowupSection({
  followups,
  loading,
  atLimit,
  onAdd,
  onUpdate,
  onRemove,
}) {
  const [adding, setAdding] = useState(false);

  const handleAdd = useCallback(async (values) => {
    await onAdd(values);
    setAdding(false);
  }, [onAdd]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Follow-ups{followups.length > 0 && ` (${followups.length})`}
        </div>
        {!adding && !atLimit && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
          >
            <PlusIcon className="size-3.5" />
            Log contact
          </button>
        )}
      </div>

      <div className="space-y-2">
        {adding && (
          <FollowupForm
            submitLabel="Add follow-up"
            onCancel={() => setAdding(false)}
            onSubmit={handleAdd}
          />
        )}

        {followups.map((f) => (
          <FollowupItem key={f.id} followup={f} onUpdate={onUpdate} onRemove={onRemove} />
        ))}

        {!adding && followups.length === 0 && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            {loading ? 'Loading…' : 'No follow-ups logged yet.'}
          </p>
        )}

        {atLimit && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Limit of {MAX_FOLLOWUPS} follow-ups reached for this job.
          </p>
        )}
      </div>
    </div>
  );
}
