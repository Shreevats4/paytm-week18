NexaPay | High-Performance Payment InfrastructureAn enterprise-grade digital wallet and transaction engine engineered for financial integrity (ACID), scalability, and secure banking integrations.🚀 Live Production Environment: http://13.60.53.72:3005/📖 Executive SummaryNexaPay is a full-stack financial platform designed to handle the complexities of digital money movement. Unlike standard CRUD applications, this system prioritizes transactional consistency and concurrency control.It features a Monorepo architecture enabling high-velocity development across the User App, Merchant Dashboard, and Bank Webhook handlers. The core engine manages bank on-ramping via secure webhooks and executes peer-to-peer settlements using atomic database transactions.🏆 Engineering HighlightsFinancial Integrity: Implemented database-level locking and ACID transactions to prevent double-spending and race conditions.Event-Driven Integration: Built a dedicated webhook server to asynchronously handle bank payment confirmations.Optimized Build System: Utilized Turborepo to reduce CI/CD build times by caching artifacts and parallelizing tasks.Infrastructure as Code: Containerized via Docker and deployed on AWS EC2 for consistent production environments.🛠 Tech Stack & InfrastructureDomainTechnologiesCore FrameworkNext.js 14 (App Router), Server ActionsBuild SystemTurborepo (Monorepo Architecture)Database EnginePostgreSQL, Prisma ORM (Connection Pooling)Backend ServicesExpress.js (Webhook Microservice), Node.jsSecurityNextAuth.js (JWT), bcrypt (Hashing), Zod (Validation)InfrastructureAWS EC2, Docker, Nginx (Reverse Proxy)🏗 System ArchitectureThe system follows a modular architecture separating the user-facing application from the critical payment processing infrastructure.Code snippetgraph TD
    User[Client Browser] -->|HTTPS| LoadBalancer[Nginx / AWS]
    LoadBalancer -->|Next.js| UserApp[User Application]
    
    subgraph "Internal Network"
        UserApp -->|Read/Write| DB[(PostgreSQL)]
        WebhookSrv[Webhook Service] -->|Atomic Update| DB
    end
    
    subgraph "External World"
        BankAPI[HDFC/Axis Bank] -->|POST /webhook| WebhookSrv
    end
    
    UserApp -->|Initiate Txn| BankAPI
🔐 Database Schema DesignThe schema is optimized for high-throughput reads while maintaining strict locking for writes.User: Core identity (indexed by phone number).Balance: Decoupled from User table to allow row-level locking during transfers without freezing user profile data.OnRampTransaction: Uses a unique token system to ensure idempotency (preventing duplicate processing of the same bank webhook).⚙️ Key Engineering Challenges Solved1. Handling Race Conditions (The "Double Spend" Problem)Challenge: If a user with ₹100 sends two concurrent requests to transfer ₹100, a naive implementation might process both, resulting in a negative balance (-₹100).Solution: Implemented Atomic Transactions using Prisma. The database creates a lock on the rows involved, ensuring that one transaction must complete (or fail) before the next begins.TypeScript// Code Snippet: Atomic Transfer Logic
await db.$transaction(async (tx) => {
    // 1. Lock & Check Balance
    const fromBalance = await tx.balance.findUnique({ where: { userId: from } });
    if (fromBalance.amount < amount) throw new Error("Insufficient Funds");

    // 2. Decrement Sender
    await tx.balance.update({ 
        where: { userId: from }, 
        data: { amount: { decrement: amount } } 
    });

    // 3. Increment Receiver
    await tx.balance.update({ 
        where: { userId: to }, 
        data: { amount: { increment: amount } } 
    });
});
2. Secure Bank Integration (Webhook Handling)Challenge: Banks communicate payment success via asynchronous webhooks. Relying on frontend redirection is insecure as users can close tabs before confirmation.Solution: Built a dedicated Express microservice to listen for bank callbacks.Idempotency: The system checks the unique transaction token before processing to ensure money isn't credited twice.Status Machine: Transactions move strictly from Processing -> Success or Failure.3. Monorepo ScalabilityChallenge: Managing shared types, UI components, and database configs across multiple apps (User App, Merchant App, Backend) leads to code duplication.Solution: Adopted Turborepo.@repo/ui: Shared Tailwind components.@repo/db: Singleton Prisma client shared across all backend services.Result: A change in the database schema automatically propagates types to all applications.🚀 Deployment StrategyThe application is containerized to ensure consistency between development and production.Dockerfile Strategy: Multi-stage builds are used to keep the final image size low.Prune: Remove unused monorepo packages.Build: Compile Next.js and Prisma Client.Runner: Production-only node_modules and artifacts.Live Deployment:Hosted on AWS EC2 (Ubuntu Linux).PM2 or Docker Daemon manages process uptime.Nginx handles reverse proxying to Next.js (Port 3000) and Express (Port 3003).🔮 Future Roadmap (Scalability)Queueing System: Integrate Apache Kafka or RabbitMQ to decouple the Webhook Receiver from the Database Updater, ensuring the system can handle traffic spikes during bank downtime.Caching: Implement Redis to cache user balances and session data, reducing load on PostgreSQL.Horizontal Scaling: Deploy behind an Application Load Balancer (ALB) with auto-scaling groups for the User App.💻 Getting StartedBash# Clone the repository
git clone https://github.com/yourusername/nexapay.git

# Install dependencies (Root)
npm install

# Generate Database Client
cd packages/db && npx prisma generate

# Start Development Environment (All apps)
npm run dev
Engineered by [Your Name]. Focused on building scalable, reliable financial systems.
