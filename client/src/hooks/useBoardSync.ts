import { useEffect, useRef } from 'react';
import { useSocket } from './useSocket';
import { useBoardStore } from '../stores/boardStore';
import type { TaskDeletedPayload, TaskEventPayload, TaskMovedPayload } from '../types';

/**
 * Applies other users' task broadcasts for the active board to the store.
 * Conflicts resolve last-write-wins via updated_at, and the board is refetched
 * after a reconnect because events sent while offline are lost.
 */
export function useBoardSync(boardId: string | null): void {
  const { socket, connected } = useSocket();
  const droppedWhileAway = useRef(false);

  // Join/leave the board room; re-runs on reconnect and board switch
  useEffect(() => {
    if (!connected || !boardId) return;
    socket.emit('board:join', boardId);

    if (droppedWhileAway.current) {
      droppedWhileAway.current = false;
      // Resync: events may have been missed while disconnected
      void useBoardStore.getState().selectBoard(boardId);
    }

    return () => {
      socket.emit('board:leave', boardId);
    };
  }, [socket, connected, boardId]);

  // Remember drops so the next join triggers a resync
  useEffect(() => {
    const onDisconnect = () => {
      droppedWhileAway.current = true;
    };
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('disconnect', onDisconnect);
    };
  }, [socket]);

  // Apply remote task events to the store
  useEffect(() => {
    const store = () => useBoardStore.getState();
    const onCreated = (e: TaskEventPayload) => store().applyRemoteTaskCreated(e.task);
    const onUpdated = (e: TaskEventPayload) => store().applyRemoteTaskUpserted(e.task);
    const onMoved = (e: TaskMovedPayload) => store().applyRemoteTaskUpserted(e.task);
    const onDeleted = (e: TaskDeletedPayload) => store().applyRemoteTaskDeleted(e.taskId);

    socket.on('task:created', onCreated);
    socket.on('task:updated', onUpdated);
    socket.on('task:moved', onMoved);
    socket.on('task:deleted', onDeleted);
    return () => {
      socket.off('task:created', onCreated);
      socket.off('task:updated', onUpdated);
      socket.off('task:moved', onMoved);
      socket.off('task:deleted', onDeleted);
    };
  }, [socket]);
}
