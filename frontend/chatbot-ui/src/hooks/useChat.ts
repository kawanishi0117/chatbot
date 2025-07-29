import { useCallback, useState, useRef } from 'react';
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
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  
  // AI応答ポーリング用のタイマー参照
  const aiPollingTimer = useRef<NodeJS.Timeout | null>(null);

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

  // AI応答ポーリングのクリーンアップ
  const clearAIPolling = useCallback(() => {
    if (aiPollingTimer.current) {
      clearTimeout(aiPollingTimer.current);
      aiPollingTimer.current = null;
    }
    setIsAIProcessing(false);
  }, []);

  // AI応答をポーリングして取得
  const pollForAIResponse = useCallback(async (chatId: string, startTime: number) => {
    const POLL_INTERVAL = 2000; // 2秒間隔
    const MAX_POLL_TIME = 30000; // 最大30秒
    
    const poll = async () => {
      try {
        // 現在時刻をチェック
        if (Date.now() - startTime > MAX_POLL_TIME) {
          console.log('AI response polling timeout');
          clearAIPolling();
          return;
        }

        // 新しいメッセージを取得
        const response = await api.getChatMessages(chatId);
        const messages = response.messages;
        
        // 現在のチャット状態を取得
        setChats(prevChats => {
          const currentChat = prevChats.find(chat => chat.id === chatId);
          if (!currentChat) {
            clearAIPolling();
            return prevChats;
          }

          // 新しいメッセージ（AI応答）があるかチェック
          const newMessages = messages.filter(msg => 
            !currentChat.messages.some(existingMsg => existingMsg.id === msg.id)
          );

          if (newMessages.length > 0) {
            // 新しいメッセージが見つかった場合
            const hasAIResponse = newMessages.some(msg => msg.role === 'assistant');
            
            if (hasAIResponse) {
              // AI応答が含まれている場合、ポーリング停止
              clearAIPolling();
              
              // メッセージを更新
              const formattedMessages: Message[] = messages.map(msg => ({
                id: msg.id,
                content: msg.content,
                role: msg.role as 'user' | 'assistant',
                timestamp: new Date(parseInt(msg.timestamp)),
                contentType: msg.contentType || 'text'
              }));

              return prevChats.map(chat =>
                chat.id === chatId
                  ? { ...chat, messages: formattedMessages, messagesLoaded: true }
                  : chat
              );
            }
          }

          // AI応答がまだない場合、次のポーリングをスケジュール
          aiPollingTimer.current = setTimeout(poll, POLL_INTERVAL);
          return prevChats;
        });

      } catch (error) {
        console.error('Error polling for AI response:', error);
        clearAIPolling();
      }
    };

    // 最初のポーリングを開始
    aiPollingTimer.current = setTimeout(poll, POLL_INTERVAL);
  }, [clearAIPolling]);

  // メッセージ送信とAI応答待機
  const sendMessage = useCallback(async (content: string, chatId: string) => {
    try {
      setIsAIProcessing(true);
      
      // メッセージ送信
      await api.sendMessage(content, chatId);
      
      // 即座に新しいメッセージを表示
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        content,
        role: 'user',
        timestamp: new Date(),
        contentType: 'text'
      };

      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === chatId
            ? { ...chat, messages: [...chat.messages, userMessage] }
            : chat
        )
      );

      // AI応答のポーリングを開始
      await pollForAIResponse(chatId, Date.now());

    } catch (error) {
      console.error('Error sending message:', error);
      setIsAIProcessing(false);
      
      await showAlert(
        'メッセージの送信に失敗しました。',
        'error',
        'エラー'
      );
    }
  }, [pollForAIResponse, clearAIPolling, showAlert]);

  return {
    chats,
    bots,
    isLoadingChats,
    isAIProcessing,
    setChats,
    loadBotsAndChats,
    loadChatMessages,
    handleSelectChat,
    handleDeleteChat,
    createChatRoom,
    addChatFromApi,
    handleInvalidChatId,
    sendMessage,
    clearAIPolling
  };
};