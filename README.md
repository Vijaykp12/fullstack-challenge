![Logo](./public/FFFFFF-1.png)
# Slooze take home challenge-fullstack!!

## Question:

Design and implement a full-stack, role-based food ordering web application where users (Admins, Managers, and Members) can perform specific functions—such as viewing restaurants, placing or canceling orders, and managing payment methods—based on their assigned role.

**Assume**: Mock restaurants & menu items onto your app

**Extension**: Implement a relational access model that restricts users to operate only within their assigned country (India or America).

### 🎯 Feature Breakdown & Role-Based Access
| **Feature**                      | **Admin** | **Manager** | **Member** |
|----------------------------------|----------|------------|------------|
| View restaurants & menu items   | ✅       | ✅         | ✅         |
| Create an order (add food items)| ✅       | ✅         | ✅         |
| Checkout & pay                  | ✅       | ✅         | ❌         |
| Cancel an order                 | ✅       | ✅         | ❌         |
| Add / Modify payment methods    | ✅       | ❌         | ❌         |


### Tech Stack:
- **Backend**: NestJS · GraphQL · Prisma
- **Frontend**: Next.js · TypeScript · Tailwind CSS · Apollo Client
- **Auth**: Role-based access control (RBAC) · Bonus: Re-BAC
---

## Reference:

Refer to the pdf attached in the repository for more details on the problem statement.

For detailed information on design decisions, SQLite database models, seeded datasets, and the copy-pasteable GraphQL API Query Collection, refer to our [ARCHITECTURE.md](./ARCHITECTURE.md).

## 📤 Submission
- Upload your code to GitHub or share as a CodeSandbox/StackBlitz link
- Include instructions to run the app locally (see below)
- (Optional) Deploy and share a live link using Vercel, Netlify, etc.

## 🚀 How to Run Locally

We have provided a unified runner script `run.py` at the root of the repository. Running it will automatically initialize the Python virtual environment, install backend dependencies, install frontend node modules, and launch both dev servers concurrently.

### Prerequisites
* Python 3.10+ installed
* Node.js & NPM installed

### Startup Command
From the root of the repository, execute:
```bash
python run.py
```

* **Frontend Web App**: http://localhost:3000
* **Backend GraphQL Playground**: http://localhost:8000/graphql

## Connect with Us:

Reach out to **[interview@slooze.xyz](mailto:interview@slooze.xyz)** to submit your solutions or if you may have any questions related to the challenege

## © Copyright Notice

**© Slooze. All Rights Reserved.**

Please do not share or distribute this material outside the intended evaluation process.  
For queries, contact us !!
