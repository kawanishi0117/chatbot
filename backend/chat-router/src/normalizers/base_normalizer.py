"""基底正規化クラスと共通ユーティリティ

全プラットフォーム共通の正規化ロジックと基底クラスを提供する
"""

import logging
import time
from datetime import datetime
from typing import Any, Dict, Optional, Union
from abc import ABC, abstractmethod

# Lambda実行環境でのモジュールインポートを確保
try:
    from common.message import UnifiedMessage
except ImportError:
    from ..common.message import UnifiedMessage

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)


class BaseNormalizer(ABC):
    """メッセージ正規化の基底クラス"""

    def __init__(self, platform_name: str):
        """基底正規化クラスの初期化

        Args:
            platform_name: プラットフォーム名
        """
        self.platform_name = platform_name

    @abstractmethod
    def normalize(self, payload: Dict[str, Any]) -> Optional[UnifiedMessage]:
        """メッセージの正規化（抽象メソッド）

        Args:
            payload: プラットフォーム固有のWebhookペイロード

        Returns:
            正規化されたメッセージ、または有効なメッセージでない場合はNone
        """
        pass

    def _parse_timestamp_to_ms(
        self, timestamp: Optional[Union[str, int, float]]
    ) -> int:
        """様々な形式のタイムスタンプをミリ秒にパース

        Args:
            timestamp: 様々な形式のタイムスタンプ

        Returns:
            ミリ秒単位のタイムスタンプ
        """
        if not timestamp:
            return int(time.time() * 1000)

        try:
            # 数値の場合（既にUNIXタイムスタンプの可能性）
            if isinstance(timestamp, (int, float)):
                # 秒かミリ秒かを判定（10桁なら秒、13桁ならミリ秒）
                if len(str(int(timestamp))) <= 10:
                    return int(timestamp * 1000)
                else:
                    return int(timestamp)

            # 文字列の場合
            if isinstance(timestamp, str):
                # ISO8601形式の処理
                if "T" in timestamp or "Z" in timestamp:
                    # Zを+00:00に置換してISO形式をサポート
                    normalized_ts = timestamp.replace("Z", "+00:00")
                    dt = datetime.fromisoformat(normalized_ts)
                    return int(dt.timestamp() * 1000)

                # 数値文字列の場合
                try:
                    ts_float = float(timestamp)
                    if len(timestamp.split(".")[0]) <= 10:
                        return int(ts_float * 1000)
                    else:
                        return int(ts_float)
                except ValueError:
                    pass

            # パースできない場合は現在時刻を返す
            logger.warning(
                "Unable to parse timestamp: %s, using current time", timestamp
            )
            return int(time.time() * 1000)

        except Exception as e:
            logger.error("Error parsing timestamp %s: %s", timestamp, str(e))
            return int(time.time() * 1000)
