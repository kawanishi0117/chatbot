import { useState } from 'react'
import ChatWindow from './components/ChatWindow'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import useTheme from './hooks/useTheme'

function App() {
  const [selectedChat, setSelectedChat] = useState(1)
  const { darkMode, setDarkMode } = useTheme()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="min-h-screen flex flex-col">
        <Header darkMode={darkMode} setDarkMode={setDarkMode} />
        
        <div className="flex flex-1 overflow-hidden">
          <Sidebar selectedChat={selectedChat} setSelectedChat={setSelectedChat} />
          <ChatWindow selectedChat={selectedChat} />
        </div>
      </div>
    </div>
  )
}

export default App
