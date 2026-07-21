import { compressString, decompressString } from './compression';
import type { Board, BoardDetail, Member } from '../types';

// The last-known board state, LZSS-compressed (WASM module 3) into localStorage so the app can still show the board without a network.

const KEY = 'fb_board_snapshot';

export interface BoardSnapshot {
  workspaceId: string;
  boards: Board[];
  members: Member[];
  activeBoardId: string | null;
  activeBoard: BoardDetail | null;
  savedAt: string;
}

export async function saveSnapshot(snapshot: BoardSnapshot): Promise<void> {
  try {
    localStorage.setItem(KEY, await compressString(JSON.stringify(snapshot)));
  } catch {
    // Quota exceeded or storage disabled: offline mode just won't be available
  }
}

export async function loadSnapshot(): Promise<BoardSnapshot | null> {
  try {
    const stored = localStorage.getItem(KEY);
    if (!stored) return null;
    const json = await decompressString(stored);
    if (!json) return null;
    return JSON.parse(json) as BoardSnapshot;
  } catch {
    return null;
  }
}

export function clearSnapshot(): void {
  localStorage.removeItem(KEY);
}
