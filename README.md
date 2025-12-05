# paytm-demo 

# 💸 PayTM Clone - Digital Wallet Application

> A full-stack digital wallet application built with **Turborepo**, **Next.js**, **Express**, **PostgreSQL**, and **Prisma**. Features bank on-ramping via webhooks, P2P transfers, and secure authentication.

🚀 **Live Demo**: [http://13.60.53.72:3005/](http://13.60.53.72:3005/)

---

## 📑 Table of Contents

- [Project Overview](#-project-overview)
- [Tech Stack](#-tech-stack)
- [Architecture Overview](#-architecture-overview)
- [Turborepo Structure](#-turborepo-structure)
- [Database Design](#-database-design)
- [Core Features](#-core-features)
  - [On-Ramp Flow (Bank → Wallet)](#1-on-ramp-flow-bank--wallet)
  - [Bank Webhook Integration](#2-bank-webhook-integration)
  - [P2P Transfer](#3-p2p-transfer)
- [API Endpoints](#-api-endpoints)
- [Authentication Flow](#-authentication-flow)
- [Deployment](#-deployment)
- [Bottlenecks & Solutions](#-bottlenecks--solutions)
- [Scalability Improvements](#-scalability-improvements)
- [Running Locally](#-running-locally)

---

## 🎯 Project Overview

This project simulates a real-world digital payment system like Paytm, where users can:

1. **Add money** to their wallet from external banks (HDFC, Axis)
2. **Transfer money** peer-to-peer using phone numbers
3. **Track transactions** with real-time balance updates
4. **Secure authentication** using credentials (phone + password)

### Key Highlights
- **Monorepo architecture** using Turborepo for efficient builds and code sharing
- **Webhook-based integration** with banks for secure payment confirmation
- **Database transactions** ensuring ACID compliance for money transfers
- **Dockerized deployment** on AWS EC2

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Monorepo** | Turborepo |
| **Frontend** | Next.js 14 (App Router), React 18, TailwindCSS |
| **Backend** | Next.js Server Actions, Express.js (Webhook Server) |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Authentication** | NextAuth.js (Credentials Provider) |
| **State Management** | Recoil |
| **Password Hashing** | bcrypt |
| **Containerization** | Docker |
| **Cloud** | AWS EC2 |

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER APP (Next.js - Port 3005)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Sign In   │  │  Dashboard  │  │  Transfer   │  │    P2P Transfer     │ │
│  │   (Auth)    │  │  (Balance)  │  │ (On-Ramp)   │  │  (User to User)     │ │
│  └─────────────┘  └─────────────┘  └──────┬──────┘  └──────────┬──────────┘ │
└───────────────────────────────────────────┼────────────────────┼────────────┘
                                            │                    │
                    ┌───────────────────────┘                    │
                    │                                            │
                    ▼                                            ▼
┌─────────────────────────────────┐        ┌──────────────────────────────────┐
│        EXTERNAL BANK            │        │        DATABASE (PostgreSQL)      │
│   (HDFC / Axis Net Banking)     │        │  ┌────────┐  ┌─────────────────┐ │
│                                 │        │  │  User  │  │ OnRampTransaction│ │
│  User completes payment on      │        │  ├────────┤  ├─────────────────┤ │
│  bank's website                 │        │  │Balance │  │   p2pTransfer   │ │
└───────────────┬─────────────────┘        │  └────────┘  └─────────────────┘ │
                │                          └────────────────────▲─────────────┘
                │ Bank confirms payment                         │
                ▼                                               │
┌─────────────────────────────────┐                            │
│   BANK WEBHOOK (Express:3003)   │────────────────────────────┘
│                                 │  Updates balance &
│  POST /hdfcWebhook              │  transaction status
│  - Receives token, userId,      │
│    amount from bank             │
│  - Atomic DB transaction        │
└─────────────────────────────────┘
```

---

## 📁 Turborepo Structure

```
paytm-project-starter-monorepo/
├── apps/
│   ├── user-app/              # Main wallet application (Next.js)
│   ├── merchant-app/          # Merchant dashboard (Next.js)
│   └── bank-webhook/          # Webhook server (Express.js)
│
├── packages/
│   ├── db/                    # Prisma schema & database client
│   ├── ui/                    # Shared UI components
│   ├── store/                 # Recoil atoms & hooks
│   ├── eslint-config/         # Shared ESLint configurations
│   └── typescript-config/     # Shared TypeScript configs
│
├── docker/
│   └── Dockerfile.user        # Docker config for user-app
│
├── turbo.json                 # Turborepo pipeline config
└── package.json               # Root workspace config
```

### Why Turborepo?

| Benefit | Description |
|---------|-------------|
| **Code Sharing** | Shared `@repo/db`, `@repo/ui`, `@repo/store` across all apps |
| **Build Caching** | Incremental builds - only rebuild what changed |
| **Parallel Execution** | Run tasks across apps simultaneously |
| **Dependency Graph** | Automatic task ordering based on dependencies |

### Turborepo Pipeline (`turbo.json`)

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],      // Build dependencies first
      "outputs": [".next/**"]        // Cache Next.js output
    },
    "dev": {
      "cache": false,               // No caching in dev mode
      "persistent": true            // Keep running
    }
  }
}
```

---

## 🗄 Database Design

### Entity Relationship Diagram

```
┌──────────────────┐       ┌────────────────────────┐
│      User        │       │   OnRampTransaction    │
├──────────────────┤       ├────────────────────────┤
│ id (PK)          │───┐   │ id (PK)                │
│ email            │   │   │ status (enum)          │
│ name             │   │   │ token (unique)         │
│ number (unique)  │   ├──▶│ provider               │
│ password (hash)  │   │   │ amount                 │
└──────────────────┘   │   │ startTime              │
         │             │   │ userId (FK)            │
         │             │   └────────────────────────┘
         │             │
         ▼             │   ┌────────────────────────┐
┌──────────────────┐   │   │      p2pTransfer       │
│     Balance      │   │   ├────────────────────────┤
├──────────────────┤   │   │ id (PK)                │
│ id (PK)          │   │   │ amount                 │
│ userId (FK,uniq) │◀──┤   │ timestamp              │
│ amount           │   ├──▶│ fromUserId (FK)        │
│ locked           │   └──▶│ toUserId (FK)          │
└──────────────────┘       └────────────────────────┘
```

### Key Design Decisions

1. **Balance Table Separation**: Separate from User for:
   - Faster balance queries (no joins needed)
   - Row-level locking during transactions
   - `locked` field for pending transactions

2. **OnRampTransaction Token**: Unique token for:
   - Idempotency (prevent duplicate webhooks)
   - Tracking transaction lifecycle (Processing → Success/Failure)

3. **Status Enum**: `Processing | Success | Failure`
   - Webhook updates status atomically

---

## ⚡ Core Features

### 1. On-Ramp Flow (Bank → Wallet)

The on-ramp process allows users to add money from their bank account to wallet.

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │     │ User App │     │    DB    │     │   Bank   │     │ Webhook  │
│ (Client) │     │ (Next.js)│     │(Postgres)│     │(External)│     │(Express) │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │                │
     │ 1. Enter       │                │                │                │
     │    amount &    │                │                │                │
     │    select bank │                │                │                │
     │───────────────▶│                │                │                │
     │                │                │                │                │
     │                │ 2. Create      │                │                │
     │                │    OnRamp txn  │                │                │
     │                │    (Processing)│                │                │
     │                │───────────────▶│                │                │
     │                │                │                │                │
     │ 3. Redirect to │                │                │                │
     │    bank page   │                │                │                │
     │◀───────────────│                │                │                │
     │                │                │                │                │
     │ 4. Complete    │                │                │                │
     │    payment on  │                │                │                │
     │    bank site   │                │                │                │
     │───────────────────────────────────────────────▶│                │
     │                │                │                │                │
     │                │                │                │ 5. Bank sends  │
     │                │                │                │    webhook     │
     │                │                │                │───────────────▶│
     │                │                │                │                │
     │                │                │ 6. Update      │                │
     │                │                │    balance &   │                │
     │                │                │    txn status  │                │
     │                │                │◀───────────────────────────────│
     │                │                │                │                │
```

#### Server Action (`createOnrampTransaction.ts`)

```typescript
export async function createOnRampTransaction(provider: string, amount: number) {
    const session = await getServerSession(authOptions);
    const token = (Math.random() * 1000).toString();  // Ideally from bank
    
    await db.onRampTransaction.create({
        data: {
            provider,
            status: "Processing",           // Initial status
            startTime: new Date(),
            token: token,                   // For webhook reconciliation
            userId: Number(session?.user?.id),
            amount: amount * 100            // Store in smallest unit (paise)
        }
    });
}
```

### 2. Bank Webhook Integration

The webhook server receives payment confirmations from the bank.

```typescript
// apps/bank-webhook/src/index.ts
app.post("/hdfcWebhook", async (req, res) => {
    const { token, user_identifier, amount } = req.body;

    await db.$transaction([
        // 1. Update user balance
        db.balance.updateMany({
            where: { userId: Number(user_identifier) },
            data: { amount: { increment: Number(amount) } }
        }),
        // 2. Mark transaction as successful
        db.onRampTransaction.updateMany({
            where: { token },
            data: { status: "Success" }
        })
    ]);
});
```

#### Why Atomic Transactions?

```
Without Transaction:                With Transaction:
─────────────────────              ─────────────────────
1. Update Balance ✅                1. BEGIN TRANSACTION
2. Network Error ❌                 2. Update Balance
3. Status not updated              3. Update Status
   → Money added but               4. COMMIT (or ROLLBACK)
   → Txn shows "Processing"           → All or nothing
```

### 3. P2P Transfer

Peer-to-peer money transfer between users using phone numbers.

```typescript
// apps/user-app/app/lib/actions/p2pTransfer.tsx
export async function p2pTransfer(to: string, amount: number) {
    await db.$transaction(async (tx) => {
        // 1. Check sender has sufficient balance
        const fromBalance = await tx.balance.findUnique({
            where: { userId: Number(from) },
        });
        
        if (!fromBalance || fromBalance.amount < amount) {
            throw new Error("Insufficient funds");
        }

        // 2. Deduct from sender
        await tx.balance.update({
            where: { userId: Number(from) },
            data: { amount: { decrement: amount } },
        });

        // 3. Add to receiver (upsert handles new users)
        await tx.balance.upsert({
            where: { userId: toUser.id },
            update: { amount: { increment: amount } },
            create: { userId: toUser.id, amount, locked: 0 },
        });
    });
}
```

#### Transaction Safety

| Scenario | Handling |
|----------|----------|
| Insufficient balance | Transaction aborts, no money moved |
| Receiver doesn't have Balance row | `upsert` creates one |
| Network failure mid-transfer | Transaction rolls back |
| Concurrent transfers | Row-level locking prevents race conditions |

---

## 🔌 API Endpoints

### User App Routes (Next.js)

| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | Landing page with sign-in |
| `/api/auth/[...nextauth]` | * | NextAuth.js authentication |
| `/dashboard` | GET | User dashboard with balance |
| `/transfer` | GET | On-ramp money from bank |
| `/transactions` | GET | Transaction history |
| `/p2p` | GET | P2P transfer interface |

### Bank Webhook (Express)

| Route | Method | Payload | Description |
|-------|--------|---------|-------------|
| `/hdfcWebhook` | POST | `{ token, user_identifier, amount }` | HDFC bank payment confirmation |

---

## 🔐 Authentication Flow

Using **NextAuth.js** with Credentials Provider:

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│    Client    │     │   NextAuth.js   │     │   Database   │
└──────┬───────┘     └────────┬────────┘     └──────┬───────┘
       │                      │                     │
       │  Phone + Password    │                     │
       │─────────────────────▶│                     │
       │                      │                     │
       │                      │  Find user by phone │
       │                      │────────────────────▶│
       │                      │                     │
       │                      │◀────────────────────│
       │                      │                     │
       │                      │  bcrypt.compare()   │
       │                      │  password hash      │
       │                      │                     │
       │  JWT Session Token   │                     │
       │◀─────────────────────│                     │
       │                      │                     │
       │  Redirect: /dashboard│                     │
       │◀─────────────────────│                     │
```

### Auto-Registration

New users are automatically created on first login:

```typescript
// If user doesn't exist, create one
const user = await db.user.create({
    data: {
        number: credentials.phone,
        password: await bcrypt.hash(credentials.password, 10)
    }
});
```

---

## 🚀 Deployment

### AWS EC2 Deployment

**Live URL**: [http://13.60.53.72:3005/](http://13.60.53.72:3005/)

#### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS EC2 Instance                         │
│                     (13.60.53.72)                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Docker Container                    │  │
│  │  ┌─────────────────────┐  ┌─────────────────────────┐ │  │
│  │  │   User App (Next.js)│  │  PostgreSQL Database    │ │  │
│  │  │      Port 3005      │  │                         │ │  │
│  │  └─────────────────────┘  └─────────────────────────┘ │  │
│  │  ┌─────────────────────┐                              │  │
│  │  │  Bank Webhook       │                              │  │
│  │  │  (Express:3003)     │                              │  │
│  │  └─────────────────────┘                              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Dockerfile (`docker/Dockerfile.user`)

```dockerfile
FROM node:20.12.0-alpine3.19

WORKDIR /usr/src/app

# Copy workspace files
COPY package.json package-lock.json turbo.json tsconfig.json ./
COPY apps ./apps
COPY packages ./packages

# Install & build
RUN npm install
RUN npm run generate-prisma
RUN cd apps/user-app && npm run build

EXPOSE 3000

CMD ["npm", "run", "start-user-app"]
```

#### Deployment Steps

```bash
# 1. SSH into EC2
ssh -i "key.pem" ubuntu@13.60.53.72

# 2. Clone repository
git clone <repo-url>
cd paytm-project-starter-monorepo

# 3. Set environment variables
export DATABASE_URL="postgresql://..."
export JWT_SECRET="your-secret"
export NEXTAUTH_URL="http://13.60.53.72:3005"

# 4. Build and run with Docker
docker build -f docker/Dockerfile.user -t paytm-user .
docker run -p 3005:3000 --env-file .env paytm-user

# 5. Start webhook server
cd apps/bank-webhook
npm run build && npm run start
```

---

## ⚠️ Bottlenecks & Solutions

### Current Bottlenecks

| Bottleneck | Issue | Current Impact |
|------------|-------|----------------|
| **Single Database** | All reads/writes to one PostgreSQL | Limits throughput at scale |
| **No Rate Limiting** | Webhook endpoint exposed | Vulnerable to DDoS |
| **No Idempotency Key Validation** | Duplicate webhooks possible | Potential double-credit |
| **Token Generation** | `Math.random()` for tokens | Not cryptographically secure |
| **No Bank Secret Verification** | Webhook doesn't verify bank signature | Security risk |
| **Synchronous Processing** | Webhook blocks until DB update | Slow response to bank |

### Solutions Implemented

| Solution | Implementation |
|----------|----------------|
| **Atomic Transactions** | `db.$transaction()` ensures consistency |
| **Unique Token Constraint** | Prevents duplicate on-ramp transactions |
| **Upsert for Balance** | Handles edge case of missing balance row |
| **Password Hashing** | bcrypt with salt rounds = 10 |
| **Session-based Auth** | JWT tokens via NextAuth.js |

---

## 📈 Scalability Improvements

### Short-term Improvements

```typescript
// 1. Add rate limiting to webhook
import rateLimit from 'express-rate-limit';
app.use('/hdfcWebhook', rateLimit({
    windowMs: 60 * 1000,  // 1 minute
    max: 100              // 100 requests per minute
}));

// 2. Verify bank signature
app.post("/hdfcWebhook", (req, res) => {
    const signature = req.headers['x-hdfc-signature'];
    if (!verifyHDFCSignature(req.body, signature)) {
        return res.status(401).json({ message: "Invalid signature" });
    }
    // ... process webhook
});

// 3. Use crypto for token generation
import crypto from 'crypto';
const token = crypto.randomBytes(32).toString('hex');
```

### Long-term Architecture

```
                                    ┌─────────────────┐
                                    │  Load Balancer  │
                                    └────────┬────────┘
                                             │
              ┌──────────────────────────────┼──────────────────────────────┐
              │                              │                              │
              ▼                              ▼                              ▼
     ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
     │   User App #1   │          │   User App #2   │          │   User App #N   │
     │   (Next.js)     │          │   (Next.js)     │          │   (Next.js)     │
     └────────┬────────┘          └────────┬────────┘          └────────┬────────┘
              │                            │                            │
              └──────────────┬─────────────┴─────────────┬──────────────┘
                             │                           │
                             ▼                           ▼
              ┌─────────────────────────┐    ┌─────────────────────────┐
              │    Message Queue        │    │      Redis Cache        │
              │    (Kafka/RabbitMQ)     │    │    (Session/Balance)    │
              └───────────┬─────────────┘    └─────────────────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │   PostgreSQL Primary    │──── Replica #1
              │   (Write operations)    │──── Replica #2
              └─────────────────────────┘
```

### Recommended Improvements

| Category | Improvement | Benefit |
|----------|-------------|---------|
| **Database** | Read replicas | Scale read operations |
| **Caching** | Redis for sessions & balance | Reduce DB load |
| **Queue** | Kafka for webhooks | Async processing, retry logic |
| **Security** | Zod validation | Type-safe input validation |
| **Monitoring** | Prometheus + Grafana | Observability |
| **CI/CD** | GitHub Actions | Automated testing & deployment |
| **Container Orchestration** | Kubernetes | Auto-scaling, self-healing |

---

## 🏃 Running Locally

### Prerequisites

- Node.js >= 18
- PostgreSQL database
- npm 10.x

### Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd paytm-project-starter-monorepo

# 2. Install dependencies
npm install

# 3. Set up environment variables
# Create .env in packages/db/
DATABASE_URL="postgresql://user:pass@localhost:5432/paytm"

# Create .env in apps/user-app/
JWT_SECRET="your-super-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# 4. Generate Prisma client & run migrations
cd packages/db
npx prisma migrate dev
npx prisma generate
cd ../..

# 5. Start development servers
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps in development mode |
| `npm run build` | Build all apps for production |
| `npm run generate-prisma` | Generate Prisma client |
| `npm run start-user-app` | Start user app in production |

---

## 📚 Key Learnings

1. **Turborepo** enables efficient monorepo management with shared packages
2. **Webhook pattern** provides secure, asynchronous bank integration
3. **Database transactions** are critical for financial operations
4. **NextAuth.js** simplifies authentication with minimal boilerplate
5. **Docker** enables consistent deployment across environments
6. **Server Actions** in Next.js 14 reduce API boilerplate

---

## 👨‍💻 Author

Built as part of a full-stack development project demonstrating:
- Monorepo architecture
- Payment system design
- Webhook integrations
- Cloud deployment
- Database transaction handling

---

## 📄 License

This project is for educational purposes.
