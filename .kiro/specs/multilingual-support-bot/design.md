# 詳細設計書

## 概要

多言語対応問い合わせボットシステムは、初期設計書で定義されたヒアリング型のアプローチを採用し、AWS Serverlessサービスを活用してコスト効率と高可用性を実現します。システムは即座のACK応答と非同期処理による高速レスポンスを提供し、AI駆動のヒアリング・検索・回答生成機能を通じて開発者の生産性向上を支援します。

## アーキテクチャ

### システム全体構成

```mermaid
graph TB
    subgraph "External Channels"
        LINE[LINE Bot]
        Slack[Slack App]
        Teams[Microsoft Teams]
    end
    
    subgraph "AWS Infrastructure"
        subgraph "API Layer"
            APIGW[API Gateway HTTP API]
            ChatRouter[ChatRouter Lambda]
        end
        
        subgraph "Processing Layer"
            EB[EventBridge]
            SF[Step Functions Standard] %% Long-running conversational workflow
            Clarify[Clarify Lambda]
            Retrieve[Retrieve Lambda]
            Decide[DecideAction Lambda]
            Summarize[Summarize Lambda]
            Notifier[Notifier Lambda]
        end
        
        subgraph "Data Layer"
            DDB_Session[DynamoDB SessionLog]
            DDB_Vector[DynamoDB KnowledgeVector]
            SM[Secrets Manager]
        end
        
        subgraph "AI Services"
            Bedrock[Amazon Bedrock Claude 3.5 Haiku]
        end
        
        subgraph "External Services"
            GitHub[GitHub API]
            Docs[Documentation Sources]
        end
    end
    
    LINE --> APIGW
    Slack --> APIGW
    Teams --> APIGW
    
    APIGW --> ChatRouter
    ChatRouter --> DDB_Session
    ChatRouter --> Clarify
    
    Clarify --> Bedrock
    Clarify --> EB
    
    EB --> SF
    SF --> Retrieve
    SF --> Decide
    SF --> Summarize
    
    Retrieve --> DDB_Vector
    Retrieve --> GitHub
    Retrieve --> Docs
    
    Decide --> Bedrock
    Decide --> GitHub
    
    SF --> Notifier
    Notifier --> APIGW
    
    ChatRouter --> SM
```

### ヒアリング型フロー設計

初期設計書で定義されたヒアリング型アプローチに基づき、以下のフローを実装します：

1. **`/ask`（`/質問`）受信** → 新規セッション作成 + 即時ACK
2. **ヒアリング開始** → 不足情報の自動検出と質問生成
3. **ユーザー回答** → ClarifyLambda が再評価し、必要なら追加質問
4. **情報充足判定が "ready"** になると EventBridge 経由で Step Functions Standard を起動
5. **調査・回答生成（SFNワークフロー）** → Retrieve → Decide → Summarize
6. **追加質問があれば 3 に戻る**

## コンポーネントと インターフェース

### 1. ChatRouter Lambda

#### 責務
- Webhookペイロード解析（LINE/Slack/Teams対応）
- 多言語コマンド識別
- セッション管理
- 即時ACK応答（<100ms）

#### インターフェース

```typescript
interface WebhookEvent {
  platform: 'line' | 'slack' | 'teams';
  channelId: string;
  userId: string;
  message: string;
  timestamp: number;
  threadId?: string;
  replyToken?: string; // LINE用
  responseUrl?: string; // Slack用
}

interface CommandResult {
  command: CommandType;
  sessionId: string;
  language: 'ja' | 'en';
  ackMessage: string;
  shouldStartWorkflow: boolean;
}

enum CommandType {
  ASK = 'ask',           // /ask, /質問
  INVESTIGATE = 'investigate', // /investigate, /調査  
  CLEAR = 'clear',       // /clear, /クリア
  HELP = 'help',         // /help, /ヘルプ
  DONE = 'done',         // /done, /完了
  CONTINUE = 'continue'  // 通常メッセージ
}
```

#### コマンドマッピング

```typescript
const COMMAND_LANG_MAP = {
  ask: ['ask', '質問'],
  investigate: ['investigate', '調査'],
  clear: ['clear', 'クリア'],
  help: ['help', 'ヘルプ'],
  done: ['done', '完了']
};
```

### 2. SessionManager

#### データモデル

```typescript
interface SessionLog {
  PK: string;           // session#{sessionId}
  SK: string;           // ts#{epochMs}
  text: string;         // メッセージ内容
  sender: 'user' | 'bot';
  language: 'ja' | 'en';
  vector?: number[];    // 768次元ベクトル（MiniLM）
  platform: string;    // line/slack/teams
  channelId: string;
  userId: string;
  messageType: 'command' | 'response' | 'clarification';
  ttl: number;         // 3日後のepoch
}

interface SessionMetadata {
  PK: string;          // session#{sessionId}
  SK: string;          // metadata
  status: 'clarifying' | 'ready' | 'investigating' | 'completed';
  createdAt: number;
  lastActivity: number;
  messageCount: number;
  language: 'ja' | 'en';
  platform: string;
  channelId: string;
  userId: string;
  stepFunctionArn?: string;
  taskToken?: string;  // Step Functions Callback用
}
```

### 3. Clarify Lambda（ヒアリング制御）

#### 責務
- 不足情報の自動検出
- 質問テンプレートからの質問生成
- ヒアリング完了判定

#### 不足情報スキーマ

```yaml
# clarification_schema.yml
required_fields:
  - field: environment
    questions:
      ja: "どのような環境で問題が発生していますか？（OS、バージョンなど）"
      en: "What environment are you experiencing this issue in? (OS, version, etc.)"
    
  - field: reproduction_steps
    questions:
      ja: "問題を再現する手順を教えてください。"
      en: "Please provide steps to reproduce the issue."
    
  - field: expected_behavior
    questions:
      ja: "期待していた動作は何ですか？"
      en: "What was the expected behavior?"
    
  - field: actual_behavior
    questions:
      ja: "実際にはどのような動作になりましたか？"
      en: "What actually happened?"

optional_fields:
  - field: error_messages
    questions:
      ja: "エラーメッセージがあれば教えてください。"
      en: "Please share any error messages if available."
```

#### インターフェース

```typescript
interface ClarificationRequest {
  sessionId: string;
  conversationHistory: SessionLog[];
  language: 'ja' | 'en';
}

interface ClarificationResponse {
  ready: boolean;
  missingFields: string[];
  nextQuestion?: string;
  confidence: number;
}
```

### 4. Step Functions ワークフロー（調査・回答生成）

#### State Machine定義

```json
{
  "Comment": "Support Bot Clarification Workflow",
  "StartAt": "StartClarification",
  "States": {
    "StartClarification": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:region:account:function:ClarifyLambda",
      "Next": "CheckClarificationComplete"
    },
    "CheckClarificationComplete": {
      "Type": "Choice",
      "Choices": [
        {
          "Variable": "$.ready",
          "BooleanEquals": true,
          "Next": "RetrieveKnowledge"
        }
      ],
      "Default": "SendClarificationQuestion"
    },
    "SendClarificationQuestion": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:region:account:function:NotifierLambda",
      "Next": "WaitForUserResponse"
    },
    "WaitForUserResponse": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke.waitForTaskToken",
      "Parameters": {
        "FunctionName": "arn:aws:lambda:region:account:function:CallbackHandler",
        "Payload": {
          "taskToken.$": "$$.Task.Token",
          "sessionId.$": "$.sessionId"
        }
      },
      "TimeoutSeconds": 900,
      "Next": "StartClarification",
      "Catch": [
        {
          "ErrorEquals": ["States.Timeout"],
          "Next": "TimeoutNotification"
        }
      ]
    },
    "RetrieveKnowledge": {
      "Type": "Parallel",
      "Branches": [
        {
          "StartAt": "SearchDocuments",
          "States": {
            "SearchDocuments": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:region:account:function:RetrieveLambda",
              "Parameters": {
                "source": "documents",
                "sessionId.$": "$.sessionId"
              },
              "End": true
            }
          }
        },
        {
          "StartAt": "SearchGitHub",
          "States": {
            "SearchGitHub": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:region:account:function:RetrieveLambda",
              "Parameters": {
                "source": "github",
                "sessionId.$": "$.sessionId"
              },
              "End": true
            }
          }
        },
        {
          "StartAt": "SearchChatHistory",
          "States": {
            "SearchChatHistory": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:region:account:function:RetrieveLambda",
              "Parameters": {
                "source": "chat_history",
                "sessionId.$": "$.sessionId"
              },
              "End": true
            }
          }
        }
      ],
      "Next": "DecideAction"
    },
    "DecideAction": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:region:account:function:DecideActionLambda",
      "Next": "ExecuteAction"
    },
    "ExecuteAction": {
      "Type": "Choice",
      "Choices": [
        {
          "Variable": "$.action",
          "StringEquals": "answer",
          "Next": "SendAnswer"
        },
        {
          "Variable": "$.action",
          "StringEquals": "create_issue",
          "Next": "CreateIssueAndPR"
        }
      ]
    },
    "SendAnswer": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:region:account:function:NotifierLambda",
      "Next": "SummarizeSession"
    },
    "CreateIssueAndPR": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:region:account:function:DecideActionLambda",
      "Parameters": {
        "action": "github_operations",
        "sessionId.$": "$.sessionId"
      },
      "Next": "SendAnswer"
    },
    "SummarizeSession": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:region:account:function:SummarizeLambda",
      "End": true
    },
    "TimeoutNotification": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:region:account:function:NotifierLambda",
      "Parameters": {
        "message": "セッションがタイムアウトしました。再度 /質問 してください。",
        "sessionId.$": "$.sessionId"
      },
      "End": true
    }
  }
}
```

### 5. Retrieve Lambda

#### 責務
- DynamoDB Vector Search実行
- GitHub Issues/PR検索
- ドキュメント検索
- 会話履歴検索（最新50件）

#### インターフェース

```typescript
interface RetrieveRequest {
  sessionId: string;
  source: 'documents' | 'github' | 'chat_history';
  limit?: number;
}

interface RetrieveResponse {
  results: SearchResult[];
  totalFound: number;
  searchTime: number;
}

interface SearchResult {
  content: string;
  source: string;
  relevanceScore: number;
  metadata: {
    title?: string;
    url?: string;
    labels?: string[];
    createdAt?: string;
    issueNumber?: number;
  };
}
```

#### ベクター検索実装

```typescript
class VectorSearchService {
  async searchSimilar(
    queryVector: number[], 
    sourceType: string,
    limit: number = 10
  ): Promise<SearchResult[]> {
    // DynamoDB Vector Search実装
    const params = {
      TableName: 'KnowledgeVector',
      FilterExpression: 'source_type = :source_type',
      ExpressionAttributeValues: {
        ':source_type': sourceType
      },
      Limit: limit
    };
    
    const result = await this.dynamodb.scan(params).promise();
    
    // コサイン類似度計算
    return result.Items
      .map(item => ({
        ...item,
        relevanceScore: this.calculateCosineSimilarity(queryVector, item.vector)
      }))
      .filter(item => item.relevanceScore > 0.7)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
  
  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    // コサイン類似度計算実装
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}
```

### 6. DecideAction Lambda

#### 責務
- AI推論による回答生成（Claude 3.5 Haiku）
- GitHub Issue/PR作成判定
- 回答品質評価

#### プロンプト設計

```typescript
const SYSTEM_PROMPT_JA = `
あなたは技術サポートボットです。以下のルールに従って日本語で回答してください：

1. 提供された検索結果と会話履歴を基に、正確で実用的な回答を生成する
2. 情報が不足している場合は、GitHub Issueの作成を提案する
3. コードサンプルがある場合は、適切にフォーマットして含める
4. 回答は簡潔で理解しやすくする
5. 解決策が複数ある場合は、優先順位をつけて提示する

検索結果:
{searchResults}

会話履歴（最新50件）:
{conversationHistory}

現在の質問: {currentQuestion}
`;

const SYSTEM_PROMPT_EN = `
You are a technical support bot. Please respond in English following these rules:

1. Generate accurate and practical answers based on the provided search results and conversation history
2. If information is insufficient, suggest creating a GitHub Issue
3. Include properly formatted code samples when available
4. Keep responses concise and easy to understand
5. When multiple solutions exist, present them in order of priority

Search Results:
{searchResults}

Conversation History (latest 50 messages):
{conversationHistory}

Current Question: {currentQuestion}
`;

interface AIResponse {
  answer: string;
  confidence: number;
  suggestedAction: 'answer' | 'create_issue' | 'need_more_info';
  language: 'ja' | 'en';
  reasoning: string;
}
```

### 7. GitHub Integration

#### GitHub App設定

```typescript
interface GitHubConfig {
  appId: string;
  privateKey: string;
  installationId: string;
  permissions: {
    contents: 'write';
    issues: 'write';
    pull_requests: 'write';
  };
}

class GitHubService {
  async searchIssues(query: string): Promise<GitHubIssue[]> {
    const response = await this.octokit.rest.search.issuesAndPullRequests({
      q: `${query} repo:${this.repo} is:issue`,
      sort: 'updated',
      order: 'desc',
      per_page: 10
    });
    return response.data.items;
  }
  
  async createIssue(params: {
    title: string;
    body: string;
    labels: string[];
  }): Promise<GitHubIssue> {
    return await this.octokit.rest.issues.create({
      owner: this.owner,
      repo: this.repo,
      ...params
    });
  }
  
  async createPR(params: {
    title: string;
    body: string;
    head: string;
    base: string;
  }): Promise<GitHubPR> {
    return await this.octokit.rest.pulls.create({
      owner: this.owner,
      repo: this.repo,
      ...params
    });
  }
}
```

## データモデル

### DynamoDB テーブル設計

#### SessionLog テーブル
```
Table: SessionLog
Partition Key: session#{sessionId}
Sort Key: ts#{epochMs} | metadata

Attributes:
- text (String)
- sender (String) 
- language (String)
- vector (List<Number>) - 768次元
- platform (String)
- channelId (String)
- userId (String)
- messageType (String)
- ttl (Number) - 3日後のepoch

GSI1: userId-timestamp-index
- PK: userId
- SK: timestamp
- 用途: ユーザー別履歴検索

GSI2: status-lastActivity-index  
- PK: status
- SK: lastActivity
- 用途: アクティブセッション管理
```

#### KnowledgeVector テーブル
```
Table: KnowledgeVector  
Partition Key: source#{sourceType}
Sort Key: id#{documentId}

Attributes:
- vector (List<Number>) - 768次元MiniLM
- content (String)
- metadata (Map)
  - title (String)
  - url (String)
  - labels (List<String>)
  - createdAt (String)
- sourceType (String) - doc/github/chat
- lastUpdated (Number)

LSI1: source-updated-index
- PK: source#{sourceType}
- SK: lastUpdated
- 用途: 更新日時順検索
```

## エラーハンドリング

### エラー分類と対応

#### 1. システムエラー
- **Lambda Timeout**: Step Functions Retry設定（最大3回、指数バックオフ）
- **DynamoDB Throttling**: SDK自動リトライ + Exponential Backoff
- **Bedrock Rate Limit**: Queue + 遅延リトライ

#### 2. ユーザーエラー  
- **不正コマンド**: ヘルプメッセージ表示
- **セッション期限切れ**: 新規セッション案内
- **権限不足**: エラーメッセージ + 管理者通知

#### 3. 外部サービスエラー
- **GitHub API障害**: キャッシュ回答 + 後続処理スキップ
- **Webhook配信失敗**: Dead Letter Queue + 手動再送

### エラー監視とアラート

```typescript
interface ErrorMetrics {
  errorType: string;
  component: string;
  timestamp: number;
  sessionId?: string;
  userId?: string;
  errorMessage: string;
  stackTrace?: string;
}

// CloudWatch Custom Metrics
class ErrorReporter {
  async reportError(error: ErrorMetrics): Promise<void> {
    await Promise.all([
      // CloudWatch Metrics
      this.cloudwatch.putMetricData({
        Namespace: 'SupportBot',
        MetricData: [{
          MetricName: 'ErrorCount',
          Dimensions: [
            { Name: 'Component', Value: error.component },
            { Name: 'ErrorType', Value: error.errorType }
          ],
          Value: 1,
          Unit: 'Count'
        }]
      }).promise(),
      
      // CloudWatch Logs
      console.error(JSON.stringify(error))
    ]);
  }
}
```

## テスト戦略

### 1. ユニットテスト
```typescript
// ChatRouter Lambda テスト例
describe('ChatRouter', () => {
  test('should parse Japanese command correctly', async () => {
    const event = createWebhookEvent({
      message: '/質問 Podmanでエラーが発生します',
      platform: 'slack'
    });
    
    const result = await chatRouter.handler(event);
    
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).command).toBe('ask');
    expect(JSON.parse(result.body).language).toBe('ja');
  });
  
  test('should handle rate limiting', async () => {
    // 連続リクエストのテスト
    const promises = Array(10).fill(null).map(() => 
      chatRouter.handler(createWebhookEvent())
    );
    
    const results = await Promise.all(promises);
    const rateLimited = results.filter(r => r.statusCode === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

### 2. 統合テスト
```typescript
// Step Functions ワークフローテスト
describe('Clarification Workflow', () => {
  test('should complete clarification flow', async () => {
    const execution = await stepFunctions.startExecution({
      stateMachineArn: CLARIFICATION_STATE_MACHINE_ARN,
      input: JSON.stringify({
        sessionId: 'test-session',
        command: 'ask'
      })
    }).promise();
    
    // ワークフロー完了まで待機
    await waitForExecution(execution.executionArn);
    
    const result = await stepFunctions.describeExecution({
      executionArn: execution.executionArn
    }).promise();
    
    expect(result.status).toBe('SUCCEEDED');
  });
});
```

### 3. E2Eテスト
```typescript
// プラットフォーム別Webhookテスト
describe('Platform Integration', () => {
  test('should handle Slack webhook correctly', async () => {
    const slackPayload = {
      token: 'test-token',
      team_id: 'T123',
      channel_id: 'C123',
      user_id: 'U123',
      text: '/質問 テストです',
      timestamp: '1234567890.123'
    };
    
    const response = await request(app)
      .post('/webhook/slack')
      .send(slackPayload)
      .expect(200);
      
    expect(response.body).toContain('了解です');
  });
});
```

### 4. パフォーマンステスト
```typescript
// レスポンス時間測定
describe('Performance', () => {
  test('should respond within 100ms for ACK', async () => {
    const start = Date.now();
    
    await chatRouter.handler(createWebhookEvent());
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });
  
  test('should handle concurrent requests', async () => {
    const concurrency = 50;
    const promises = Array(concurrency).fill(null).map(() =>
      chatRouter.handler(createWebhookEvent())
    );
    
    const results = await Promise.all(promises);
    const successful = results.filter(r => r.statusCode === 200);
    expect(successful.length).toBe(concurrency);
  });
});
```

## セキュリティ設計

### 1. 認証・認可
```typescript
// Webhook署名検証
class WebhookValidator {
  validateSlackSignature(body: string, signature: string, timestamp: string): boolean {
    const hmac = crypto.createHmac('sha256', process.env.SLACK_SIGNING_SECRET);
    hmac.update(`v0:${timestamp}:${body}`);
    const expectedSignature = `v0=${hmac.digest('hex')}`;
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
  
  validateLineSignature(body: string, signature: string): boolean {
    const hmac = crypto.createHmac('sha256', process.env.LINE_CHANNEL_SECRET);
    hmac.update(body);
    const expectedSignature = hmac.digest('base64');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}
```

### 2. IAM最小権限設定
```yaml
# Lambda実行ロール例
ChatRouterRole:
  Type: AWS::IAM::Role
  Properties:
    AssumeRolePolicyDocument:
      Version: '2012-10-17'
      Statement:
        - Effect: Allow
          Principal:
            Service: lambda.amazonaws.com
          Action: sts:AssumeRole
    ManagedPolicyArns:
      - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    Policies:
      - PolicyName: DynamoDBAccess
        PolicyDocument:
          Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action:
                - dynamodb:PutItem
                - dynamodb:GetItem
                - dynamodb:UpdateItem
                - dynamodb:Query
              Resource: 
                - !GetAtt SessionLogTable.Arn
                - !Sub "${SessionLogTable.Arn}/index/*"
      - PolicyName: EventBridgeAccess
        PolicyDocument:
          Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action:
                - events:PutEvents
              Resource: !GetAtt EventBridge.Arn
```

### 3. データ保護
- **転送時暗号化**: HTTPS/TLS 1.2以上
- **保存時暗号化**: DynamoDB暗号化有効
- **PII情報マスキング**: ログ出力時の自動マスキング

```typescript
class PIIMasker {
  maskSensitiveData(text: string): string {
    return text
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .replace(/\b\d{3}-\d{4}-\d{4}\b/g, '[PHONE]')
      .replace(/\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, '[CARD]');
  }
}
```

## 運用・監視

### CloudWatch ダッシュボード設定

```typescript
const dashboardBody = {
  widgets: [
    {
      type: "metric",
      properties: {
        metrics: [
          ["AWS/Lambda", "Duration", "FunctionName", "ChatRouter"],
          ["AWS/Lambda", "Errors", "FunctionName", "ChatRouter"],
          ["AWS/Lambda", "Invocations", "FunctionName", "ChatRouter"]
        ],
        period: 300,
        stat: "Average",
        region: "ap-northeast-1",
        title: "ChatRouter Lambda Metrics"
      }
    },
    {
      type: "metric", 
      properties: {
        metrics: [
          ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", "SessionLog"],
          ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", "SessionLog"]
        ],
        period: 300,
        stat: "Sum",
        region: "ap-northeast-1",
        title: "DynamoDB Capacity"
      }
    }
  ]
};
```

### アラート設定

```yaml
# CloudWatch Alarms
HighErrorRateAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: SupportBot-HighErrorRate
    AlarmDescription: Error rate exceeds 5%
    MetricName: ErrorRate
    Namespace: SupportBot
    Statistic: Average
    Period: 300
    EvaluationPeriods: 2
    Threshold: 5
    ComparisonOperator: GreaterThanThreshold

HighLatencyAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: SupportBot-HighLatency
    AlarmDescription: Response time exceeds 3 seconds
    MetricName: Duration
    Namespace: AWS/Lambda
    Dimensions:
      - Name: FunctionName
        Value: ChatRouter
    Statistic: Average
    Period: 300
    EvaluationPeriods: 2
    Threshold: 3000
    ComparisonOperator: GreaterThanThreshold
```

### コスト監視

```typescript
// 月次コスト分析
interface CostBreakdown {
  apiGateway: number;
  lambda: number;
  dynamodb: number;
  stepFunctions: number;
  bedrock: number;
  total: number;
}

class CostAnalyzer {
  async getMonthlyEstimate(): Promise<CostBreakdown> {
    // AWS Cost Explorer APIを使用してコスト分析
    const costData = await this.costExplorer.getCostAndUsage({
      TimePeriod: {
        Start: this.getMonthStart(),
        End: this.getMonthEnd()
      },
      Granularity: 'MONTHLY',
      Metrics: ['BlendedCost'],
      GroupBy: [
        {
          Type: 'DIMENSION',
          Key: 'SERVICE'
        }
      ]
    }).promise();
    
    return this.parseCostData(costData);
  }
}
```

この詳細設計書により、エンジニアは実装に必要な全ての技術仕様を把握できます。