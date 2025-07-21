# Chatbot Console Test - React + Tailwind CSS

A modern chatbot console interface built with React and Tailwind CSS, showcasing the latest best practices for 2025.

## 🚀 Features

- ⚡ **Vite** - Lightning-fast development server and build tool
- ⚛️ **React 18** - Latest React features with hooks
- 🎨 **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- 🌙 **Dark Mode** - Built-in dark mode support with system preference detection
- 📱 **Responsive Design** - Mobile-first responsive layout
- 🎯 **Modern UI Components** - Clean and modern chat interface

## 📋 Prerequisites

- Node.js 18+ 
- npm 10+ or yarn

## 🛠️ Installation

1. Clone the repository:
```bash
cd /frontend/chatbot-console-test
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and visit `http://localhost:5173`

## 🏗️ Project Structure

```
chatbot-console-test/
├── src/
│   ├── components/
│   │   ├── Header.jsx      # Top navigation with dark mode toggle
│   │   ├── Sidebar.jsx     # Chat history sidebar
│   │   └── ChatWindow.jsx  # Main chat interface
│   ├── App.jsx            # Main application component
│   ├── main.jsx           # Application entry point
│   └── index.css          # Tailwind CSS imports
├── public/                # Static assets
├── index.html            # HTML template
├── tailwind.config.js    # Tailwind configuration
├── postcss.config.js     # PostCSS configuration
├── vite.config.js        # Vite configuration
└── package.json          # Project dependencies
```

## 🎨 Components

### Header Component
- Application title and branding
- Dark mode toggle with icon
- User profile display

### Sidebar Component
- Chat history list
- New chat button
- Interactive chat selection

### ChatWindow Component
- Message display area
- Real-time message sending
- Simulated bot responses
- Responsive input area

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint (if configured)

## 🎯 Key Technologies

- **React 18** - UI library
- **Vite 7** - Build tool
- **Tailwind CSS 3** - Styling
- **PostCSS** - CSS processing
- **ES6+** - Modern JavaScript

## 🌟 Features Implemented

1. **Modern Chat Interface**
   - Clean and intuitive design
   - Message bubbles with timestamps
   - User and bot message differentiation

2. **Dark Mode Support**
   - Toggle between light and dark themes
   - Persistent theme preference
   - Smooth transitions

3. **Responsive Layout**
   - Mobile-friendly design
   - Flexible grid system
   - Adaptive components

4. **Interactive Elements**
   - Hover effects
   - Active states
   - Smooth animations

## 🚀 Building for Production

To create a production build:

```bash
npm run build
```

The build output will be in the `dist` directory, ready for deployment.

## 📝 Notes

This is a demonstration project showcasing modern React development practices with Tailwind CSS. It includes:

- Component-based architecture
- State management with React hooks
- Tailwind utility classes for styling
- Dark mode implementation
- Responsive design patterns

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

This project is open source and available under the MIT License.
