import type { ClientEvent, ServerEvent } from '../../shared/types.js';

type EventCallback = (event: ServerEvent) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Set<EventCallback> = new Set();
  private messageQueue: ClientEvent[] = [];
  private reconnectTimeout: number | null = null;
  private currentRoomId: string | null = null;
  private currentNickname: string | null = null;
  private currentAvatar: string = '🎧';
  private currentColor: string = '#6366f1';
  private isExplicitlyClosed: boolean = false;

  public connect(roomId: string, nickname: string, avatar: string, color: string) {
    this.currentRoomId = roomId;
    this.currentNickname = nickname;
    this.currentAvatar = avatar;
    this.currentColor = color;
    this.isExplicitlyClosed = false;

    if (this.ws) {
      this.ws.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        // Send join event immediately upon connection
        this.send({
          type: 'join_room',
          roomId,
          nickname,
          avatar,
          color
        });

        // Flush queued messages
        while (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift();
          if (msg) this.send(msg);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ServerEvent;
          this.listeners.forEach((callback) => callback(data));
        } catch (err) {
          console.error('Failed to parse incoming WebSocket message', err);
        }
      };

      this.ws.onclose = () => {
        if (!this.isExplicitlyClosed && this.currentRoomId && this.currentNickname) {
          // Schedule auto-reconnect
          if (this.reconnectTimeout) window.clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = window.setTimeout(() => {
            if (!this.isExplicitlyClosed && this.currentRoomId && this.currentNickname) {
              this.connect(this.currentRoomId, this.currentNickname, this.currentAvatar, this.currentColor);
            }
          }, 2000);
        }
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
      };
    } catch (err) {
      console.error('Failed to create WebSocket instance', err);
    }
  }

  public send(event: ClientEvent) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    } else {
      this.messageQueue.push(event);
    }
  }

  public subscribe(callback: EventCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimeout) window.clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.currentRoomId = null;
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const wsClient = new WebSocketClient();
