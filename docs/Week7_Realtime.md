# Week 7 — WebSocket Realtime (Socket.io)

Realtime board sync: task changes made by one user appear on every other
screen viewing the same board, without refreshing.

## Architecture

```
Browser A --REST (mutation)--> Express --> PostgreSQL
    ^                             |
    |                             v after commit
    +----- socket.io <-- emit to room "board:<id>" --> Browser B, C, ...
```

- **One HTTP server, one port** — Express handles `/api/*`, Socket.io handles
  the WebSocket upgrade ([server/src/app.ts](../server/src/app.ts)).
- **Handshake auth** — the client sends its JWT access token in
  `socket.handshake.auth`; the server verifies it with the same secret as the
  REST middleware ([server/src/socket/index.ts](../server/src/socket/index.ts)).
- **Rooms** — after connecting, the client emits `board:join <boardId>`.
  The server checks project membership (owner or member) before joining the
  socket to room `board:<boardId>`.
- **Events** — after each successful task mutation the controller broadcasts
  to the board's room:

  | Event          | Payload                           | Emitted on             |
  | -------------- | --------------------------------- | ---------------------- |
  | `task:created` | `{ task, actorId }`               | POST …/tasks           |
  | `task:updated` | `{ task, actorId }`               | PUT …/tasks/:id        |
  | `task:moved`   | `{ task, fromColumnId, actorId }` | PATCH …/tasks/:id/move |
  | `task:deleted` | `{ taskId, columnId, actorId }`   | DELETE …/tasks/:id     |

- **No echo** — every REST request carries the client's socket id in an
  `X-Socket-Id` header; the server broadcasts with `.except(socketId)` so the
  actor (which already updated optimistically) never reprocesses its own change.

## Client hooks

- [`useSocket`](../client/src/hooks/useSocket.ts) — app-wide socket singleton +
  reactive `connected` flag (drives the Live/Offline badge in the header).
- [`useBoardSync`](../client/src/hooks/useBoardSync.ts) — joins/leaves the
  active board's room, applies incoming events to the Zustand store, and
  refetches the board after a reconnect (events broadcast while offline are
  lost, so the REST fetch is the authoritative catch-up).

## Conflict handling (two users move the same task)

1. **The database serializes writes.** Both moves run
   `UPDATE tasks … WHERE id = $x` inside a transaction; Postgres row-locking
   orders them. The later commit is the final state, and every mutation bumps
   the task's `updated_at` (migration `003_task_updated_at.sql`).
2. **Broadcasts carry the authoritative row** (fresh `SELECT` after commit),
   not the client's intent.
3. **Clients resolve last-write-wins.** `applyRemoteTaskUpserted` in
   [boardStore](../client/src/stores/boardStore.ts) drops any event whose
   `updated_at` is older than the local copy's. Whichever ordering the
   API responses and socket events arrive in, both screens converge on the
   database's final state.
4. **Reconnect = resync.** After a dropped connection the whole board is
   refetched rather than trusting a gap in the event stream.

Worked example: A moves task T to _Doing_ (commit `t1`), B simultaneously moves
T to _Done_ (commit `t2 > t1`).

- A applied its move optimistically, then receives B's event (`t2`) — newer
  than A's copy (`t1`) → applied. A shows _Done_.
- B applied its move optimistically; B receives A's event (`t1`) — older than
  B's copy (`t2`, from its own API response) → dropped. B keeps _Done_.
- Both screens now match the database. ✔

## Manual test

1. `pnpm dev`, open the app in two browsers (or one normal + one incognito),
   sign in as two members of the same project, open the same board.
2. Create / edit / drag / complete / delete tasks in one window — the other
   updates instantly (Live badge green in the header).
3. Stop the server, change nothing, restart it — the badge flips
   Offline → Live and the board refetches.
