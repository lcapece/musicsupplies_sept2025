# Copilot Instructions for musicsupplies_rc10

## Big Picture Architecture
- This is a modern web application using React (see `src/`), Vite, and TypeScript.
- Backend/database operations and migrations are managed via Supabase (hosted only, see custom_instructions.md).
- Key business logic is split into React components (`src/components/`), context providers (`src/context/`), and utility modules (`src/utils/`).
- Data flows from Supabase to React via context and utility functions; modals and forms are used for user interactions.

## Developer Workflows
- **Build:** Use Vite (`vite.config.ts`). Build with `npm run build`.
- **Dev:** Start locally with `npm run dev`.
- **Deploy:** Use `deploy.bat` (Windows) or `deploy.sh` (Linux/macOS). Netlify config is in `netlify.toml`.
- **Database:** All migrations and fixes must use the hosted Supabase MCP (ID: ekklokrukxmqlahtonnce). Do not use local Supabase. See SQL files and `custom_instructions.md` for details.
- **Linting:** Uses ESLint (`eslint.config.js`).
- **Type Checking:** Uses TypeScript (`tsconfig*.json`).

## Project-Specific Conventions
- All Supabase operations must go through the hosted MCP. Never expect manual user intervention for Supabase tasks.
- SQL migration/fix scripts are in the root and `supabase/migrations/`.
- React modals for forms and notifications are in `src/components/` (e.g., `DiscountFormModal.tsx`, `NotificationModal.tsx`).
- Use context providers for global state (see `src/context/`).
- Utility functions are in `src/utils/`.
- Images and static assets are in `public/` and `src/images/`.

## Integration Points & External Dependencies
- Supabase (hosted, via MCP)
- Netlify (deployment)
- AWS S3 (see S3-related markdown docs and SQL scripts)
- ClickSend SMS, Mailgun (see respective setup docs)
- Nginx (see `nginx.conf`)

## Examples & Key Files
- `custom_instructions.md`: Supabase MCP usage rules
- `src/components/DiscountFormModal.tsx`: Modal pattern
- `supabase/migrations/`: Database migrations
- `deploy.bat`, `deploy.sh`: Deployment scripts
- `S3_CACHE_*` and `MAILGUN_INTEGRATION_SETUP.md`: External service integration

## Patterns
- Always use context for cross-component state.
- Modals are used for all user-facing forms and notifications.
- SQL scripts are used for all DB changes; never edit DB manually.
- All environment/config files are in root or `supabase/`.

---

If any workflow, convention, or integration is unclear, ask for clarification or check the relevant markdown documentation in the project root.
