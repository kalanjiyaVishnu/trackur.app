import { STAGES } from '../constants.js';
import { Field, FieldGroup, Label, Input, Select, Textarea } from './catalyst';
import { CHAR_LIMITS } from '../constants.js';
import ResumePickerSection from './ResumePickerSection.jsx';

export default function JobFormFields({ values, onChange, resumes = [], onUploadResume }) {
  const field = (name) => ({
    value: values[name] || '',
    onChange: (e) => onChange(name, e.target.value),
  });

  return (
    <FieldGroup className="space-y-4">
      <Field>
        <Label>Role *</Label>
        <Input type="text" required maxLength={CHAR_LIMITS.role} placeholder="e.g. Frontend Developer" {...field('role')} />
        {(values.role || '').length >= CHAR_LIMITS.role && (
          <span className="text-xs text-red-500 dark:text-red-400">Max {CHAR_LIMITS.role} characters.</span>
        )}
      </Field>

      <Field>
        <Label>Company Name *</Label>
        <Input type="text" required maxLength={CHAR_LIMITS.company} placeholder="e.g. HubSpot" {...field('company')} />
        {(values.company || '').length >= CHAR_LIMITS.company && (
          <span className="text-xs text-red-500 dark:text-red-400">Max {CHAR_LIMITS.company} characters.</span>
        )}
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field>
          <Label>Date Applied</Label>
          <Input type="date" min="2000-01-01" max="2099-12-31" {...field('dateApplied')} />
        </Field>

        <Field>
          <Label>Stage</Label>
          <Select {...field('stage')}>
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field>
          <Label>Next Step</Label>
          <Input type="text" placeholder="e.g. Follow up with recruiter" {...field('firstStep')} />
        </Field>

        <Field>
          <Label>Due Date</Label>
          <Input type="date" min="2000-01-01" max="2099-12-31" {...field('firstStepDate')} />
        </Field>
      </div>

      <ResumePickerSection
        value={values.resumeId}
        onChange={(v) => onChange('resumeId', v)}
        resumes={resumes}
        onUploadResume={onUploadResume}
        removeLabel="Clear selection"
      />

      <Field>
        <Label>Job Posting URL</Label>
        {/* type="text": browser url validation would block submit for bare
            domains; AddJobForm normalizes missing protocols on submit instead */}
        <Input type="text" inputMode="url" placeholder="https://..." {...field('postingUrl')} />
      </Field>

      <Field>
        <Label>Notes</Label>
        <Textarea rows={3} resizable={false} maxLength={CHAR_LIMITS.notes} placeholder="Add a link to the job description, questions to ask, or anything else." {...field('notes')} />
        {(() => {
          const len = (values.notes || '').length;
          const remaining = CHAR_LIMITS.notes - len;
          const color = remaining <= 15
            ? 'text-red-500 dark:text-red-400'
            : len >= CHAR_LIMITS.notes * 0.75
              ? 'text-yellow-500 dark:text-yellow-400'
              : 'text-zinc-500 dark:text-zinc-400';
          return <span className={`text-xs ${color}`}>{len}/{CHAR_LIMITS.notes}</span>;
        })()}
      </Field>
    </FieldGroup>
  );
}
