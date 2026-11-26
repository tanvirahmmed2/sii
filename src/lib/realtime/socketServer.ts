import type { Server as SocketIOServer } from 'socket.io';

declare global {
  var __socketIoServer: SocketIOServer | undefined;
}

export function getSocketServer(): SocketIOServer | null {
  return globalThis.__socketIoServer || null;
}

export function emitToRooms(rooms: string[], event: string, payload: unknown): void {
  const io = getSocketServer();
  if (!io) return;
  const uniqueRooms = Array.from(new Set(rooms.filter((r) => typeof r === 'string' && r.trim().length > 0)));
  if (uniqueRooms.length === 0) return;
  let broadcaster = io.to(uniqueRooms[0]);
  for (let i = 1; i < uniqueRooms.length; i++) {
    broadcaster = broadcaster.to(uniqueRooms[i]);
  }
  broadcaster.emit(event, payload);
}

export function emitSupportMessage(params: {
  ticketId: string | number;
  ticketNumber?: string | null;
  message: unknown;
  ticket?: unknown;
}): void {
  const rooms = [`support:ticket:${params.ticketId}`, 'support:list'];
  if (params.ticketNumber) {
    rooms.push(`support:ticket:${params.ticketNumber}`);
  }
  emitToRooms(rooms, 'support:message', params);
}

export function emitSupportTicketUpdated(params: {
  ticketId: string | number;
  ticketNumber?: string | null;
  ticket: unknown;
}): void {
  const rooms = [`support:ticket:${params.ticketId}`, 'support:list'];
  if (params.ticketNumber) {
    rooms.push(`support:ticket:${params.ticketNumber}`);
  }
  emitToRooms(rooms, 'support:ticket_updated', params);
}

export function emitSupportTicketCreated(params: {
  ticket: unknown;
  creatorId?: string | number | null;
}): void {
  const rooms = ['support:list'];
  if (params.creatorId) {
    rooms.push(`support:creator:${params.creatorId}`);
  }
  emitToRooms(rooms, 'support:ticket_created', params);
}

export function emitSupportTicketDeleted(params: {
  ticketId: string | number;
  ticketNumber?: string | null;
}): void {
  const rooms = [`support:ticket:${params.ticketId}`, 'support:list'];
  if (params.ticketNumber) {
    rooms.push(`support:ticket:${params.ticketNumber}`);
  }
  emitToRooms(rooms, 'support:ticket_deleted', params);
}

export function emitLiveChatMessage(params: {
  chatId: string | number;
  message: unknown;
  chat?: unknown;
}): void {
  emitToRooms([`live_chat:${params.chatId}`, 'live_chats:list'], 'live_chat:message', params);
}

export function emitLiveChatUpdated(params: {
  chatId: string | number;
  chat: unknown;
}): void {
  emitToRooms([`live_chat:${params.chatId}`, 'live_chats:list'], 'live_chat:updated', params);
}

export function emitLiveChatStarted(params: {
  chat: unknown;
  messages: unknown[];
}): void {
  emitToRooms(['live_chats:list'], 'live_chat:started', params);
}

export function emitInternalChatMessage(params: {
  chatId: string | number;
  message: unknown;
}): void {
  emitToRooms([`internal_chat:${params.chatId}`, 'internal_chats:list'], 'internal_chat:message', params);
}

export function emitInternalChatUpdated(params: {
  chatId: string | number;
}): void {
  emitToRooms([`internal_chat:${params.chatId}`, 'internal_chats:list'], 'internal_chat:updated', params);
}

export function emitMetaMessage(params: {
  platform: string;
  conversationId: string | number;
  record: unknown;
  conversation?: unknown;
}): void {
  emitToRooms([`meta:conv:${params.conversationId}`, `meta:${params.platform}`], 'meta:message', params);
}

export function emitMetaConversationUpdated(params: {
  platform: string;
  conversationId: string | number;
  record: unknown;
}): void {
  emitToRooms([`meta:conv:${params.conversationId}`, `meta:${params.platform}`], 'meta:conversation_updated', params);
}

export function emitMetaConversationDeleted(params: {
  platform: string;
  conversationId: string | number;
}): void {
  emitToRooms([`meta:conv:${params.conversationId}`, `meta:${params.platform}`], 'meta:conversation_deleted', params);
}

export function emitWebsiteMetaMessage(params: {
  websiteId: string | number;
  platform: string;
  conversationId: string | number;
  record: unknown;
  conversation?: unknown;
}): void {
  emitToRooms(
    [`meta:website_conv:${params.conversationId}`, `meta:website:${params.websiteId}:${params.platform}`],
    'website_meta:message',
    params
  );
}

export function emitWebsiteMetaConversationUpdated(params: {
  websiteId: string | number;
  platform: string;
  conversationId: string | number;
  record: unknown;
}): void {
  emitToRooms(
    [`meta:website_conv:${params.conversationId}`, `meta:website:${params.websiteId}:${params.platform}`],
    'website_meta:conversation_updated',
    params
  );
}
