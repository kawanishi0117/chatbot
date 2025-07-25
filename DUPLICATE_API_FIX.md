# 重複API呼び出し問題の修正

## 問題の概要

画面をリロードすると同じAPIが2回呼ばれる問題が発生していました。

## 原因

React.StrictModeが有効になっているため、開発環境でuseEffectフックが2回実行され、`api.getCurrentUser()`が重複して呼び出されていました。

### 影響を受けたファイル

1. `/frontend/chatbot-ui/src/App.tsx` - チャットボットUIアプリケーション
2. `/frontend/chatbot-console/src/App.tsx` - チャットボット管理コンソール

両方のアプリケーションで同じ問題が発生していました。

## 実装した解決策

### 1. 重複実行防止機能の追加

各App.tsxファイルに以下の機能を追加しました：

- `authCheckInProgress` ref: 認証チェックが進行中かどうかを追跡
- `abortControllerRef` ref: リクエストのキャンセル機能
- useEffectのクリーンアップ関数: コンポーネントアンマウント時の適切な処理

### 2. 修正されたuseEffectの構造

```javascript
useEffect(() => {
  const checkAuth = async () => {
    // 既に認証チェックが進行中の場合は何もしない
    if (authCheckInProgress.current) {
      return;
    }

    authCheckInProgress.current = true;
    
    // 前回のリクエストがあればキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // 新しいAbortControllerを作成
    abortControllerRef.current = new AbortController();

    // API呼び出し処理...
    
    authCheckInProgress.current = false;
  };
  
  checkAuth();

  // クリーンアップ関数
  return () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    authCheckInProgress.current = false;
  };
}, []);
```

### 3. ログイン処理の最適化

handleLogin関数も最適化し、不要な重複API呼び出しを防止しました。

## テストの追加

両方のアプリケーションに以下のテストを追加しました：

1. React.StrictMode環境での重複API呼び出し防止テスト
2. 認証失敗時の適切な処理テスト
3. トークンが存在しない場合のAPI呼び出し回避テスト

## 修正されたファイル一覧

### chatbot-ui
- `src/App.tsx` - メインアプリケーションロジック
- `src/App.test.tsx` - テストケース

### chatbot-console
- `src/App.tsx` - メインアプリケーションロジック
- `src/App.test.tsx` - テストケース

## 検証方法

### 1. 開発環境での確認

1. アプリケーションを起動
2. ブラウザの開発者ツールのNetworkタブを開く
3. ページをリロード
4. `/api/auth/me` エンドポイントが1回だけ呼ばれることを確認

### 2. テストの実行

```bash
# chatbot-ui
cd frontend/chatbot-ui
npm test

# chatbot-console
cd frontend/chatbot-console
npm test
```

## 技術的な詳細

### React.StrictModeについて

React.StrictModeは開発環境でのみ有効で、以下の動作を意図的に2回実行します：

- コンポーネントのコンストラクタ
- render メソッド
- state更新関数
- useEffect、useMemo、その他のHooks

これは副作用を検出し、コンポーネントが複数回呼ばれても正常に動作することを保証するためです。

### 解決策の利点

1. **開発環境と本番環境の両方で動作**: StrictModeの有無に関係なく正常に動作
2. **メモリリーク防止**: AbortControllerによる適切なリクエストキャンセル
3. **パフォーマンス向上**: 不要な重複API呼び出しの削減
4. **保守性**: 明確な状態管理とクリーンアップ処理

## 今後の改善案

1. **API サービスレベルでの重複防止**: より包括的な解決策として、APIサービス層でのリクエスト重複排除機能の実装を検討
2. **リクエストキャッシュ**: 短時間での同一リクエストのキャッシュ機能
3. **グローバル状態管理**: Redux等を使用したより堅牢な状態管理の導入