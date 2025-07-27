"""共通ユーティリティ関数

プロジェクト全体で使用される共通処理をまとめたモジュール
"""

import time
import secrets
from typing import Any, Dict, Union
from decimal import Decimal


def convert_decimal_to_int(value: Any) -> Any:
    """DynamoDBのDecimal型をint/floatに変換

    Args:
        value: 変換する値

    Returns:
        変換された値
    """
    if isinstance(value, Decimal):
        return int(value) if value % 1 == 0 else float(value)
    return value


def convert_decimal_in_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """辞書内のDecimal型を変換

    Args:
        data: 変換する辞書

    Returns:
        変換された辞書
    """
    converted = {}
    for key, value in data.items():
        converted[key] = convert_decimal_to_int(value)
    return converted


def generate_time_ordered_uuid() -> str:
    """時間順序付きUUIDを生成
    
    フォーマット: {timestamp_ms}-{random_hex}
    - timestamp_ms: ミリ秒タイムスタンプ（16進数、13桁）
    - random_hex: 暗号学的に安全な乱数（24桁）
    
    Returns:
        str: 時間順序付きUUID（例: 18c5f2a1b2d-a3f7e8d9c4b5f6g2h1i9j8k7）
    """
    # ミリ秒タイムスタンプを16進数に変換
    timestamp_ms = int(time.time() * 1000)
    timestamp_hex = format(timestamp_ms, 'x')
    
    # 暗号学的に安全な24桁のランダム文字列（96ビット）
    random_hex = secrets.token_hex(12)  # 12バイト = 24桁の16進数
    
    return f"{timestamp_hex}-{random_hex}"