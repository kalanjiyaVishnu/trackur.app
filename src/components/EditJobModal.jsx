import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from '@heroicons/react/24/outline';
import { STAGES, STAGE_COLORS, CHAR_LIMITS } from '../constants.js';
import { Badge, Button } from './catalyst';
import useInlineEdit from '../hooks/useInlineEdit.js';
import useTodos from '../hooks/useTodos.js';
import useJobEvents from '../hooks/useJobEvents.js';
import useFollowups from '../hooks/useFollowups.js';
import InlineEditableField from './InlineEditableField.jsx';
import TodoList from './TodoList.jsx';
import SlideOutPanel from './SlideOutPanel.jsx';
import ResumePickerSection from './ResumePickerSection.jsx';
import FollowupSection from './FollowupSection.jsx';
import NotesEditor from './NotesEditor.jsx';
import { formatDate } from '../utils/formatDate.js';
import { normalizeUrl, isSafeHttpUrl } from '../utils/normalizeUrl.js';

const FIELD_CONFIG = [
  { key: 'role', label: 'Role', required: true, placeholder: 'Job title', maxLength: CHAR_LIMITS.role },
  { key: 'company', label: 'Company', required: true, placeholder: 'Company name', maxLength: CHAR_LIMITS.company },
  { key: 'stage', label: 'Stage', inputType: 'select', selectOptions: STAGES },
  { key: 'dateApplied', label: 'Date Applied', inputType: 'date', placeholder: 'Set date' },
  { key: 'postingUrl', label: 'Posting URL', placeholder: 'https://...', maxLength: CHAR_LIMITS.postingUrl },
  // `notes` is deliberately absent — it's markdown now and owned by NotesEditor.
];

export default function EditJobModal({ job, onUpdate, onDelete, onClose, resumes = [], onGetDownloadUrl, onUploadResume, onManageResumes }) {
  const { editingField, draftValue, startEdit, updateDraft, cancel, save } = useInlineEdit();
  const { todos, addTodo, toggleTodo, removeTodo, updateTodo } = useTodos(job, onUpdate);
  const { events } = useJobEvents(job?.id, job?.stage);
  const {
    followups, loading: followupsLoading, atLimit: followupsAtLimit,
    addFollowup, updateFollowup, removeFollowup,
  } = useFollowups(job?.id);
  const [fieldError, setFieldError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!fieldError) return;
    const t = setTimeout(() => setFieldError(null), 5000);
    return () => clearTimeout(t);
  }, [fieldError]);

  if (!job) return null;

  const handleSave = () => {
    const { field, value } = save();
    if (!field) return;
    if ((field === 'company' || field === 'role') && !value.trim()) return;
    if (value && FIELD_CONFIG.find((c) => c.key === field)?.inputType === 'date') {
      const year = parseInt(value.split('-')[0], 10);
      if (year < 2000 || year > 2099) {
        setFieldError({ field, message: 'Sorry, time traveller! Year must be between 2000 and 2099.' });
        return;
      }
    }
    onUpdate(job.id, { [field]: field === 'postingUrl' ? normalizeUrl(value) : value });
  };

  const handleBlur = () => {
    handleSave();
  };

  const handleDelete = () => {
    onDelete(job.id);
    onClose();
  };

  const handleArchiveToggle = () => {
    onUpdate(job.id, { archivedAt: job.archivedAt ? null : new Date().toISOString() });
    onClose();
  };

  const renderField = (config) => {
    const { key, label, inputType, selectOptions, placeholder, required, maxLength } = config;
    const isStage = key === 'stage';

    const isDate = inputType === 'date';
    const displayRender = isStage
      ? (val) => <Badge color={STAGE_COLORS[val]?.badge || 'zinc'}>{val || 'Not set'}</Badge>
      : isDate
        ? (val) => val ? formatDate(val) : undefined
        : undefined;

    return (
      <div key={key} className={key === 'notes' || key === 'postingUrl' ? 'col-span-full' : ''}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {label}
          </div>
          {key === 'postingUrl' && isSafeHttpUrl(job.postingUrl) && (
            <a
              href={job.postingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-mauve-600 dark:text-mauve-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
            >
              Open
              <ArrowTopRightOnSquareIcon className="size-3.5" />
            </a>
          )}
        </div>
        <InlineEditableField
          value={job[key]}
          fieldName={key}
          isEditing={editingField === key}
          draftValue={draftValue}
          onStartEdit={(fieldName, val) => { setFieldError(null); startEdit(fieldName, val); }}
          onDraftChange={updateDraft}
          onSave={handleSave}
          onCancel={cancel}
          onBlur={handleBlur}
          inputType={inputType}
          selectOptions={selectOptions}
          placeholder={placeholder || 'Not set'}
          required={required}
          maxLength={maxLength}
          displayRender={displayRender}
          className="text-sm text-zinc-950 dark:text-white"
        />
        {fieldError?.field === key && (
          <p className="mt-1 text-xs text-red-500 dark:text-red-400">{fieldError.message}</p>
        )}
      </div>
    );
  };

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-base/7 font-semibold text-zinc-950 dark:text-white truncate">
          {job.role}
        </h2>
        <p className="text-sm/6 text-zinc-500 dark:text-zinc-400 truncate">
          {job.company}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Badge color={STAGE_COLORS[job.stage]?.badge || 'zinc'}>{job.stage}</Badge>
        {/* Hidden below md — the drawer already fills the viewport there. */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? 'Exit full screen' : 'Full screen'}
          aria-label={expanded ? 'Exit full screen' : 'Expand to full screen'}
          aria-pressed={expanded}
          className="hidden md:inline-flex rounded-sm p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-950/5 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-white/5 transition-colors"
        >
          {expanded
            ? <ArrowsPointingInIcon className="size-5" />
            : <ArrowsPointingOutIcon className="size-5" />}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-950/5 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-white/5 transition-colors"
        >
          <XMarkIcon className="size-5" />
        </button>
      </div>
    </div>
  );

  const fieldsBlock = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
      {FIELD_CONFIG.map(renderField)}
    </div>
  );

  const nextStepsBlock = (
    <div>
      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
        Next Steps
      </div>
      <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-950/5 dark:ring-white/5 px-3 py-2">
        <TodoList
          todos={todos}
          onAdd={addTodo}
          onToggle={toggleTodo}
          onRemove={removeTodo}
          onUpdate={updateTodo}
        />
      </div>
    </div>
  );

  const resumeBlock = (
    <ResumePickerSection
      value={job.resumeId}
      onChange={(v) => onUpdate(job.id, { resumeId: v })}
      resumes={resumes}
      onUploadResume={onUploadResume}
      onGetDownloadUrl={onGetDownloadUrl}
      onManageResumes={onManageResumes}
      removeLabel="Remove From Job"
    />
  );

  const followupsBlock = (
    <FollowupSection
      followups={followups}
      loading={followupsLoading}
      atLimit={followupsAtLimit}
      onAdd={addFollowup}
      onUpdate={updateFollowup}
      onRemove={removeFollowup}
    />
  );

  const notesBlock = (
    <NotesEditor
      value={job.notes}
      onSave={(v) => onUpdate(job.id, { notes: v })}
      maxLength={CHAR_LIMITS.notes}
    />
  );

  const historyBlock = events.length > 0 && (
    <div>
      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
        History
      </div>
      <ol className="space-y-1.5">
        {[...events].reverse().map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-300">
            <span className="min-w-0 truncate">
              {e.fromStage ? `${e.fromStage} → ${e.toStage}` : `Created in ${e.toStage}`}
            </span>
            <span className="shrink-0 text-zinc-400 dark:text-zinc-500">
              {formatDate(e.createdAt.slice(0, 10))}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );

  // Expanded gets two columns: the job's fixed attributes on the left, the
  // long-form running record (follow-ups, notes, stage history) on the right.
  const body = expanded ? (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
      <div className="space-y-6">
        {fieldsBlock}
        {nextStepsBlock}
        {resumeBlock}
      </div>
      <div className="space-y-6">
        {followupsBlock}
        {notesBlock}
        {historyBlock}
      </div>
    </div>
  ) : (
    <div className="space-y-5">
      {fieldsBlock}
      {nextStepsBlock}
      {resumeBlock}
      {followupsBlock}
      {notesBlock}
      {historyBlock}
    </div>
  );

  const footer = (
    <div className="flex items-center gap-2">
      <Button outline className="flex-1" onClick={handleArchiveToggle}>
        {job.archivedAt ? 'Unarchive Job' : 'Archive Job'}
      </Button>
      <Button color="red" className="flex-1 hover:bg-red-700" onClick={handleDelete}>
        Delete Job
      </Button>
    </div>
  );

  return (
    <SlideOutPanel open onClose={onClose} header={header} body={body} footer={footer} expanded={expanded} />
  );
}
