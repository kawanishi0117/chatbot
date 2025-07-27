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
.\start-project.ps1                     # Start development environment
.\start-project.ps1 -Test              # Start with tests
.\start-project.ps1 -Clean             # Clean and rebuild

# Python linting (backend)
cd backend/chat-router
pylint src/                            # Lint Python code
```

### Testing
```bash
# Frontend testing
cd frontend/chatbot-console  # or frontend/chatbot-ui
npm test                     # Run tests

# Backend testing  
cd backend/chat-router
python test_lambda.py        # Test Lambda functions
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
- **Code reuse**: Extract common patterns after 3+ repetitions
- **Security**: All API endpoints require authentication checks

#### Frontend:
- **Loading states**: Display loading overlay during API calls
- **Error handling**: Consistent alert display for API errors
- **Authentication**: Redirect unauthorized users appropriately
- **Confirmation dialogs**: Use `useAlert().showConfirm()` instead of `window.confirm()`

#### Security:
- **Signature verification**: Each platform webhook validates authenticity
- **Input validation**: Prevent XSS/injection attacks
- **Access control**: Proper permission checks for all operations

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