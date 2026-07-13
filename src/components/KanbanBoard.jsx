import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, PlusIcon } from '@heroicons/react/24/outline';
import { STAGES, STAGE_COLORS } from '../constants.js';
import { Badge, TouchTarget } from './catalyst';
import JobCard from './JobCard.jsx';

const COLLAPSED_KEY = 'kanbanCollapsedStages';

const DEFAULT_COLLAPSED = { Opportunity: true };

function loadCollapsed() {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    if (!raw) return { ...DEFAULT_COLLAPSED };
    const parsed = JSON.parse(raw);
    // Ensure defaults for stages that have never been toggled
    for (const [stage, val] of Object.entries(DEFAULT_COLLAPSED)) {
      if (!(stage in parsed)) parsed[stage] = val;
    }
    return parsed;
  } catch { return { ...DEFAULT_COLLAPSED }; }
}

function saveCollapsed(collapsed) {
  localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed));
}

function MobileStageRow({ stage, stageJobs, onUpdate, onDelete, onEdit, onUpdateStage, onViewResume, resumesById, collapsed, onToggleCollapse, onAddJob }) {
  const scrollRef = useRef(null);
  const [activeCard, setActiveCard] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !el.firstElementChild) return;
    const gap = 12;
    const cardWidth = el.firstElementChild.offsetWidth + gap;
    const index = Math.round(el.scrollLeft / cardWidth);
    setActiveCard(Math.min(index, stageJobs.length - 1));
  }, [stageJobs.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToCard = useCallback((index) => {
    const el = scrollRef.current;
    if (!el) return;
    const child = el.children[index];
    if (child) {
      child.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    }
  }, []);

  return (
    <div className="rounded-lg p-4 bg-mauve-200 dark:bg-mauve-950/40 transition-all ring-1 ring-mauve-300/50 dark:ring-mauve-800/30">
      <div className="flex items-center justify-between w-full px-1">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer group"
        >
          {collapsed
            ? <ChevronDownIcon className="size-5 text-zinc-500 dark:text-zinc-400" />
            : <ChevronUpIcon className="size-5 text-zinc-500 dark:text-zinc-400" />
          }
          <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">{stage}</h3>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <Badge color={STAGE_COLORS[stage].badge}>{stageJobs.length}</Badge>
          <button
            type="button"
            onClick={() => onAddJob(stage)}
            title={`Add job to ${stage}`}
            aria-label={`Add job to ${stage}`}
            className="relative rounded-md p-1 text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 hover:text-mauve-600 dark:hover:text-mauve-400 hover:shadow-xs transition-all"
          >
            <TouchTarget />
            <PlusIcon className="size-5" />
          </button>
        </div>
      </div>

      {!collapsed && (
        stageJobs.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400 bg-mauve-200/50 dark:bg-mauve-950/20 rounded-lg">
            No jobs
          </p>
        ) : (
          <>
            <div
              ref={scrollRef}
              className="flex items-stretch gap-3 overflow-x-auto snap-x snap-mandatory pb-4 mt-2"
            >
              {stageJobs.map((job) => {
                const resume = resumesById.get(job.resumeId);
                return (
                  <div key={job.id} className="shrink-0 w-[80%] min-w-52 snap-start grid">
                    <JobCard
                      job={job}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      onEdit={onEdit}
                      onStageChange={onUpdateStage}
                      onViewResume={onViewResume ? () => onViewResume(job) : undefined}
                      resumeName={resume?.label || resume?.filename}
                      resumeSource={resume?.source}
                      compact
                    />
                  </div>
                );
              })}
            </div>
            {stageJobs.length > 1 && (
              <div className="flex justify-center gap-1.5 pt-1.5">
                {stageJobs.map((job, i) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => scrollToCard(i)}
                    aria-label={`Card ${i + 1}`}
                    className="p-2"
                  >
                    <span className={`block size-1.5 rounded-full transition-colors ${i === activeCard ? 'bg-mauve-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                  </button>
                ))}
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}

export default function KanbanBoard({ jobs, onUpdate, onDelete, onEdit, onUpdateStage, onViewResume, resumes, onAddJob }) {
  const [dragOverStage, setDragOverStage] = useState(null);
  const [collapsedStages, setCollapsedStages] = useState(loadCollapsed);

  function toggleCollapse(stage) {
    setCollapsedStages((prev) => {
      const next = { ...prev, [stage]: !prev[stage] };
      saveCollapsed(next);
      return next;
    });
  }

  const jobsByStage = useMemo(() => {
    const grouped = {};
    STAGES.forEach((stage) => {
      grouped[stage] = jobs.filter((j) => j.stage === stage);
    });
    return grouped;
  }, [jobs]);

  const resumesById = useMemo(
    () => new Map((resumes ?? []).map((r) => [r.id, r])),
    [resumes]
  );

  const handleDragStart = useCallback((e, jobId) => {
    e.dataTransfer.setData('text/plain', String(jobId));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e, stage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  }, []);

  const handleDragLeave = useCallback((e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverStage(null);
    }
  }, []);

  const handleDrop = useCallback((e, stage) => {
    e.preventDefault();
    setDragOverStage(null);
    const jobId = e.dataTransfer.getData('text/plain');
    if (jobId && onUpdateStage) {
      onUpdateStage(jobId, stage);
    }
  }, [onUpdateStage]);

  return (
    <div>
      {/* Mobile: stages stacked vertically, cards scroll horizontally */}
      <div className="md:hidden space-y-5">
        {STAGES.map((stage) => (
          <MobileStageRow
            key={stage}
            stage={stage}
            stageJobs={jobsByStage[stage]}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onEdit={onEdit}
            onUpdateStage={onUpdateStage}
            onViewResume={onViewResume}
            resumesById={resumesById}
            collapsed={!!collapsedStages[stage]}
            onToggleCollapse={() => toggleCollapse(stage)}
            onAddJob={onAddJob}
          />
        ))}
      </div>

      {/* Desktop: original horizontal columns */}
      <div className="hidden md:flex gap-4 overflow-x-auto pt-2 pb-4 min-h-[77vh]">
        {STAGES.map((stage) => {
          const stageJobs = jobsByStage[stage];
          const isDragOver = dragOverStage === stage;
          const isCollapsed = !!collapsedStages[stage];

          if (isCollapsed) {
            return (
              <button
                key={stage}
                type="button"
                onClick={() => toggleCollapse(stage)}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragLeave={(e) => handleDragLeave(e, stage)}
                onDrop={(e) => handleDrop(e, stage)}
                className={`shrink-0 w-10 rounded-lg bg-mauve-200 dark:bg-mauve-950/40 transition-all cursor-pointer flex flex-col items-center py-3 gap-2 hover:bg-mauve-300/60 dark:hover:bg-mauve-900/40 ${isDragOver ? 'ring-2 ring-mauve-400 dark:ring-mauve-500' : 'ring-1 ring-mauve-300/50 dark:ring-mauve-800/30'}`}
              >
                <ChevronRightIcon className="size-4 text-zinc-500 dark:text-zinc-400 shrink-0" aria-hidden="true" />
                <Badge color={STAGE_COLORS[stage].badge}>{stageJobs.length}</Badge>
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 [writing-mode:vertical-lr] rotate-180">
                  {stage}
                </span>
              </button>
            );
          }

          return (
            <div
              key={stage}
              className={`shrink-0 w-72 rounded-lg bg-mauve-200 dark:bg-mauve-950/40 transition-all ${isDragOver ? 'ring-2 ring-mauve-400 dark:ring-mauve-500' : 'ring-1 ring-mauve-300/50 dark:ring-mauve-800/30'}`}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={(e) => handleDragLeave(e, stage)}
              onDrop={(e) => handleDrop(e, stage)}
            >
              <div className="flex items-center justify-between w-full border-b border-mauve-300/50 dark:border-mauve-800/30">
                <button
                  type="button"
                  onClick={() => toggleCollapse(stage)}
                  className="flex items-center gap-1.5 flex-1 min-w-0 px-3 py-2 cursor-pointer group"
                >
                  <ChevronLeftIcon className="size-4 text-zinc-500 dark:text-zinc-400" />
                  <h3 className="text-xs font-semibold tracking-wide text-zinc-700 dark:text-zinc-300">{stage}</h3>
                </button>
                <div className="flex items-center gap-2 shrink-0 pr-2">
                  <Badge color={STAGE_COLORS[stage].badge}>{stageJobs.length}</Badge>
                  <button
                    type="button"
                    onClick={() => onAddJob(stage)}
                    title={`Add job to ${stage}`}
                    aria-label={`Add job to ${stage}`}
                    className="relative rounded-md p-1 text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 hover:text-mauve-600 dark:hover:text-mauve-400 hover:shadow-xs transition-all"
                  >
                    <TouchTarget />
                    <PlusIcon className="size-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 p-2 space-y-2 max-h-[calc(100vh-16rem)] overflow-y-auto">
                {stageJobs.length === 0 ? (
                  <p className="px-2 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">No jobs</p>
                ) : (
                  stageJobs.map((job) => {
                    const resume = resumesById.get(job.resumeId);
                    return (
                      <JobCard
                        key={job.id}
                        job={job}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        onDragStart={(e) => handleDragStart(e, job.id)}
                        onViewResume={onViewResume ? () => onViewResume(job) : undefined}
                        resumeName={resume?.label || resume?.filename}
                        resumeSource={resume?.source}
                        compact
                      />
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
