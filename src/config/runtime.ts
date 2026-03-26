const canUseWindow = typeof window !== 'undefined';

export type InviteRolePreference = 'player' | 'spectator';

export interface RoomInviteIntent {
  mode: 'online';
  roomCode: string;
  rolePreference: InviteRolePreference;
}

function sanitizeRoomCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function resolveUrlFromEnv(raw: string | undefined): URL | null {
  if (!raw || !raw.trim()) return null;

  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export function getAppOrigin(): string {
  const configured = resolveUrlFromEnv(import.meta.env.VITE_PUBLIC_APP_URL as string | undefined);
  if (configured) return trimTrailingSlash(configured.origin);

  if (canUseWindow) {
    return trimTrailingSlash(window.location.origin);
  }

  return 'http://localhost:5173';
}

export function getMultiplayerWebSocketUrl(): string {
  const fromWsEnv = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();
  if (fromWsEnv) {
    return fromWsEnv;
  }

  const fromServerOrigin = resolveUrlFromEnv(import.meta.env.VITE_SERVER_ORIGIN as string | undefined);
  if (fromServerOrigin) {
    const protocol = fromServerOrigin.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${fromServerOrigin.host}/ws`;
  }

  if (!canUseWindow) {
    return 'ws://localhost:8787/ws';
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export function getMultiplayerEndpointLabel(): string {
  try {
    const url = new URL(getMultiplayerWebSocketUrl());
    return `${url.protocol}//${url.host}`;
  } catch {
    return getMultiplayerWebSocketUrl();
  }
}

export function buildRoomInvite(roomCode: string, rolePreference: InviteRolePreference = 'player'): string {
  const url = new URL(getAppOrigin());
  const sanitizedRoomCode = sanitizeRoomCode(roomCode);

  url.searchParams.set('mode', 'online');
  url.searchParams.set('room', sanitizedRoomCode);

  if (rolePreference === 'spectator') {
    url.searchParams.set('role', 'spectator');
  }

  return url.toString();
}

export function readRoomInviteFromLocation(): RoomInviteIntent | null {
  if (!canUseWindow) return null;

  const url = new URL(window.location.href);
  const roomCode = sanitizeRoomCode(url.searchParams.get('room') || '');
  if (!roomCode) return null;

  return {
    mode: 'online',
    roomCode,
    rolePreference: url.searchParams.get('role') === 'spectator' ? 'spectator' : 'player',
  };
}

export function syncRoomInviteInLocation(invite: RoomInviteIntent | null): void {
  if (!canUseWindow) return;

  const url = new URL(window.location.href);

  if (!invite) {
    url.searchParams.delete('mode');
    url.searchParams.delete('room');
    url.searchParams.delete('role');
  } else {
    url.searchParams.set('mode', invite.mode);
    url.searchParams.set('room', sanitizeRoomCode(invite.roomCode));

    if (invite.rolePreference === 'spectator') {
      url.searchParams.set('role', 'spectator');
    } else {
      url.searchParams.delete('role');
    }
  }

  window.history.replaceState({}, '', url);
}

export function isStandaloneDisplayMode(): boolean {
  if (!canUseWindow) return false;

  const standaloneNavigator = window.navigator as Navigator & { standalone?: boolean };
  return standaloneNavigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}