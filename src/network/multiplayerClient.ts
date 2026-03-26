import type { BotAction, GameState } from '../game/models';
import { getMultiplayerWebSocketUrl } from '../config/runtime';

export type OnlineRole = 'player' | 'spectator';

export interface SpectatorInfo {
  name: string;
  connected: boolean;
}

export interface JoinedMessage {
  type: 'joined';
  roomCode: string;
  playerId: string | null;
  role: OnlineRole;
  hostPlayerId: string | null;
  botIds: string[];
}

export interface RoomStateMessage {
  type: 'room_state';
  roomCode: string;
  gameState: GameState;
  yourRole: OnlineRole;
  yourPlayerId: string | null;
  hostPlayerId: string | null;
  spectators: SpectatorInfo[];
  botIds: string[];
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type MultiplayerMessage = JoinedMessage | RoomStateMessage | ErrorMessage | { type: 'pong' };

interface ConnectArgs {
  playerName: string;
  roomCode: string;
  authToken: string;
  rolePreference: OnlineRole;
  botIds?: string[];
  onMessage: (message: MultiplayerMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: () => void;
}

export class MultiplayerClient {
  private socket: WebSocket | null = null;

  connect(args: ConnectArgs): void {
    this.disconnect();

    const ws = new WebSocket(getMultiplayerWebSocketUrl());
    this.socket = ws;

    ws.addEventListener('open', () => {
      args.onOpen?.();
      ws.send(JSON.stringify({
        type: 'join_room',
        roomCode: args.roomCode,
        playerName: args.playerName,
        authToken: args.authToken,
        rolePreference: args.rolePreference,
        botIds: args.botIds ?? [],
      }));
    });

    ws.addEventListener('message', event => {
      try {
        const message = JSON.parse(String(event.data)) as MultiplayerMessage;
        args.onMessage(message);
      } catch {
        args.onMessage({ type: 'error', message: 'Received malformed server message.' });
      }
    });

    ws.addEventListener('close', () => {
      args.onClose?.();
    });

    ws.addEventListener('error', () => {
      args.onError?.();
    });
  }

  sendAction(action: BotAction): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ type: 'player_action', action }));
  }

  startGame(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ type: 'start_game' }));
  }

  disconnect(): void {
    if (!this.socket) return;

    const socket = this.socket;
    this.socket = null;

    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
  }
}
