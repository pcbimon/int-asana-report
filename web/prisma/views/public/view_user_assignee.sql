SELECT
  u.email,
  u.firstname,
  u.lastname,
  u.deptid,
  u.nickname,
  a.assignee_gid
FROM
  (
    mas_user u
    JOIN assignees a ON ((u.email = a.email))
  );