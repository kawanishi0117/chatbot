import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
// React StrictModeの制御
// 開発環境でAPI重複実行問題がある場合は環境変数で無効化可能
const shouldUseStrictMode = import.meta.env.VITE_DISABLE_STRICT_MODE !== 'true';

if (shouldUseStrictMode) {
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
} else {
  console.warn('[開発環境] React StrictModeが無効化されています。本番環境では有効化してください。');
  root.render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
