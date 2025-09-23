create table assignees
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

alter table assignees
    owner to asana;

create table sections
(
    gid  text not null
        constraint sections_pk
            primary key,
    name text not null
);

alter table sections
    owner to asana;

create table tasks
(
    gid          text not null
        constraint tasks_pk
            primary key,
    name         text,
    section_gid  text
        constraint tasks_sections_gid_fk
            references sections,
    completed    boolean,
    completed_at timestamp with time zone,
    due_on       date,
    project      text,
    created_at   timestamp with time zone
);

alter table tasks
    owner to asana;

create table subtasks
(
    gid             text not null
        constraint subtasks_pk
            primary key,
    name            text,
    parent_task_gid text
        constraint subtasks_tasks_gid_fk
            references tasks,
    assignee_gid    text
        constraint subtasks_assignees_assignee_gid_fk
            references assignees (assignee_gid),
    completed       boolean,
    created_at      timestamp with time zone,
    completed_at    timestamp with time zone
);

alter table subtasks
    owner to asana;

create table sync_metadata
(
    key        text not null
        constraint sync_metadata_pk
            primary key,
    message    text,
    updated_at timestamp with time zone
);

alter table sync_metadata
    owner to asana;

create table task_followers
(
    task_gid     text not null
        constraint task_followers_subtasks_gid_fk
            references subtasks,
    follower_gid text not null
        constraint task_followers_assignees_assignee_gid_fk
            references assignees (assignee_gid),
    constraint task_followers_pk
        unique (follower_gid, task_gid)
);

alter table task_followers
    owner to asana;


