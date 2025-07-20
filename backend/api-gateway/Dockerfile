# AWSのPython Lambda公式ベースイメージを使用
FROM public.ecr.aws/lambda/python:3.11

# 作業ディレクトリを設定
WORKDIR ${LAMBDA_TASK_ROOT}

# 依存関係ファイルをコピー
COPY requirements.txt .

# Pythonパッケージをインストール
RUN pip install --no-cache-dir -r requirements.txt

# Lambda関数ファイルをコピー
COPY lambda_function.py .

# その他のアプリケーションファイルをコピー（必要に応じて）
COPY . .

# Lambda関数のハンドラを指定
CMD ["lambda_function.lambda_handler"]