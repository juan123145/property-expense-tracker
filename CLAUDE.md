# Claude Code Configuration

## Model Settings for This Project

**Primary Model:** Mistral 7B (Local via Ollama)

### How to Use

#### Option 1: Launch Claude Code with Mistral (Recommended for Local Work)
```bash
claude-code --model mistral:7b --dangerously-skip-permissions
```

#### Option 2: Use Default Claude Haiku (Remote via Merck)
```bash
claude-code --dangerously-skip-permissions
```

#### Option 3: Switch Models Mid-Session
In Claude Code, use the model selector to switch between:
- `mistral:7b` - Local (fast, offline)
- `claude-haiku-4-5-20251001` - Remote (powerful, works from anywhere)

---

## Why Mistral 7B?

✅ **Fast** - 20-30 tokens/sec locally  
✅ **Offline** - No internet required  
✅ **Free** - Open-source  
✅ **Good for coding** - Competitive code generation  
✅ **Runs on your Dell Latitude** - No dependency on Merck network  

---

## Requirements

Before using Claude Code with Mistral 7B, ensure:

1. **Ollama is running** with Mistral 7B pulled:
   ```bash
   ollama pull mistral:7b
   ollama run mistral:7b
   ```
   (Keep this terminal open)

2. **Claude Code is installed**:
   ```bash
   claude-code --version
   ```

3. **You're in your project directory**:
   ```bash
   cd C:\Users\M225735\property-expense-tracker
   ```

---

## Quick Start (Mistral 7B)

```bash
# Terminal 1: Start Ollama (keep running)
ollama run mistral:7b

# Terminal 2: Launch Claude Code with Mistral
cd C:\Users\M225735\property-expense-tracker
claude-code --model mistral:7b --dangerously-skip-permissions
```

---

## Project Context

This is a **Next.js 16 property expense tracker** application.

**Key Tech:**
- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Drizzle ORM + PostgreSQL
- TailwindCSS 4
- AWS S3 for file storage

**Pages:** /dashboard, /transactions, /properties, /reports, /settings, etc.

**Recent Work:** Server-side pagination on transactions page (May 28, 2026)

---

## Notes

- **Mistral 7B:** Best for on-device coding, no Merck VPN needed
- **Claude Haiku 4.5:** Best for complex reasoning, works from phone
- **Switching is easy:** Just add `--model mistral:7b` or omit to use default
- **No permanent change:** Claude Code reverts to default next session

---

## Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Database migration
npm run db:migrate

# Database URL (for local testing)
# Set DATABASE_URL in .env.local
```

---

**Last Updated:** May 28, 2026  
**By:** Hermes Agent + Mistral 7B
