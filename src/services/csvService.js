const CSV_HEADERS = ['id', 'company', 'role', 'stage', 'dateApplied', 'todos', 'notes', 'postingUrl'];

// Legacy headers for backward-compatible import
const LEGACY_NEXT_ACTION = 'nextAction';
const LEGACY_NEXT_ACTION_DATE = 'nextActionDate';

// exported for unit tests
export function escapeCsvField(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// exported for unit tests
export function serializeTodos(todos) {
  if (!Array.isArray(todos) || todos.length === 0) return '';
  return todos
    .map((t) => {
      let s = t.completed ? '[x] ' : '[ ] ';
      s += t.text || '';
      if (t.dueDate) s += ` (${t.dueDate})`;
      return s;
    })
    .join('; ');
}

// exported for unit tests
export function parseTodosFromCsv(str) {
  if (!str || !str.trim()) return [];
  return str.split(';').map((item) => {
    const trimmed = item.trim();
    const completed = trimmed.startsWith('[x]');
    const withoutCheck = trimmed.replace(/^\[[ x]\]\s*/, '');
    const dateMatch = withoutCheck.match(/\((\d{4}-\d{2}-\d{2})\)\s*$/);
    const dueDate = dateMatch ? dateMatch[1] : null;
    const text = dueDate ? withoutCheck.replace(/\s*\(\d{4}-\d{2}-\d{2}\)\s*$/, '') : withoutCheck;
    return {
      id: crypto.randomUUID(),
      text: text.trim(),
      dueDate,
      completed,
      completedAt: completed ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
    };
  }).filter((t) => t.text);
}

// exported for unit tests
export function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  fields.push(current);
  return fields;
}

export function exportJobsToCsv(jobs) {
  const header = CSV_HEADERS.join(',');
  const rows = jobs.map((job) =>
    CSV_HEADERS.map((key) => {
      if (key === 'todos') return escapeCsvField(serializeTodos(job.todos));
      return escapeCsvField(job[key]);
    }).join(',')
  );
  const csv = [header, ...rows].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `job-tracker-export-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) {
          resolve([]);
          return;
        }

        const headers = parseCsvLine(lines[0]);
        const jobs = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCsvLine(lines[i]);
          const job = {};
          headers.forEach((header, idx) => {
            const key = header.trim();
            job[key] = values[idx]?.trim() ?? '';
          });

          // Handle todos column
          if (job.todos !== undefined) {
            job.todos = parseTodosFromCsv(job.todos);
          } else if (job[LEGACY_NEXT_ACTION] || job[LEGACY_NEXT_ACTION_DATE]) {
            // Backward compatible: convert legacy nextAction/nextActionDate to a single todo
            const todos = [];
            if (job[LEGACY_NEXT_ACTION]) {
              todos.push({
                id: crypto.randomUUID(),
                text: job[LEGACY_NEXT_ACTION],
                dueDate: job[LEGACY_NEXT_ACTION_DATE] || null,
                completed: false,
                completedAt: null,
                createdAt: new Date().toISOString(),
              });
            }
            job.todos = todos;
            delete job[LEGACY_NEXT_ACTION];
            delete job[LEGACY_NEXT_ACTION_DATE];
          } else {
            job.todos = [];
          }

          // Ensure id is a string UUID for imported jobs
          job.id = job.id || crypto.randomUUID();
          if (job.company || job.role) {
            jobs.push(job);
          }
        }
        resolve(jobs);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
