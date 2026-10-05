# Factorial n8n community node

Factorial brings HR, payroll, time tracking, talent, and finance processes into one platform.

Generated from OpenAPI 2026-01-01 with template 1.1.0. Generated files are platform-managed and will be overwritten during regeneration.

## Authentication

Configure the generated OAuth 2.0 credential in n8n before using the node.

## Supported operations

- `POST /ats/applications/apply` - Apply for a position
  - Retry Contract: none
  - Pagination Contract: none
- `POST /ats/applications` - Create application
  - Retry Contract: none
  - Pagination Contract: none
- `POST /ats/job-postings` - Create job posting
  - Retry Contract: none
  - Pagination Contract: none
- `POST /ats/job-postings/duplicate` - Duplicate job posting
  - Retry Contract: none
  - Pagination Contract: none
- `GET /ats/applications` - List applications
  - Retry Contract: none
  - Pagination Contract: none
- `GET /ats/candidates` - List candidates
  - Retry Contract: none
  - Pagination Contract: none
- `GET /ats/job-postings` - List job postings
  - Retry Contract: none
  - Pagination Contract: none
- `POST /attendance/shifts/clock-in` - Clock in
  - Retry Contract: none
  - Pagination Contract: none
- `POST /attendance/shifts/clock-out` - Clock out
  - Retry Contract: none
  - Pagination Contract: none
- `POST /attendance/shifts` - Create shift
  - Retry Contract: none
  - Pagination Contract: none
- `GET /attendance/shifts` - List shifts
  - Retry Contract: none
  - Pagination Contract: none
- `POST /employees/employees` - Create employee
  - Retry Contract: none
  - Pagination Contract: none
- `DELETE /employees/employees/{id}` - Delete employee
  - Retry Contract: none
  - Pagination Contract: none
- `GET /employees/employees/{id}` - Get employee
  - Retry Contract: none
  - Pagination Contract: none
- `GET /employees/employees` - List employees
  - Retry Contract: none
  - Pagination Contract: none
- `PUT /employees/employees/{id}` - Update employee
  - Retry Contract: none
  - Pagination Contract: none
- `POST /finance/accounts` - Create finance account
  - Retry Contract: none
  - Pagination Contract: none
- `GET /finance/accounts` - List finance accounts
  - Retry Contract: none
  - Pagination Contract: none
- `GET /api_public/credentials` - List API credentials
  - Retry Contract: none
  - Pagination Contract: none
- `POST /tasks/tasks` - Create task
  - Retry Contract: none
  - Pagination Contract: none
- `GET /tasks/tasks` - List tasks
  - Retry Contract: none
  - Pagination Contract: none
- `POST /timeoff/leaves` - Create leave request
  - Retry Contract: none
  - Pagination Contract: none
- `GET /timeoff/leaves` - List leaves
  - Retry Contract: none
  - Pagination Contract: none
- `POST /api_public/webhook-subscriptions` - Create webhook subscription
  - Retry Contract: none
  - Pagination Contract: none
- `GET /api_public/webhook-subscriptions` - List webhook subscriptions
  - Retry Contract: none
  - Pagination Contract: none

## Usage

1. Install this community-node package in n8n.
2. Add the **Factorial** node to a workflow.
3. Select a resource and operation, configure its parameters, and execute the workflow.

## Example workflow

Connect **Manual Trigger** -> **Factorial** -> a destination node, select an operation, then run the workflow and inspect the returned items.

## Development

```sh
npm install
npm run build
npm run lint
npm run dev
```

`npm run dev` starts a local n8n development instance. Find the integration by its **Factorial** display name.
