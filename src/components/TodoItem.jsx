import { useState, useRef, useEffect } from 'react';
import { XMarkIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { CHAR_LIMITS } from '../constants.js';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { formatDate, isOverdue } from '../utils/formatDate.js';

export default function TodoItem({ todo, onToggle, onRemove, onUpdate }) {
  const [editingText, setEditingText] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [draft, setDraft] = useState('');
  const [dateDraft, setDateDraft] = useState('');
  const textRef = useRef(null);
  const dateRef = useRef(null);

  useEffect(() => {
    if (editingText && textRef.current) textRef.current.focus();
  }, [editingText]);

  useEffect(() => {
    if (editingDate && dateRef.current) {
      dateRef.current.focus();
      try { dateRef.current.showPicker?.(); } catch { /* ignore */ }
    }
  }, [editingDate]);

  const startEditText = () => {
    if (todo.completed) return;
    setDraft(todo.text);
    setEditingText(true);
  };

  const saveText = () => {
    setEditingText(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== todo.text) {
      onUpdate(todo.id, { text: trimmed });
    }
  };

  const startEditDate = () => {
    if (todo.completed) return;
    setDateDraft(todo.dueDate || '');
    setEditingDate(true);
  };

  const saveDate = () => {
    setEditingDate(false);
    if (dateDraft !== (todo.dueDate || '')) {
      onUpdate(todo.id, { dueDate: dateDraft || null });
    }
  };

  return (
    <div className="group flex items-start gap-2 py-1.5">
      {/* Checkbox */}
      <button
        type="button"
        onClick={() => onToggle(todo.id)}
        className="mt-0.5 shrink-0 flex items-center justify-center"
      >
        {todo.completed ? (
          <CheckCircleIcon className="size-5 text-violet-500 dark:text-violet-400" />
        ) : (
          <span className="size-5 rounded-full border-2 border-zinc-300 dark:border-zinc-600 hover:border-violet-400 dark:hover:border-violet-500 transition-colors" />
        )}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {editingText ? (
          <div>
            <input
              ref={textRef}
              type="text"
              value={draft}
              maxLength={CHAR_LIMITS.todo}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={saveText}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveText();
                if (e.key === 'Escape') setEditingText(false);
              }}
              className="w-full bg-transparent text-sm text-zinc-950 dark:text-white outline-none border-b border-violet-400 dark:border-violet-500 py-0.5"
            />
            {draft.length >= CHAR_LIMITS.todo && (
              <span className="text-xs text-red-500 dark:text-red-400">Max {CHAR_LIMITS.todo} characters.</span>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditText}
            className={`text-left text-sm w-full truncate ${
              todo.completed
                ? 'line-through text-zinc-500 dark:text-zinc-400'
                : 'text-zinc-950 dark:text-white hover:text-violet-600 dark:hover:text-violet-400'
            }`}
          >
            {todo.text}
          </button>
        )}

        {/* Due date */}
        {editingDate ? (
          <input
            ref={dateRef}
            type="date"
            min="2000-01-01"
            max="2099-12-31"
            value={dateDraft}
            onChange={(e) => setDateDraft(e.target.value)}
            onBlur={saveDate}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveDate();
              if (e.key === 'Escape') setEditingDate(false);
            }}
            className="mt-0.5 text-xs bg-transparent text-zinc-500 dark:text-zinc-400 outline-none border-b border-violet-400 dark:border-violet-500"
          />
        ) : todo.dueDate ? (
          <button
            type="button"
            onClick={startEditDate}
            className={`mt-0.5 inline-flex items-center gap-1 text-xs ${
              todo.completed
                ? 'text-zinc-500 dark:text-zinc-400'
                : isOverdue(todo.dueDate)
                  ? 'text-red-600 dark:text-red-400 font-medium hover:text-violet-600 dark:hover:text-violet-400'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400'
            }`}
          >
            <CalendarIcon className="size-3" />
            {formatDate(todo.dueDate)}
          </button>
        ) : !todo.completed ? (
          <button
            type="button"
            onClick={startEditDate}
            className="mt-0.5 inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-violet-600 dark:hover:text-violet-400"
          >
            <CalendarIcon className="size-3" />
            Add date
          </button>
        ) : null}
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onRemove(todo.id)}
        className="mt-0.5 shrink-0 p-0.5 rounded text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all"
      >
        <XMarkIcon className="size-3.5" />
      </button>
    </div>
  );
}
