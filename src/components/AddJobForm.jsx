import { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button, Field, Label, Input, Description } from './catalyst';
import JobFormFields from './JobFormFields.jsx';
import SlideOutPanel from './SlideOutPanel.jsx';
import { normalizeUrl } from '../utils/normalizeUrl.js';
import { parseJobInput, applyParsedFields } from '../services/nlpService.js';

const EMPTY = {
  company: '',
  role: '',
  dateApplied: '',
  stage: 'Applied',
  firstStep: '',
  firstStepDate: '',
  notes: '',
  resumeId: '',
  postingUrl: '',
};

export default function AddJobForm({ onAdd, open, onClose, initialStage, resumes, onUploadResume }) {
  const [values, setValues] = useState({ ...EMPTY });
  const [quickAdd, setQuickAdd] = useState('');
  const prevOpenRef = useRef(false);
  // Fields the user edited by hand. A manual edit wins permanently: the parser
  // won't overwrite it on the next keystroke in the quick-add box.
  const touchedRef = useRef(new Set());
  // Fields the parser filled last time, so deleting words from the box can take
  // the values they produced back out.
  const parsedRef = useRef(new Set());
  // What an unparsed form looks like, which is what those fields revert to.
  const baselineRef = useRef({ ...EMPTY });

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      baselineRef.current = { ...EMPTY, ...(initialStage ? { stage: initialStage } : {}) };
      if (initialStage) setValues((prev) => ({ ...prev, stage: initialStage }));
    }
    prevOpenRef.current = open;
  }, [open, initialStage]);

  const handleChange = (name, value) => {
    touchedRef.current.add(name);
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuickAdd = (e) => {
    const text = e.target.value;
    setQuickAdd(text);
    const { fields } = parseJobInput(text);
    // Read the previous pass before reassigning the ref below: the updater runs
    // during render, by which point parsedRef would already hold the new set.
    const previouslyParsed = parsedRef.current;
    setValues((prev) => applyParsedFields(prev, fields, {
      parsed: previouslyParsed,
      touched: touchedRef.current,
      baseline: baselineRef.current,
    }));
    parsedRef.current = new Set(Object.keys(fields));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { firstStep, firstStepDate, resumeId, ...jobData } = values;
    const todos = [];
    if (firstStep.trim()) {
      todos.push({
        id: crypto.randomUUID(),
        text: firstStep.trim(),
        dueDate: firstStepDate || null,
        completed: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
      });
    }
    onAdd({ ...jobData, todos, resumeId: resumeId || null, postingUrl: normalizeUrl(jobData.postingUrl) });
    setValues({ ...EMPTY });
    setQuickAdd('');
    touchedRef.current = new Set();
    parsedRef.current = new Set();
    baselineRef.current = { ...EMPTY };
    onClose();
  };

  const header = (
    <div className="flex items-start justify-between gap-3">
      <h2 className="text-base/7 font-semibold text-zinc-950 dark:text-white">
        Add New Job
      </h2>
      <button
        type="button"
        onClick={onClose}
        className="rounded-sm p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-950/5 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-white/5 transition-colors"
      >
        <XMarkIcon className="size-5" />
      </button>
    </div>
  );

  const body = (
    <form id="add-job-form" onSubmit={handleSubmit}>
      <Field className="mb-6">
        <Label>Quick add</Label>
        <Input
          type="text"
          value={quickAdd}
          onChange={handleQuickAdd}
          placeholder="Applied to Frontend Developer at HubSpot yesterday"
        />
        <Description>
          Describe the job in a sentence and the fields below fill in as you type.
          Anything you edit by hand stays put.
        </Description>
      </Field>

      <JobFormFields
        values={values}
        onChange={handleChange}
        resumes={resumes}
        onUploadResume={onUploadResume}
      />
    </form>
  );

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button plain onClick={onClose}>Cancel</Button>
      <Button color="violet" type="submit" form="add-job-form">Add Job</Button>
    </div>
  );

  return (
    <SlideOutPanel open={open} onClose={onClose} header={header} body={body} footer={footer} />
  );
}
