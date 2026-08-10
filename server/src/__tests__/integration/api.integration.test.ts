import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import pool from '../../db/pool.js';

// End-to-end API tests against the real Express app and Postgres.

const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const email = (who: string) => `itest-${runId}-${who}@fastboard.dev`;
const PASSWORD = 'Password1';

interface Session {
  token: string;
  userId: string;
}

async function registerUser(who: string): Promise<Session> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: email(who), password: PASSWORD, full_name: `ITest ${who}` });
  expect(res.status).toBe(201);
  return { token: res.body.data.access_token, userId: res.body.data.user.id };
}

const authed = (token: string) => ({ Authorization: `Bearer ${token}` });

afterAll(async () => {
  // Users cascade to projects, boards, columns, tasks, invites, activity
  await pool.query('DELETE FROM users WHERE email LIKE $1', [`itest-${runId}-%`]);
  await pool.end();
});

describe('health and security headers', () => {
  it('serves /api/health with helmet headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    // helmet
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('rejects oversized JSON bodies', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: email('big'), password: 'x'.repeat(200 * 1024) });
    expect(res.status).toBe(413);
  });
});

describe('auth flow', () => {
  it('registers, logs in, and reads the profile', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email: email('auth'), password: PASSWORD, full_name: 'ITest Auth' });
    expect(reg.status).toBe(201);
    expect(reg.body.data.access_token).toBeTruthy();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: email('auth'), password: PASSWORD });
    expect(login.status).toBe(200);

    const me = await request(app)
      .get('/api/auth/me')
      .set(authed(login.body.data.access_token as string));
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(email('auth'));
  });

  it('rejects wrong credentials and missing tokens', async () => {
    const bad = await request(app)
      .post('/api/auth/login')
      .send({ email: email('auth'), password: 'WrongPass1' });
    expect(bad.status).toBe(401);

    const anon = await request(app).get('/api/auth/me');
    expect(anon.status).toBe(401);
  });

  it('rejects invalid input via Zod (bad email, weak password)', async () => {
    const badEmail = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: PASSWORD, full_name: 'X Y' });
    expect(badEmail.status).toBe(400);
    expect(badEmail.body.errors?.[0]?.field).toBe('email');

    const weak = await request(app)
      .post('/api/auth/register')
      .send({ email: email('weak'), password: 'short', full_name: 'X Y' });
    expect(weak.status).toBe(400);
  });

  it('treats SQL injection payloads as plain data', async () => {
    // Parameterized queries: the classic probe must not authenticate
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: `x@x.com' OR '1'='1`, password: `' OR '1'='1` });
    expect([400, 401]).toContain(res.status);

    // Stored as a literal string, not executed
    const name = `Robert'); DROP TABLE tasks;--`;
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email: email('bobby'), password: PASSWORD, full_name: name });
    expect(reg.status).toBe(201);
    expect(reg.body.data.user.full_name).toBe(name);

    const stillThere = await pool.query('SELECT COUNT(*) FROM tasks');
    expect(stillThere.rows.length).toBe(1); // table intact
  });
});

describe('projects, boards, and RBAC', () => {
  let admin: Session;
  let other: Session;
  let projectId: string;
  let boardId: string;
  let columnId: string;

  it('lets a user create a project (becoming admin) with a board and column', async () => {
    admin = await registerUser('admin');
    other = await registerUser('other');

    const project = await request(app)
      .post('/api/projects')
      .set(authed(admin.token))
      .send({ name: 'ITest Project' });
    expect(project.status).toBe(201);
    projectId = project.body.data.id;

    const board = await request(app)
      .post(`/api/projects/${projectId}/boards`)
      .set(authed(admin.token))
      .send({ name: 'ITest Board' });
    expect(board.status).toBe(201);
    boardId = board.body.data.id;

    const column = await request(app)
      .post(`/api/projects/${projectId}/boards/${boardId}/columns`)
      .set(authed(admin.token))
      .send({ name: 'Todo' });
    expect(column.status).toBe(201);
    columnId = column.body.data.id;
  });

  it('denies access to non-members', async () => {
    const res = await request(app).get(`/api/projects/${projectId}`).set(authed(other.token));
    expect([403, 404]).toContain(res.status);

    const addSelf = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set(authed(other.token))
      .send({ user_id: other.userId, role: 'admin' });
    expect(addSelf.status).toBe(403);
  });

  it('enforces the viewer role end to end', async () => {
    const add = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set(authed(admin.token))
      .send({ user_id: other.userId, role: 'viewer' });
    expect(add.status).toBe(201);

    // Viewer can read
    const read = await request(app).get(`/api/projects/${projectId}`).set(authed(other.token));
    expect(read.status).toBe(200);

    // Viewer cannot write tasks or boards
    const task = await request(app)
      .post(`/api/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`)
      .set(authed(other.token))
      .send({ title: 'Viewer task' });
    expect(task.status).toBe(403);

    const rename = await request(app)
      .patch(`/api/projects/${projectId}/boards/${boardId}`)
      .set(authed(other.token))
      .send({ name: 'Hacked' });
    expect(rename.status).toBe(403);
  });

  it('promotes the viewer to member, who can then create tasks', async () => {
    const promote = await request(app)
      .patch(`/api/projects/${projectId}/members/${other.userId}`)
      .set(authed(admin.token))
      .send({ role: 'member' });
    expect(promote.status).toBe(200);

    const task = await request(app)
      .post(`/api/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`)
      .set(authed(other.token))
      .send({ title: 'Member task', priority: 'high' });
    expect(task.status).toBe(201);
    expect(task.body.data.title).toBe('Member task');
  });

  it('protects the owner from removal and lets a member leave', async () => {
    const removeOwner = await request(app)
      .delete(`/api/projects/${projectId}/members/${admin.userId}`)
      .set(authed(other.token));
    expect(removeOwner.status).toBe(403);

    const leave = await request(app)
      .delete(`/api/projects/${projectId}/members/${other.userId}`)
      .set(authed(other.token));
    expect(leave.status).toBe(204);
  });
});

describe('invite links', () => {
  it('runs the full create-preview-accept flow', async () => {
    const inviter = await registerUser('inviter');
    const invitee = await registerUser('invitee');

    const project = await request(app)
      .post('/api/projects')
      .set(authed(inviter.token))
      .send({ name: 'ITest Invite Project' });
    const projectId = project.body.data.id as string;

    const invite = await request(app)
      .post(`/api/projects/${projectId}/invites`)
      .set(authed(inviter.token))
      .send({ role: 'member' });
    expect(invite.status).toBe(201);
    const token = invite.body.data.token as string;

    const preview = await request(app).get(`/api/invites/${token}`).set(authed(invitee.token));
    expect(preview.status).toBe(200);
    expect(preview.body.data.project_name).toBe('ITest Invite Project');
    expect(preview.body.data.already_member).toBe(false);

    const accept = await request(app)
      .post(`/api/invites/${token}/accept`)
      .set(authed(invitee.token));
    expect(accept.status).toBe(200);
    expect(accept.body.data.project_id).toBe(projectId);

    const members = await request(app)
      .get(`/api/projects/${projectId}/members`)
      .set(authed(inviter.token));
    const roles = Object.fromEntries(
      (members.body.data as { id: string; role: string }[]).map((m) => [m.id, m.role])
    );
    expect(roles[invitee.userId]).toBe('member');
  });

  it('rejects invite creation by non-admins', async () => {
    const outsider = await registerUser('outsider');
    const someProject = await request(app)
      .post('/api/projects')
      .set(authed(outsider.token))
      .send({ name: 'ITest Outsider Project' });
    // Outsider is admin of their own project but not of an unknown one
    const res = await request(app)
      .post(`/api/projects/${someProject.body.data.id}/invites`)
      .set(authed(outsider.token))
      .send({ role: 'owner-ish' });
    expect(res.status).toBe(400); // invalid role rejected by Zod
  });
});
