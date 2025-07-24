import React from 'react';
import { useAlert } from '../contexts/AlertContext';

/**
 * アラートモーダルの使用例
 * 
 * このコンポーネントは、カスタムアラートモーダルシステムの使用方法を示しています。
 * 従来のブラウザのalert()やconfirm()の代わりに、より美しく一貫性のあるUIを提供します。
 */
const AlertUsageExample: React.FC = () => {
  const { showAlert, showConfirm } = useAlert();

  // 基本的なアラート
  const handleBasicAlert = async () => {
    await showAlert('これは基本的なアラートメッセージです。');
  };

  // エラーアラート
  const handleErrorAlert = async () => {
    await showAlert('エラーが発生しました。', 'error', 'エラー');
  };

  // 成功アラート
  const handleSuccessAlert = async () => {
    await showAlert('操作が正常に完了しました。', 'success', '成功');
  };

  // 警告アラート
  const handleWarningAlert = async () => {
    await showAlert('注意が必要な操作です。', 'warning', '警告');
  };

  // 基本的な確認ダイアログ
  const handleBasicConfirm = async () => {
    const result = await showConfirm('この操作を実行しますか？');
    if (result) {
      await showAlert('操作を実行しました。', 'success');
    } else {
      await showAlert('操作をキャンセルしました。', 'info');
    }
  };

  // カスタムボタンテキストの確認ダイアログ
  const handleCustomConfirm = async () => {
    const result = await showConfirm(
      'ファイルを削除しますか？この操作は取り消せません。',
      'ファイル削除の確認',
      '削除する',
      'キャンセル'
    );
    
    if (result) {
      await showAlert('ファイルが削除されました。', 'success');
    }
  };

  // 複数行メッセージのアラート
  const handleMultilineAlert = async () => {
    const message = `複数行のメッセージを表示できます。

詳細な説明や手順を
複数行にわたって表示することが可能です。

改行も正しく処理されます。`;
    
    await showAlert(message, 'info', '詳細情報');
  };

  // 非同期処理での使用例
  const handleAsyncOperation = async () => {
    try {
      // 何らかの非同期処理をシミュレート
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 成功時のアラート
      await showAlert('データの保存が完了しました。', 'success');
    } catch (error) {
      // エラー時のアラート
      await showAlert('データの保存に失敗しました。', 'error');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">アラートモーダル使用例</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">基本的なアラート</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleBasicAlert}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              基本アラート
            </button>
            <button
              onClick={handleErrorAlert}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              エラーアラート
            </button>
            <button
              onClick={handleSuccessAlert}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              成功アラート
            </button>
            <button
              onClick={handleWarningAlert}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              警告アラート
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">確認ダイアログ</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleBasicConfirm}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              基本確認
            </button>
            <button
              onClick={handleCustomConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              削除確認
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">高度な使用例</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleMultilineAlert}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              複数行メッセージ
            </button>
            <button
              onClick={handleAsyncOperation}
              className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
            >
              非同期処理例
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">使用方法:</h3>
        <pre className="text-sm bg-white p-3 rounded overflow-x-auto">
{`import { useAlert } from '../contexts/AlertContext';

const MyComponent = () => {
  const { showAlert, showConfirm } = useAlert();

  const handleClick = async () => {
    // アラート表示
    await showAlert('メッセージ', 'error', 'タイトル');
    
    // 確認ダイアログ
    const result = await showConfirm('削除しますか？');
    if (result) {
      // ユーザーがOKを押した場合
    }
  };

  return <button onClick={handleClick}>クリック</button>;
};`}
        </pre>
      </div>
    </div>
  );
};

export default AlertUsageExample;