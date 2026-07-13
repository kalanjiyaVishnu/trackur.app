import { memo, useMemo, useCallback } from 'react';
import { TrashIcon, PencilSquareIcon, ChevronUpDownIcon, CalendarIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { STAGES, STAGE_COLORS } from '../constants.js';
import { Badge } from './catalyst';
import useInlineEdit from '../hooks/useInlineEdit.js';
import InlineEditableField from './InlineEditableField.jsx';
import ResumeSourceIcon from './ResumeSourceIcon.jsx';
import { formatDate, isOverdue } from '../utils/formatDate.js';
import { isSafeHttpUrl } from '../utils/normalizeUrl.js';

export default memo(function JobCard({ job, onUpdate, onDelete, onEdit, onDragStart, compact, onStageChange, onViewResume, resumeName, resumeSource }) {
  const { editingField, draftValue, startEdit, updateDraft, cancel, save } = useInlineEdit();

  const handleSave = () => {
    const { field, value } = save();
    if (!field) return;
    // Todo text fields are handled by handleSaveTodoText instead
    if (field.startsWith('todo_text_')) return;
    if ((field === 'company' || field === 'role') && !value.trim()) return;
    onUpdate(job.id, { [field]: value });
  };

  const isEditing = editingField !== null;

  const todos = job.todos ?? [];
  const { uncompleted, completed, shown, remaining } = useMemo(() => {
    const uncompleted = todos.filter((t) => !t.completed);
    const completed = todos.filter((t) => t.completed);
    const shown = uncompleted.slice(0, 3);
    const remaining = uncompleted.length - shown.length;
    return { uncompleted, completed, shown, remaining };
  }, [todos]);

  const handleToggleTodo = useCallback((e, todoId) => {
    e.stopPropagation();
    onUpdate(job.id, {
      todos: todos.map((t) =>
        t.id === todoId
          ? { ...t, completed: true, completedAt: new Date().toISOString() }
          : t
      ),
    });
  }, [todos, onUpdate, job.id]);

  const handleSaveTodoText = useCallback((todoId) => {
    const { field, value } = save();
    if (!field || !value.trim()) { cancel(); return; }
    onUpdate(job.id, {
      todos: todos.map((t) =>
        t.id === todoId ? { ...t, text: value.trim() } : t
      ),
    });
  }, [todos, onUpdate, job.id, save, cancel]);

  return (
    <div
      draggable={!!onDragStart && !isEditing}
      onDragStart={onDragStart}
      className={`flex-1 min-w-0 flex flex-col m-px rounded-lg bg-zinc-50 dark:bg-zinc-800 p-4 pt-2.5 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 hover:ring-zinc-950/10 dark:hover:ring-white/15 transition-all ${!isEditing && onDragStart ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div className="flex items-start justify-end gap-2">
        {job.archivedAt && <Badge color="zinc">Archived</Badge>}
        {!compact && !onStageChange && (
          <InlineEditableField
            value={job.stage}
            fieldName="stage"
            isEditing={editingField === 'stage'}
            draftValue={draftValue}
            onStartEdit={startEdit}
            onDraftChange={updateDraft}
            onSave={handleSave}
            onCancel={cancel}
            onBlur={handleSave}
            inputType="select"
            selectOptions={STAGES}
            displayRender={(val) => <Badge color={STAGE_COLORS[val]?.badge || 'zinc'}>{val}</Badge>}
            className="shrink-0"
          />
        )}
        {onStageChange && (
          <div className="relative shrink-0 inline-flex items-center">
            <Badge color={STAGE_COLORS[job.stage]?.badge || 'zinc'} className="text-xs">
              {job.stage}
              <ChevronUpDownIcon className="inline size-4 opacity-50" />
            </Badge>
            <select
              value={job.stage}
              onChange={(e) => onStageChange(job.id, e.target.value)}
              aria-label="Change stage"
              name="Change stage"
              className="absolute inset-0 opacity-0 cursor-pointer"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      <div className="min-w-0 flex-1 space-y-0.5">
          <InlineEditableField
            value={job.role}
            fieldName="role"
            isEditing={editingField === 'role'}
            draftValue={draftValue}
            onStartEdit={startEdit}
            onDraftChange={updateDraft}
            onSave={handleSave}
            onCancel={cancel}
            onBlur={handleSave}
            required
            placeholder="Role"
            className="text-base font-bold text-zinc-950 dark:text-white"
          />
          <InlineEditableField
            value={job.company}
            fieldName="company"
            isEditing={editingField === 'company'}
            draftValue={draftValue}
            onStartEdit={startEdit}
            onDraftChange={updateDraft}
            onSave={handleSave}
            onCancel={cancel}
            onBlur={handleSave}
            required
            placeholder="Company name"
            className="text-sm text-zinc-950 dark:text-white"
          />
        </div>

      <InlineEditableField
        value={job.dateApplied}
        fieldName="dateApplied"
        isEditing={editingField === 'dateApplied'}
        draftValue={draftValue}
        onStartEdit={startEdit}
        onDraftChange={updateDraft}
        onSave={handleSave}
        onCancel={cancel}
        onBlur={handleSave}
        inputType="date"
        placeholder="Set applied date"
        displayRender={(val) => val ? <span>Applied {formatDate(val)}</span> : null}
        className="mt-2 text-xs text-zinc-500 dark:text-zinc-400"
      />
      
      {/* Next steps todo summary */}
      {todos.length === 0 ? (
        <button
          type="button"
          onClick={() => onEdit(job.id)}
          className="mt-2 rounded -mx-1.5 px-1.5 py-1 text-xs text-zinc-500 dark:text-zinc-400 italic hover:bg-mauve-50 dark:hover:bg-mauve-950/30 transition-colors w-full text-left"
        >
          Add next steps...
        </button>
      ) : (
        <div className="rounded mt-2 shadow-md -mx-1.5 px-1.5 py-1.5 text-xs border border-mauve-300 bg-mauve-200 dark:border-mauve-800 dark:bg-mauve-700">
          {uncompleted.length === 0 && todos.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
              <CheckCircleIcon className="size-3.5" />
              All steps done
            </span>
          ) : (
            <div className="space-y-0.5">
              {shown.map((todo) => {
                const todoFieldName = `todo_text_${todo.id}`;
                const isEditingTodo = editingField === todoFieldName;

                return (
                  <div key={todo.id} className="group/todo flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleTodo(e, todo.id)}
                      aria-label={`Mark "${todo.text}" as complete`}
                      className="shrink-0 min-w-6 min-h-6 flex items-center justify-center"
                    >
                      <span className="block size-3.5 rounded-full border-[1.5px] border-zinc-400 dark:border-zinc-500 hover:border-violet-400 dark:hover:border-violet-500 transition-colors" />
                    </button>

                    {/* Inline-editable text */}
                    <InlineEditableField
                      value={todo.text}
                      fieldName={todoFieldName}
                      isEditing={isEditingTodo}
                      draftValue={draftValue}
                      onStartEdit={startEdit}
                      onDraftChange={updateDraft}
                      onSave={() => handleSaveTodoText(todo.id)}
                      onCancel={cancel}
                      onBlur={() => handleSaveTodoText(todo.id)}
                      placeholder="Step text"
                      className="flex-1 min-w-0 text-xs"
                    />

                    {/* Due date chip */}
                    {todo.dueDate && !isEditingTodo && (
                      <span className={`shrink-0 inline-flex items-center gap-0.5 ${isOverdue(todo.dueDate) ? 'text-red-600 dark:text-red-400 font-medium' : 'text-zinc-600 dark:text-zinc-400'}`}>
                        <CalendarIcon className="size-3" />
                        {formatDate(todo.dueDate)}
                      </span>
                    )}

                    {/* Open in edit modal */}
                    {!isEditingTodo && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onEdit(job.id); }}
                        className="shrink-0 p-0.5 rounded text-zinc-500 dark:text-zinc-400 opacity-0 group-hover/todo:opacity-100 hover:text-mauve-600 hover:bg-mauve-50 dark:hover:text-mauve-400 dark:hover:bg-mauve-950/50 transition-all"
                        title="Edit details"
                      >
                        <PencilSquareIcon className="size-3" />
                      </button>
                    )}
                  </div>
                );
              })}
              {remaining > 0 && (
                <p className="text-zinc-600 dark:text-zinc-400 pl-5">+{remaining} more</p>
              )}
              {completed.length > 0 && (
                <p className="text-zinc-600 dark:text-zinc-400 pl-5">{completed.length} done</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        <InlineEditableField
          value={job.notes}
          fieldName="notes"
          isEditing={editingField === 'notes'}
          draftValue={draftValue}
          onStartEdit={startEdit}
          onDraftChange={updateDraft}
          onSave={handleSave}
          onCancel={cancel}
          onBlur={handleSave}
          inputType="textarea"
          placeholder="Add notes"
          multiline
          displayRender={(val) => val ? <span className="line-clamp-2">{val}</span> : null}
        />
      </div>

      {job.resumeId && onViewResume && (
        <button
          type="button"
          onClick={onViewResume}
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-mauve-600 dark:text-mauve-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
          title="Download resume"
        >
          <ResumeSourceIcon source={resumeSource} className="size-3.5 shrink-0" />
          <span className="truncate">{resumeName || 'Resume'}</span>
        </button>
      )}

      {isSafeHttpUrl(job.postingUrl) && (
        <a
          href={job.postingUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-mauve-600 dark:text-mauve-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
          title="Open job posting"
        >
          <ArrowTopRightOnSquareIcon className="size-3.5 shrink-0" />
          <span className="truncate">Job posting</span>
        </a>
      )}

      <div className="mt-auto flex items-center justify-end gap-1 border-t border-zinc-950/5 dark:border-white/5 pt-2">
        <button
          type="button"
          onClick={() => onEdit(job.id)}
          className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-zinc-500 hover:text-mauve-700 hover:bg-zinc-950/5 dark:text-zinc-400 dark:hover:text-mauve-300 dark:hover:bg-white/5 transition-colors"
        >
          <PencilSquareIcon className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(job.id)}
          className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:text-zinc-400 dark:hover:text-red-400 dark:hover:bg-red-950/50 transition-colors"
        >
          <TrashIcon className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
});
