

# FocusAI — AI-Powered Student Productivity Platform

## Design System
- **Theme**: Blue gradient (indigo/blue tones), clean minimal design with glassmorphism accents
- **Dark mode** support via toggle
- **Typography**: Clean sans-serif, dashboard-style layout
- **Responsive**: Mobile-first, works on all devices

## Pages & Navigation
Sidebar navigation with icon + label, collapsible on mobile.

### 1. Home / Landing Page
- Hero section with tagline: "Your AI Study Partner"
- Feature highlights (AI Assistant, Tasks, Credits, Analytics)
- CTA to sign up / get started

### 2. Auth (Login / Signup)
- Email + password authentication via Supabase Auth
- User profiles table for storing credits, streak data, daily limits
- Redirect to dashboard after login

### 3. Dashboard (Main Hub)
- Welcome greeting with streak counter
- Stats cards: Total Credits, Remaining AI Uploads (daily limit), Tasks Completed Today
- Today's tasks preview (first 3-4)
- Recent AI chat activity
- Quick action buttons to go to AI Assistant or Tasks

### 4. AI Study Assistant
- ChatGPT-style chat interface with message history
- Text input + microphone button (Web Speech API for voice-to-text)
- AI responses via Lovable AI (Gemini model) with system prompt focused on student study assistance
- Supports: notes, explanations, solutions, summaries, exam prep
- "Download as PDF" button on AI responses
- Daily upload/question limit tracked per user
- Exam Mode toggle: switches AI prompt to focus on quick revision, formulas, practice questions
- Chat history persisted in Supabase

### 5. Tasks Dashboard
- 10 daily tasks auto-generated (study-focused tasks like "Study 30 minutes", "Solve 5 math problems")
- Random difficulty distribution (Easy: 5cr, Medium: 10cr, Difficult: 15cr)
- "Mark as Completed" button → credits auto-added
- Progress bar showing completed vs total
- Daily reset at midnight (tracked per user)
- Tasks stored in Supabase with completion status

### 6. Credits Dashboard
- Current credit balance
- Upgrade options:
  - +5 AI uploads → 50 credits (once per day)
  - +10 AI uploads → 100 credits (once per day)
- Transaction history (credits earned/spent)
- Visual credit usage breakdown

### 7. Analytics Page
- Tasks completed this week (bar chart)
- Credits earned over time (line chart)
- AI usage stats
- Study streak display with milestones (3, 7, 14, 30 days)
- Activity heatmap or calendar view

## Backend (Supabase + Lovable Cloud)

### Database Tables
- **profiles**: user_id, display_name, total_credits, daily_uploads_remaining, daily_uploads_base, streak_count, last_active_date
- **tasks**: id, user_id, title, description, difficulty, credits_reward, is_completed, generated_date
- **chat_messages**: id, user_id, role, content, created_at, conversation_id
- **credit_transactions**: id, user_id, amount, type (earned/spent), description, created_at
- **daily_upgrades**: id, user_id, upgrade_type, used_date (tracks once-per-day upgrade usage)
- **user_roles**: id, user_id, role (for security)

### Edge Functions
- **chat**: Proxies to Lovable AI Gateway with student-focused system prompt, handles streaming
- **generate-tasks**: Generates 10 random study tasks with difficulty distribution
- **reset-daily**: Resets daily uploads and generates new tasks

### RLS Policies
- Users can only read/write their own data across all tables

## Key Interactions
- Voice input → Web Speech API converts to text → sent to AI
- Task completion → credits added → toast notification
- Credit upgrade → deducts credits, increases daily limit → once-per-day enforcement
- Streak tracking → compare last_active_date with today, increment or reset

