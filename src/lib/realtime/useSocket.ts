'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from './socketClient';

export function useSocketRooms(
  rooms: Array<string | null | undefined | false>,
  listeners: Record<string, (payload: any) => void> = {}
) {
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef(listeners);
  listenersRef.current = listeners;

  const validRooms = rooms.filter((r): r is string => typeof r === 'string' && r.trim().length > 0);
  const roomsKey = validRooms.join('|');
  const eventNamesKey = Object.keys(listeners).sort().join('|');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const socket = getSocket();
    setConnected(socket.connected);

    const join = () => {
      if (validRooms.length > 0) {
        socket.emit('join_rooms', validRooms);
      }
    };

    const handleConnect = () => {
      setConnected(true);
      join();
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (socket.connected) {
      join();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      if (validRooms.length > 0) {
        socket.emit('leave_rooms', validRooms);
      }
    };
  }, [roomsKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const socket = getSocket();
    const names = eventNamesKey ? eventNamesKey.split('|') : [];
    const boundHandlers: Array<[string, (payload: any) => void]> = [];

    for (const eventName of names) {
      const handler = (payload: any) => {
        const fn = listenersRef.current[eventName];
        if (typeof fn === 'function') {
          fn(payload);
        }
      };
      socket.on(eventName, handler);
      boundHandlers.push([eventName, handler]);
    }

    return () => {
      for (const [eventName, handler] of boundHandlers) {
        socket.off(eventName, handler);
      }
    };
  }, [eventNamesKey]);

  const emitTyping = useCallback(
    (room: string, payload: { senderName?: string; senderType?: string; isTyping: boolean }) => {
      if (typeof window === 'undefined' || !room) return;
      const socket = getSocket();
      if (socket.connected) {
        socket.emit('typing', { room, ...payload });
      }
    },
    []
  );

  return { connected, emitTyping };
}
