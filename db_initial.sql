create table public.assignees
(
    email        text not null
        constraint assignees_pk
            primary key,
    firstname    text not null,
    lastname     text not null,
    assignee_gid text
        constraint assignees_uq_gid
            unique
);

alter table public.assignees
    owner to asana;

create table public.sections
(
    gid  text not null
        constraint sections_pk
            primary key,
    name text not null
);

alter table public.sections
    owner to asana;

create table public.tasks
(
    gid          text not null
        constraint tasks_pk
            primary key,
    name         text,
    section_gid  text
        constraint tasks_sections_gid_fk
            references public.sections,
    completed    boolean,
    completed_at timestamp with time zone,
    due_on       date,
    project      text,
    created_at   timestamp with time zone
);

alter table public.tasks
    owner to asana;

create table public.subtasks
(
    gid             text not null
        constraint subtasks_pk
            primary key,
    name            text,
    parent_task_gid text
        constraint subtasks_tasks_gid_fk
            references public.tasks,
    assignee_gid    text
        constraint subtasks_assignees_assignee_gid_fk
            references public.assignees (assignee_gid),
    completed       boolean,
    created_at      timestamp with time zone,
    completed_at    timestamp with time zone
);

alter table public.subtasks
    owner to asana;

create table public.sync_metadata
(
    key        text,
    message    text,
    updated_at timestamp with time zone
);

alter table public.sync_metadata
    owner to asana;

create table public.task_followers
(
    task_gid     text
        constraint task_followers_subtasks_gid_fk
            references public.subtasks,
    follower_gid text
        constraint task_followers_assignees_assignee_gid_fk
            references public.assignees (assignee_gid),
    constraint task_followers_pk
        unique (task_gid, follower_gid)
);

alter table public.task_followers
    owner to asana;

