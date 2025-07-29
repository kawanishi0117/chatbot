# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Frontend Development (React + Vite + TypeScript)
```bash
# Chatbot Console (Admin UI)
cd frontend/chatbot-console
npm run dev          # Start development server
npm run build        # Build for production  
npm run lint         # Run ESLint

# Chatbot UI (Chat Interface)
cd frontend/chatbot-ui
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
```

### Backend Development (AWS Lambda + SAM)
```bash
# From project root
sam build --parallel                    # Build Lambda functions
sam local start-api --host 0.0.0.0 --port 3000  # Start local API

# PowerShell (Windows)
.\scripts\dev\start-project.ps1                     # Start development environment
.\scripts\dev\start-project.ps1 -Test              # Start with tests
.\scripts\dev\start-project.ps1 -Clean             # Clean and rebuild
.\scripts\dev\start-project.ps1 -WithAI            # Start with AI auto-response features

# Python linting (backend)
cd backend/chat-router
pylint src/                            # Lint Python code
```

### Testing
```bash
# Frontend testing
cd frontend/chatbot-console  # or frontend/chatbot-ui
npm test                     # Run tests
npm run test -- --watch     # Run tests in watch mode

# Backend testing  
cd backend/chat-router
python test_lambda.py        # Test Lambda functions
python -m pytest tests/     # Run pytest tests if available
```

### Deployment
```bash
# Deploy to different environments
sam deploy --config-env dev      # Development
sam deploy --config-env staging  # Staging
sam deploy --config-env prod     # Production
```

## Project Architecture

### Overall System Design
This is a **multi-platform chatbot system** with a serverless backend and dual React frontends:

- **Backend**: AWS Lambda function handling webhooks from Slack, Microsoft Teams, LINE, and custom UI
- **Frontend Console**: Admin interface for bot management and user administration
- **Frontend UI**: Chat interface for end-user interactions

### Backend Architecture (AWS Serverless)

#### Core Components:
1. **ChatRouter Lambda** (`backend/chat-router/src/lambda_function.py`)
   - Single Lambda function handling all API requests
   - Routes to appropriate handlers based on URL path
   - Supports webhook processing and REST API endpoints

2. **Handler System** (`backend/chat-router/src/handlers/`)
   - `BaseHandler`: Abstract base for webhook processing
   - Platform-specific handlers: `slack_handler.py`, `teams_handler.py`, `line_handler.py`, `custom_handler.py`
   - API handlers: `bot_settings_handler.py`, `user_handler.py`, `chat_handler.py`

3. **Message Normalization** (`backend/chat-router/src/normalizers/`)
   - Converts platform-specific webhook formats to unified `UnifiedMessage` format
   - Handles platform differences in message structure and metadata

4. **Storage Layer** (`backend/chat-router/src/storage.py`)
   - DynamoDB for message storage with 24-hour TTL
   - S3 for binary data (images, files) with lifecycle policies
   - Consistent API for save/retrieve operations

#### Room Key Format by Platform:
- **Slack**: `slack:{team_id}:{channel}` 
- **Teams**: `teams:{tenantId}:{conversationId}`
- **LINE**: `line:{source.type}:{id}`
- **Custom UI**: `custom:{roomId}`

#### API Endpoints:
- `/webhook/{platform}` - Platform webhook processing
- `/api/auth/*` - User authentication (login/register/logout)
- `/api/bots/*` - Bot configuration management
- `/api/chats/*` - Chat room operations
- `/health` - Health check
- `/test` - Development testing

### Frontend Architecture (React + TypeScript + Vite)

#### Shared Components Pattern:
Both frontends share similar component structure:
- **Loading Components**: Consistent loading states (`LoadingSpinner`, `LoadingOverlay`, etc.)
- **Alert System**: Context-based alert management (`AlertContext.tsx`)
- **API Service**: Centralized HTTP client (`services/api.ts`)

#### Console-Specific Features:
- Bot management (create, edit, delete)
- User administration and invitations
- Settings panels (GitHub, S3, Webhooks)
- Permission management

#### UI-Specific Features:
- Chat interface with message history
- Bot selection modal
- Real-time message display

## Development Guidelines

### Code Style Requirements (from .cursor/rules/always.mdc):

#### Python Backend:
- **Import placement**: Always at file top, use try-except for Lambda imports
- **DynamoDB handling**: Convert Decimal types to int/float before JSON response
- **DynamoDB keys**: Use correct table and key format (PK/SK for chat_table, not roomKey/messageId)
- **Error handling**: Catch ClientError for DynamoDB operations
- **Code reuse**: Extract common patterns after 3+ repetitions (shared functions)
- **Security**: All API endpoints require authentication checks using `get_authenticated_user(headers)`

#### Frontend:
- **Loading states**: Display loading overlay during API calls (use LoadingOverlay component)
- **Error handling**: Consistent alert display for API errors via AlertContext
- **Authentication**: Redirect unauthorized users appropriately
- **Confirmation dialogs**: Use `useAlert().showConfirm()` instead of `window.confirm()`

#### Security:
- **Signature verification**: Each platform webhook validates authenticity
- **Input validation**: Prevent XSS/injection attacks
- **Access control**: Proper permission checks for all operations

#### API Endpoint Development (from .cursor/rules/api-endpoint-checklist.mdc):
When adding new API endpoints:
1. Create/update handler class in `src/handlers/`
2. Add route to `lambda_function.py`
3. **CRITICAL**: Update `template.yaml` with new Events configuration
4. Add API method to frontend `services/api.ts`
5. Test with `sam build` and server restart

### Development Environment
- **Local backend**: Uses SAM Local API Gateway simulation
- **Database**: DynamoDB Local or AWS DynamoDB depending on configuration
- **CORS**: Configured for local frontend development
- **Secrets**: Environment variables for platform API keys and tokens

### Configuration Files:
- `template.yaml` - AWS SAM template with all Lambda and API Gateway configuration
- `samconfig.toml` - Environment-specific deployment settings
- `pyproject.toml` - Python project configuration with Ruff linting
- Frontend `package.json` files - Standard Vite/React configuration

## Key Integration Points

### Message Flow:
1. Platform webhook → Lambda handler → Message normalization → Storage
2. Frontend API call → Lambda router → Handler → Database/Response

### Authentication:
- JWT-based for API endpoints
- Platform-specific webhook signature verification
- Session management through browser storage

### Data Storage:
- **DynamoDB**: Text messages, metadata, user sessions (TTL: 24 hours)
- **S3**: Binary content with automated cleanup
- **Room-based**: Messages grouped by platform-specific room keys

## AI Integration Architecture

### Core AI Components:
1. **Unified Lambda Function** (`src/lambda_function.py`)
   - Handles both HTTP API requests and SQS-triggered AI processing
   - Integrates with AWS Bedrock for Claude models
   - Asynchronous AI processing via SQS events

2. **Service Layer** (`src/services/`)
   - `bedrock_client_service.py`: AWS Bedrock integration
   - `model_selector_service.py`: AI model selection logic
   - `sqs_service.py`: Queue management for async processing

3. **Model Configuration**:
   - Development: Uses basic models for cost efficiency
   - Production: `anthropic.claude-3-haiku-20240307-v1:0` (configurable via samconfig.toml)

### AI Processing Flow:
1. User message → Platform webhook → Message normalization
2. AI trigger detection → SQS queue → AI Processor Lambda  
3. Bedrock API call → Response generation → Platform delivery

## Scripts and Tests Organization

### Directory Structure:
```
scripts/
├── dev/           # Development scripts (start-project.ps1, etc.)
├── deploy/        # Deployment scripts (setup-aws-test-data.ps1)
└── test/          # Test scripts (reserved)

tests/
├── integration/   # Integration tests (test-sqs-complete.sh)
├── unit/          # Unit tests (reserved)
└── fixtures/      # Test data files (manual-lambda-event.json)
```

### SQS Integration Testing:
```bash
# Complete SQS→Lambda integration test
./tests/integration/test-sqs-complete.sh

# Manual Lambda function test
cd backend/chat-router
sam local invoke ChatRouterFunction --event ../../tests/fixtures/manual-lambda-event.json
```

See `scripts/README.md` for detailed usage instructions.