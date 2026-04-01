# FocusAI - Your AI Study Partner

FocusAI is an intelligent study companion platform designed for students to enhance productivity, ace exams, and earn rewards while learning.

## Features

### 🧠 AI Study Assistant
- Voice and text-powered AI that generates comprehensive study notes
- Explain complex concepts in simple terms
- Solve problems step-by-step
- Upload photos of your notes and get instant OCR-powered analysis
- Support for PDF document uploads and text extraction
- Exam Mode for quick revision and practice questions
- Conversation history with sidebar navigation
- Minimize chat toggle for distraction-free browsing
- Download AI responses as PDF

### ✅ Smart Tasks
- 10 daily study tasks to keep you productive
- Earn credits from completing tasks
- Stay engaged with gamified learning

### 🪙 Credit System
- Earn credits through daily tasks
- Unlock extra AI usage
- Access premium features
- Track your credit balance

### 📊 Study Analytics
- Monitor your study streaks
- Track productivity metrics
- View weekly progress reports
- Analyze your learning patterns

## Getting Started

### Prerequisites
- Node.js 16+ and npm/yarn/pnpm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Adithya-Binesh-007/focusai-study-suite.git
cd focusai-study-suite
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with your database credentials:
```
VITE_SUPABASE_URL=your_backend_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_backend_key
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

## Usage

### For Students
1. **Sign up** with your username and password
2. **Explore the Dashboard** to see your daily tasks and progress
3. **Use the AI Assistant** to ask questions or upload study materials
4. **Complete Daily Tasks** to earn credits
5. **Check Analytics** to track your learning progress

### AI Assistant Features
- **Text Input**: Ask any study-related question
- **Voice Input**: Use speech recognition (English language)
- **Photo Upload**: Capture and analyze textbook pages or handwritten notes with OCR
- **PDF Support**: Upload entire study documents for text extraction and analysis
- **Exam Mode**: Toggle for quick revision-focused responses
- **Chat History**: Switch between past conversations via sidebar
- **Minimize**: Collapse chat to focus on other tasks

## Technology Stack

- **Frontend**: React, TypeScript, Vite
- **UI Components**: shadcn/ui with Tailwind CSS
- **State Management**: React Query
- **Database**: PostgreSQL
- **OCR**: Tesseract.js for image text extraction
- **PDF Processing**: pdfjs-dist for document analysis
- **Animations**: Framer Motion

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── pages/          # Main page components
├── components/     # Reusable UI components
├── hooks/          # Custom React hooks
├── lib/            # Utilities and helpers
├── integrations/   # External service integrations
└── styles/         # Global styles
```

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## License

This project is open source and available under the MIT License.

## Developer

Developed by Adithya Binesh, part of HexnicAI.

---

**FocusAI** - Making studying smarter, one question at a time.
