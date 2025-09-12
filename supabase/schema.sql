-- Create tables for Asana Report

CREATE TABLE assignees (
    gid TEXT PRIMARY KEY,
    name TEXT,
    email TEXT
);

CREATE TABLE sections (
    gid TEXT PRIMARY KEY,
    name TEXT
);

CREATE TABLE tasks (
    gid TEXT PRIMARY KEY,
    name TEXT,
    section_gid TEXT REFERENCES sections(gid),
    assignee_gid TEXT REFERENCES assignees(gid),
    completed BOOLEAN,
    completed_at TIMESTAMP,
    due_on DATE,
    project TEXT,
    created_at TIMESTAMP
);

CREATE TABLE subtasks (
    gid TEXT PRIMARY KEY,
    name TEXT,
    parent_task_gid TEXT REFERENCES tasks(gid),
    assignee_gid TEXT REFERENCES assignees(gid),
    completed BOOLEAN,
    created_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE sync_metadata (
    key TEXT PRIMARY KEY,
    updated_at TIMESTAMP
);

CREATE TABLE user_roles (
    uid UUID PRIMARY KEY,
    role TEXT
);

CREATE TABLE user_assignees (
    uid UUID PRIMARY KEY,
    assignee_gid TEXT REFERENCES assignees(gid)
);

-- Indexes for performance
CREATE INDEX idx_tasks_section_gid ON tasks(section_gid);
CREATE INDEX idx_tasks_assignee_gid ON tasks(assignee_gid);
CREATE INDEX idx_subtasks_parent_task_gid ON subtasks(parent_task_gid);
CREATE INDEX idx_subtasks_assignee_gid ON subtasks(assignee_gid);
CREATE INDEX idx_user_assignees_assignee_gid ON user_assignees(assignee_gid);