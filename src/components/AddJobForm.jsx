import { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from './catalyst';
import JobFormFields from './JobFormFields.jsx';
import SlideOutPanel from './SlideOutPanel.jsx';
import { normalizeUrl } from '../utils/normalizeUrl.js';

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
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current && initialStage) {
      setValues((prev) => ({ ...prev, stage: initialStage }));
    }
    prevOpenRef.current = open;
  }, [open, initialStage]);

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
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
