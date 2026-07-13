import { useState, useMemo, useCallback } from 'react';
import { TrashIcon, PencilSquareIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { STAGES, STAGE_COLORS } from '../constants.js';
import { Badge } from './catalyst';
import InlineEditableField from './InlineEditableField.jsx';
import { formatDate, isOverdue } from '../utils/formatDate.js';

const COLUMNS = [
  { key: 'role', label: 'Role' },
  { key: 'company', label: 'Company' },
  { key: 'stage', label: 'Stage' },
  { key: 'dateApplied', label: 'Date Applied' },
  { key: 'nextStep', label: 'Next Step' },
];

export default function TableView({ jobs, onUpdate, onDelete, onEdit, sortKey, sortDir, onSort }) {
  const [editingJobId, setEditingJobId] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [draftValue, setDraftValue] = useState('');

  const startEdit = useCallback((fieldName, currentValue, jobId) => {
    setEditingJobId(jobId);
    setEditingField(fieldName);
    setDraftValue(currentValue ?? '');
  }, []);

  const cancel = useCallback(() => {
    setEditingJobId(null);
    setEditingField(null);
    setDraftValue('');
  }, []);

  const handleSave = useCallback((jobId) => {
    if (!editingField) return;
    if ((editingField === 'company' || editingField === 'role') && !draftValue.trim()) {
      cancel();
      return;
    }
    onUpdate(jobId, { [editingField]: draftValue });
    setEditingJobId(null);
    setEditingField(null);
    setDraftValue('');
  }, [editingField, draftValue, onUpdate, cancel]);

  const sorted = useMemo(() => [...jobs].sort((a, b) => {
    let valA, valB;
    if (sortKey === 'nextStep') {
      const todosA = (a.todos ?? []).filter((t) => !t.completed);
      const todosB = (b.todos ?? []).filter((t) => !t.completed);
      valA = (todosA[0]?.text || '').toLowerCase();
      valB = (todosB[0]?.text || '').toLowerCase();
    } else {
      valA = (a[sortKey] || '').toLowerCase();
      valB = (b[sortKey] || '').toLowerCase();
    }
    const cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  }), [jobs, sortKey, sortDir]);

  if (jobs.length === 0) {
    return (
      <p className="py-12 text-center text-zinc-500 dark:text-zinc-400">No jobs to display.</p>
    );
  }

  const renderCell = (job, colKey) => {
    const isEditingThis = editingJobId === job.id && editingField === colKey;

    const cellProps = {
      value: job[colKey],
      fieldName: colKey,
      isEditing: isEditingThis,
      draftValue: isEditingThis ? draftValue : '',
      onStartEdit: (field, val) => startEdit(field, val, job.id),
      onDraftChange: setDraftValue,
      onSave: () => handleSave(job.id),
      onCancel: cancel,
    };

    if (colKey === 'stage') {
      return (
        <InlineEditableField
          {...cellProps}
          inputType="select"
          selectOptions={STAGES}
          displayRender={(val) => <Badge color={STAGE_COLORS[val]?.badge || 'zinc'}>{val}</Badge>}
        />
      );
    }

    if (colKey === 'dateApplied') {
      return (
        <InlineEditableField
          {...cellProps}
          inputType="date"
          placeholder="Set date"
          displayRender={(val) => val ? formatDate(val) : <span className="text-zinc-500 dark:text-zinc-400">&mdash;</span>}
        />
      );
    }

    if (colKey === 'nextStep') {
      const todos = job.todos ?? [];
      const uncompleted = todos.filter((t) => !t.completed);
      const completed = todos.filter((t) => t.completed);
      if (todos.length === 0) {
        return <span className="text-zinc-500 dark:text-zinc-400">&mdash;</span>;
      }
      return (
        <button type="button" onClick={() => onEdit(job.id)} className="text-left">
          <span className={`truncate block max-w-48 ${isOverdue(uncompleted[0]?.dueDate) ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}>
            {uncompleted.length > 0 ? uncompleted[0].text : <span className="text-emerald-600 dark:text-emerald-400">All done</span>}
          </span>
          <Badge color="zinc" className="mt-0.5 text-[10px]">
            {completed.length}/{todos.length}
          </Badge>
        </button>
      );
    }

    return (
      <InlineEditableField
        {...cellProps}
        required={colKey === 'company' || colKey === 'role'}
        placeholder={colKey === 'company' ? 'Company name' : 'Role'}
      />
    );
  };

  return (
    <>
      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {sorted.map((job) => (
          <button
            key={job.id}
            type="button"
            onClick={() => onEdit(job.id)}
            className="w-full text-left rounded-lg bg-white dark:bg-zinc-800 p-4 shadow-xs ring-1 ring-zinc-950/5 dark:ring-white/10 hover:ring-zinc-950/10 dark:hover:ring-white/15 transition-all active:bg-zinc-50 dark:active:bg-zinc-750"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-950 dark:text-white truncate">{job.role}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{job.company}</p>
              </div>
              <Badge color={STAGE_COLORS[job.stage]?.badge || 'zinc'}>{job.stage}</Badge>
            </div>
            {job.dateApplied && (
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">Applied {formatDate(job.dateApplied)}</p>
            )}
            {(() => {
              const todos = job.todos ?? [];
              const uncompleted = todos.filter((t) => !t.completed);
              if (todos.length === 0) return null;
              return (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {uncompleted.length > 0
                    ? <span className={isOverdue(uncompleted[0].dueDate) ? 'text-red-600 dark:text-red-400 font-medium' : ''}>Next: {uncompleted[0].text}</span>
                    : <span className="text-emerald-600 dark:text-emerald-400">All steps done</span>
                  }
                  {' '}<span className="text-zinc-500 dark:text-zinc-400">({todos.filter((t) => t.completed).length}/{todos.length})</span>
                </p>
              );
            })()}
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg ring-1 ring-zinc-950/5 dark:ring-white/10 bg-white dark:bg-zinc-800 shadow-sm [--gutter:--spacing(4)]">
        <table className="min-w-full text-left text-sm/6 text-zinc-950 dark:text-white">
          <thead className="text-zinc-500 dark:text-zinc-400">
            <tr>
              {COLUMNS.map((col) => {
                const isActive = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => onSort(col.key)}
                    className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none border-b border-zinc-950/10 dark:border-white/10 ${isActive ? 'text-mauve-600 dark:text-mauve-400' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {isActive && (
                        sortDir === 'asc'
                          ? <ChevronUpIcon className="h-3.5 w-3.5 stroke-2" />
                          : <ChevronDownIcon className="h-3.5 w-3.5 stroke-2" />
                      )}
                    </span>
                  </th>
                );
              })}
              <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-950/10 dark:border-white/10">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-950/5 dark:divide-white/5">
            {sorted.map((job) => (
              <tr key={job.id} className="hover:bg-zinc-950/2.5 dark:hover:bg-white/2.5 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-zinc-950 dark:text-white max-w-56">
                  {renderCell(job, 'role')}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400 max-w-56">
                  {renderCell(job, 'company')}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {renderCell(job, 'stage')}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                  {renderCell(job, 'dateApplied')}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400 max-w-56">
                  {renderCell(job, 'nextStep')}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <span className="inline-flex gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(job.id)}
                      className="rounded-sm p-1 text-zinc-400 hover:text-mauve-600 hover:bg-mauve-50 dark:hover:text-mauve-400 dark:hover:bg-mauve-950/50 transition-colors"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(job.id)}
                      className="rounded-sm p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/50 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
