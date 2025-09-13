-- assignee_department.sql
-- DDL and sample data for departments and assignee -> department mapping

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
  ('TC', 'Technology Commercialization'),
  ('RA', 'Research and Academic Services)'),
  ('EE', 'Entrepreneurial Ecosystem'),
  ('AD', 'Administration'),
  ('SC', 'Strategy and Corporate Communications')
ON CONFLICT (departmentId) DO NOTHING;


-- Index for department lookups
CREATE INDEX IF NOT EXISTS idx_assignee_department_deptid ON public.assignee_department(departmentId);
