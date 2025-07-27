import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Chat, Message } from '../types';
import { useAlert } from '../contexts/AlertContext';

export const useChat = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [bots, setBots] = useState<Array<{
    botId: string;
    botName: string;
    description: string;
    isActive: boolean;
  }>>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);

  // ボット一覧とチャット一覧を読み込む
  const loadBotsAndChats = useCallback(async (isMounted: boolean = true, signal?: AbortSignal) => {
    try {
      setIsLoadingChats(true);
      
      // ボット一覧を取得
      const botsResponse = await api.getBots();
      if (isMounted && !signal?.aborted) {
        setBots(botsResponse.bots.filter(bot => bot.isActive));
      }

      // チャット一覧を取得
      const chatsResponse = await api.getUserChats();
      if (isMounted && !signal?.aborted) {
        const formattedChats: Chat[] = chatsResponse.chats.map(chat => ({
          id: chat.chatId,
          title: chat.title,
          messages: [], // メッセージは後で必要に応じて取得
          createdAt: new Date(chat.createdAt * 1000),
          updatedAt: new Date(chat.updatedAt * 1000),
          botId: chat.botId,
          messagesLoaded: false // メッセージは未読み込み
        }));
        setChats(formattedChats);
      }
    } catch (error) {
      console.error('Failed to load bots and chats:', error);
    } finally {
      if (isMounted && !signal?.aborted) {
        setIsLoadingChats(false);
      }
    }
  }, []);

  // チャットのメッセージ履歴を取得
  const loadChatMessages = useCallback(async (chatId: string) => {
    try {
      const messagesResponse = await api.getChatMessages(chatId);
      const formattedMessages: Message[] = messagesResponse.messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        timestamp: new Date(msg.timestamp)
      }));

      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, messages: formattedMessages, messagesLoaded: true }
          : chat
      ));
    } catch (error) {
      console.error('Failed to load chat messages:', error);
      // エラーの場合も読み込み済みフラグを設定して無限ループを防ぐ
      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, messagesLoaded: true }
          : chat
      ));
    }
  }, []);

  // チャット選択
  const handleSelectChat = useCallback((chatId: string, setSidebarOpen?: (open: boolean) => void) => {
    navigate(`/chat/${chatId}`);
    if (setSidebarOpen) {
      setSidebarOpen(false);
    }
    
    // チャットのメッセージが未読み込みの場合は取得
    const selectedChat = chats.find(chat => chat.id === chatId);
    if (selectedChat && !selectedChat.messagesLoaded) {
      loadChatMessages(chatId);
    }
  }, [navigate, chats, loadChatMessages]);

  // チャット削除
  const handleDeleteChat = useCallback(async (deleteChatId: string, onAuthError?: () => void) => {
    try {
      // バックエンドAPIでチャットルームを削除
      await api.deleteChatRoom(deleteChatId);
      
      // フロントエンドの状態を更新
      setChats(prev => prev.filter(chat => chat.id !== deleteChatId));
      
      // 現在のチャットが削除されたチャットの場合はトップページにリダイレクト
      const currentPath = window.location.pathname;
      if (currentPath.includes(deleteChatId)) {
        navigate('/');
      }
    } catch (error: unknown) {
      console.error('Failed to delete chat:', error);
      
      // 認証エラーの場合はログアウト
      const errorResponse = error as { status?: number };
      if (errorResponse.status === 401 && onAuthError) {
        onAuthError();
        return;
      }
      
      // エラー時はアラートを表示
      await showAlert(
        'チャットの削除に失敗しました。しばらく後にお試しください。',
        'error',
        'エラー'
      );
    }
  }, [navigate, showAlert]);

  // 新しいチャット作成
  const createChatRoom = useCallback(async (botId: string, title: string = '新しいチャット') => {
    try {
      const response = await api.createChatRoom(botId, title);
      
      const newChat: Chat = {
        id: response.chatId,
        title: response.title,
        messages: [],
        createdAt: new Date(response.createdAt * 1000),
        updatedAt: new Date(response.createdAt * 1000),
        botId: response.botId,
        messagesLoaded: true // 新しいチャットなのでメッセージはない
      };
      
      setChats(prev => [newChat, ...prev]);
      return newChat;
    } catch (error) {
      console.error('チャットルームの作成に失敗しました:', error);
      throw error;
    }
  }, []);

  // チャット情報を取得してローカル状態に追加
  const addChatFromApi = useCallback(async (chatId: string) => {
    try {
      const chatInfo = await api.getChatRoom(chatId);
      const newChat: Chat = {
        id: chatInfo.chatId,
        title: chatInfo.title,
        messages: [], // メッセージは別途取得
        createdAt: new Date(chatInfo.createdAt * 1000),
        updatedAt: new Date(chatInfo.updatedAt * 1000),
        botId: chatInfo.botId,
        messagesLoaded: false // メッセージは未読み込み
      };
      setChats(prev => [newChat, ...prev.filter(c => c.id !== chatId)]);
      
      // チャット情報を取得した後にメッセージ履歴を読み込む
      await loadChatMessages(chatId);
      
      return true;
    } catch (error) {
      console.error('Failed to add chat from API:', error);
      return false;
    }
  }, [loadChatMessages]);

  // 存在しないチャットIDの処理
  const handleInvalidChatId = useCallback((chatId: string) => {
    console.warn(`存在しないチャットID: ${chatId}`);
    navigate('/');
  }, [navigate]);

  return {
    chats,
    bots,
    isLoadingChats,
    setChats,
    loadBotsAndChats,
    loadChatMessages,
    handleSelectChat,
    handleDeleteChat,
    createChatRoom,
    addChatFromApi,
    handleInvalidChatId
  };
};