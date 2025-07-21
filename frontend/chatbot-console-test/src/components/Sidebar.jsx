import React from 'react'

const Sidebar = ({ selectedChat, setSelectedChat }) => {
  const chats = [
    { id: 1, title: 'React Development Help', lastMessage: 'How do I use useEffect?', time: '2m ago' },
    { id: 2, title: 'Tailwind CSS Questions', lastMessage: 'What are the best practices...', time: '1h ago' },
    { id: 3, title: 'JavaScript Debugging', lastMessage: 'I have an issue with async...', time: '3h ago' },
    { id: 4, title: 'API Integration', lastMessage: 'How to handle CORS errors?', time: '1d ago' },
    { id: 5, title: 'Performance Optimization', lastMessage: 'My app is running slow...', time: '2d ago' },
  ]

  return (
    <aside className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
      <div className="p-4">
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Chat</span>
        </button>
      </div>
      
      <div className="px-4 pb-4">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Recent Chats
        </h2>
        
        <div className="space-y-2">
          {chats.map(chat => (
            <button
              key={chat.id}
              onClick={() => setSelectedChat(chat.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                selectedChat === chat.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {chat.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                    {chat.lastMessage}
                  </p>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 flex-shrink-0">
                  {chat.time}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}

export default Sidebar