-- db_initial.sql
-- Initial schema for int-asana-report
-- Generated to match `database.types.ts` and repository recommendations

-- Note: This file creates tables and constraints suitable for a Postgres database.
-- GID fields are stored as TEXT (Asana IDs). Timestamp fields use timestamptz.

CREATE TABLE IF NOT EXISTS public.assignees (
  gid TEXT PRIMARY KEY,
  name TEXT,
  email TEXT
);

CREATE TABLE IF NOT EXISTS public.sections (
  gid TEXT PRIMARY KEY,
  name TEXT
);

CREATE TABLE IF NOT EXISTS public.tasks (
  gid TEXT PRIMARY KEY,
  name TEXT,
  section_gid TEXT REFERENCES public.sections(gid) ON DELETE SET NULL,
  assignee_gid TEXT REFERENCES public.assignees(gid) ON DELETE SET NULL,
  completed BOOLEAN,
  completed_at timestamptz,
  created_at timestamptz,
  due_on DATE,
  project TEXT
);

CREATE TABLE IF NOT EXISTS public.subtasks (
  gid TEXT PRIMARY KEY,
  name TEXT,
  parent_task_gid TEXT REFERENCES public.tasks(gid) ON DELETE CASCADE,
  assignee_gid TEXT REFERENCES public.assignees(gid) ON DELETE SET NULL,
  completed BOOLEAN,
  created_at timestamptz,
  completed_at timestamptz,
  due_on DATE
);

-- followers: mapping many-to-many between subtasks and assignees (followers)
CREATE TABLE IF NOT EXISTS public.followers (
  subtask_gid TEXT NOT NULL REFERENCES public.subtasks(gid) ON DELETE CASCADE,
  assignee_gid TEXT NOT NULL REFERENCES public.assignees(gid) ON DELETE CASCADE,
  PRIMARY KEY (subtask_gid, assignee_gid)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  uid TEXT PRIMARY KEY,
  role TEXT
);

CREATE TABLE IF NOT EXISTS public.user_assignees (
  uid TEXT PRIMARY KEY,
  assignee_gid TEXT REFERENCES public.assignees(gid) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.sync_metadata (
  key TEXT PRIMARY KEY,
  message TEXT,
  record_count INTEGER,
  status TEXT,
  updated_at timestamptz
);

-- Indexes to speed up common lookups
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_gid ON public.tasks(assignee_gid);
CREATE INDEX IF NOT EXISTS idx_tasks_section_gid ON public.tasks(section_gid);
CREATE INDEX IF NOT EXISTS idx_subtasks_assignee_gid ON public.subtasks(assignee_gid);
CREATE INDEX IF NOT EXISTS idx_subtasks_parent_task_gid ON public.subtasks(parent_task_gid);
CREATE INDEX IF NOT EXISTS idx_followers_assignee_gid ON public.followers(assignee_gid);

-- Optional: ensure common constraints/values are present
-- You can add additional indexes (e.g., on completed_at, created_at) depending on query patterns.

-- Example: index for time-based queries on subtasks
CREATE INDEX IF NOT EXISTS idx_subtasks_created_at ON public.subtasks(created_at);
CREATE INDEX IF NOT EXISTS idx_subtasks_completed_at ON public.subtasks(completed_at);

-- End of db_initial.sql

-- Departments table: two-letter departmentId and English name
CREATE TABLE IF NOT EXISTS public.departments (
  departmentId VARCHAR(2) PRIMARY KEY,
  name_en TEXT NOT NULL
);

-- Mapping table between assignees and departments
CREATE TABLE IF NOT EXISTS public.assignee_department (
  assignee_gid TEXT NOT NULL REFERENCES public.assignees(gid) ON DELETE CASCADE,
  departmentId VARCHAR(2) NOT NULL REFERENCES public.departments(departmentId) ON DELETE RESTRICT,
  PRIMARY KEY (assignee_gid)
);

-- Example departments
INSERT INTO public.departments (departmentId, name_en)
VALUES
  ('HR', 'Human Resources'),
  ('EN', 'Engineering'),
  ('PM', 'Product Management'),
  ('MK', 'Marketing')
ON CONFLICT (departmentId) DO NOTHING;

-- Example assignee -> department mappings (replace gids with real values)
-- These are sample rows; update with real assignee gids as needed.
INSERT INTO public.assignee_department (assignee_gid, departmentId)
VALUES
  ('1111111111111', 'EN'),
  ('2222222222222', 'PM'),
  ('3333333333333', 'HR')
ON CONFLICT (assignee_gid) DO NOTHING;

-- Index for department lookups
CREATE INDEX IF NOT EXISTS idx_assignee_department_deptid ON public.assignee_department(departmentId);

