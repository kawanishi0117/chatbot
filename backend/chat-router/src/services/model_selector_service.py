"""AIモデル選択サービス

ユーザーメッセージの内容やタスクタイプに基づいて
最適なBedrockモデルを選択する
"""

import logging
import re
from typing import Dict, Any, Optional, List

# ログ設定
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class ModelSelectorService:
    """AIモデル選択サービス"""

    def __init__(self):
        """初期化"""
        # タスク分類のキーワード辞書
        self.task_keywords = {
            'technical': [
                'bug', 'error', 'エラー', 'バグ', 'exception', 'issue', 'problem',
                'debug', 'デバッグ', 'fix', '修正', 'troubleshoot', 'トラブル',
                'code', 'コード', 'function', '関数', 'method', 'メソッド',
                'api', 'database', 'sql', 'query', 'server', 'サーバー',
                'deploy', 'デプロイ', 'config', '設定', 'performance', 'パフォーマンス'
            ],
            'creative': [
                'create', '作成', 'write', '書い', 'generate', '生成', 'design', 'デザイン',
                'story', '物語', 'article', '記事', 'blog', 'ブログ', 'content', 'コンテンツ',
                'creative', '創造', 'imagine', '想像', 'brainstorm', 'アイデア',
                'novel', '小説', 'poem', '詩', 'script', '脚本', 'marketing', 'マーケティング'
            ],
            'analysis': [
                'analyze', '分析', 'compare', '比較', 'evaluate', '評価', 'review', 'レビュー',
                'explain', '説明', 'summarize', '要約', 'research', '研究', '調査',
                'report', 'レポート', 'data', 'データ', 'statistics', '統計',
                'trend', 'トレンド', 'insight', '洞察', 'conclusion', '結論',
                'recommendation', '推奨', 'strategy', '戦略', 'planning', '計画'
            ],
            'general': [
                'hello', 'こんにちは', 'help', 'ヘルプ', 'question', '質問',
                'what', 'how', 'why', 'when', 'where', 'who',
                'なに', 'どう', 'なぜ', 'いつ', 'どこ', 'だれ',
                'please', 'お願い', 'thanks', 'ありがとう', 'sorry', 'すみません'
            ]
        }
        
        # 複雑さ判定のキーワード
        self.complexity_indicators = {
            'high': [
                'complex', '複雑', 'detailed', '詳細', 'comprehensive', '包括的',
                'thorough', '徹底的', 'deep', '深い', 'advanced', '高度',
                'multi-step', '多段階', 'integration', '統合', 'architecture', 'アーキテクチャ'
            ],
            'medium': [
                'moderate', '中程度', 'standard', '標準', 'typical', '一般的',
                'normal', '通常', 'regular', '定期的', 'basic', '基本的'
            ],
            'low': [
                'simple', 'シンプル', 'easy', '簡単', 'quick', '素早い',
                'brief', '簡潔', 'basic', '基本', 'straightforward', '単純'
            ]
        }

    def select_model(self, user_message: str, bot_config: Dict[str, Any]) -> str:
        """ユーザーメッセージに基づいて最適なモデルを選択
        
        Args:
            user_message: ユーザーからのメッセージ
            bot_config: ボット設定（aiConfig含む）
            
        Returns:
            str: 選択されたモデルID
        """
        try:
            # aiConfig取得
            ai_config = bot_config.get('aiConfig', {})
            if isinstance(ai_config, dict) and 'M' in ai_config:
                # DynamoDB Map型の場合
                ai_config = self._extract_from_dynamodb_map(ai_config['M'])
            
            # デフォルトモデル
            default_model = ai_config.get('defaultModel', 'anthropic.claude-3-5-haiku-20241022-v2:0')
            task_model_mapping = ai_config.get('taskModelMapping', {})
            
            # メッセージ正規化
            normalized_message = user_message.lower().strip()
            
            # タスクタイプ判定
            task_type = self._classify_task(normalized_message)
            
            # 複雑さ判定
            complexity = self._assess_complexity(normalized_message)
            
            # モデル選択ロジック
            selected_model = self._determine_model(
                task_type, 
                complexity, 
                task_model_mapping, 
                default_model
            )
            
            logger.info(
                f"Model selection: task_type={task_type}, "
                f"complexity={complexity}, selected_model={selected_model}"
            )
            
            return selected_model
            
        except Exception as e:
            logger.error(f"Error in model selection: {str(e)}")
            # エラー時はデフォルトモデルを返す
            return bot_config.get('aiConfig', {}).get('defaultModel', 
                'anthropic.claude-3-5-haiku-20241022-v2:0')

    def _classify_task(self, message: str) -> str:
        """メッセージからタスクタイプを分類
        
        Args:
            message: 正規化されたメッセージ
            
        Returns:
            str: タスクタイプ（technical/creative/analysis/general）
        """
        task_scores = {}
        
        for task_type, keywords in self.task_keywords.items():
            score = 0
            for keyword in keywords:
                # 完全マッチ
                if keyword in message:
                    score += 2
                # 部分マッチ（語幹マッチ）
                elif any(keyword in word for word in message.split()):
                    score += 1
            
            task_scores[task_type] = score
        
        # 最高スコアのタスクタイプを選択
        if max(task_scores.values()) == 0:
            return 'general'
        
        return max(task_scores, key=task_scores.get)

    def _assess_complexity(self, message: str) -> str:
        """メッセージの複雑さを評価
        
        Args:
            message: 正規化されたメッセージ
            
        Returns:
            str: 複雑さレベル（high/medium/low）
        """
        # メッセージ長による基本判定
        length_score = 0
        if len(message) > 200:
            length_score = 2
        elif len(message) > 100:
            length_score = 1
        
        # キーワードによる複雑さ判定
        complexity_scores = {}
        for level, keywords in self.complexity_indicators.items():
            score = sum(1 for keyword in keywords if keyword in message)
            complexity_scores[level] = score
        
        # 総合判定
        total_complexity = complexity_scores.get('high', 0) * 3 + \
                          complexity_scores.get('medium', 0) * 2 + \
                          complexity_scores.get('low', 0) * 1 + \
                          length_score
        
        if total_complexity >= 4:
            return 'high'
        elif total_complexity >= 2:
            return 'medium'
        else:
            return 'low'

    def _determine_model(
        self, 
        task_type: str, 
        complexity: str, 
        task_model_mapping: Dict[str, str], 
        default_model: str
    ) -> str:
        """タスクタイプと複雑さに基づいてモデルを決定
        
        Args:
            task_type: タスクタイプ
            complexity: 複雑さレベル
            task_model_mapping: タスク別モデルマッピング
            default_model: デフォルトモデル
            
        Returns:
            str: 選択されたモデルID
        """
        # タスク別マッピングから選択
        if task_type in task_model_mapping:
            base_model = task_model_mapping[task_type]
        else:
            base_model = default_model
        
        # 複雑さに基づいてモデルを調整
        if complexity == 'high':
            # 複雑なタスクにはSonnetを優先
            if 'haiku' in base_model.lower():
                # HaikuをSonnetに置換
                base_model = base_model.replace('haiku', 'sonnet')
        elif complexity == 'low':
            # 簡単なタスクにはHaikuを優先（コスト効率）
            if 'sonnet' in base_model.lower() and task_type == 'general':
                # 一般的かつ簡単なタスクのみHaikuに置換
                base_model = base_model.replace('sonnet', 'haiku')
        
        return base_model

    def _extract_from_dynamodb_map(self, dynamodb_map: Dict[str, Any]) -> Dict[str, Any]:
        """DynamoDB Map型からPythonオブジェクトを抽出
        
        Args:
            dynamodb_map: DynamoDB Map型データ
            
        Returns:
            dict: 抽出されたデータ
        """
        result = {}
        
        for key, value in dynamodb_map.items():
            if isinstance(value, dict):
                if 'S' in value:  # String
                    result[key] = value['S']
                elif 'N' in value:  # Number
                    try:
                        result[key] = float(value['N'])
                    except ValueError:
                        result[key] = value['N']
                elif 'M' in value:  # Map
                    result[key] = self._extract_from_dynamodb_map(value['M'])
                elif 'L' in value:  # List
                    result[key] = [item for item in value['L']]
            else:
                result[key] = value
        
        return result

    def get_recommended_config(self, model_id: str) -> Dict[str, Any]:
        """モデルIDに基づいて推奨設定を取得
        
        Args:
            model_id: モデルID
            
        Returns:
            dict: 推奨設定
        """
        base_config = {
            'maxTokens': 4096,
            'temperature': 0.7,
            'topP': 0.9
        }
        
        if 'sonnet' in model_id.lower():
            # Sonnetは創造的タスクに適している
            base_config.update({
                'temperature': 0.8,
                'topP': 0.95,
                'maxTokens': 8192
            })
        elif 'haiku' in model_id.lower():
            # Haikuは効率重視
            base_config.update({
                'temperature': 0.6,
                'topP': 0.9,
                'maxTokens': 4096
            })
        
        return base_config

    def validate_model_selection(
        self, 
        model_id: str, 
        message_length: int, 
        context_length: int
    ) -> bool:
        """モデル選択の妥当性を検証
        
        Args:
            model_id: 選択されたモデルID
            message_length: メッセージ長
            context_length: コンテキスト長
            
        Returns:
            bool: 妥当な場合True
        """
        # トークン数概算（文字数の約1/4）
        estimated_tokens = (message_length + context_length) // 4
        
        # モデル別の制限チェック
        if 'haiku' in model_id.lower() and estimated_tokens > 100000:
            logger.warning(f"Large context for Haiku model: {estimated_tokens} tokens")
            return False
        elif 'sonnet' in model_id.lower() and estimated_tokens > 180000:
            logger.warning(f"Large context for Sonnet model: {estimated_tokens} tokens")
            return False
        
        return True