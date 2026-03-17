# FocusAI - Your AI Study Partner

FocusAI is an intelligent study companion platform designed for students to enhance productivity, ace exams, and earn rewards while learning.

## Features

### 🧠 AI Study Assistant
- Voice and text-powered AI that generates comprehensive study notes
- Explain complex concepts in simple terms
- Solve problems step-by-step
- Upload photos of your notes and get instant analysis
- Support for PDF documents
- Exam Mode for quick revision and practice questions

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

## Technology Stack

- **Frontend**: React, TypeScript, Vite
- **UI Components**: shadcn/ui with Tailwind CSS
- **State Management**: React Query (@tanstack/react-query)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Authentication
- **OCR**: Tesseract.js for image text extraction
- **PDF Processing**: pdfjs-dist for document analysis
- **Animations**: Framer Motion

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
Create a `.env.local` file with your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

## Usage

### For Students
1. **Sign up** with your email
2. **Explore the Dashboard** to see your daily tasks and progress
3. **Use the AI Assistant** to ask questions or upload study materials
4. **Complete Daily Tasks** to earn credits
5. **Check Analytics** to track your learning progress

### AI Assistant Features
- **Text Input**: Ask any study-related question
- **Voice Input**: Use speech recognition (English language)
- **Photo Upload**: Capture and analyze textbook pages or handwritten notes
- **PDF Support**: Upload entire study documents for analysis
- **Exam Mode**: Toggle for quick revision-focused responses

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

## Support

For support, please open an issue on the GitHub repository or contact the development team.

## License

This project is open source and available under the MIT License.

## Developers

Created by a team of passionate developers dedicated to enhancing student productivity through AI.

---

**FocusAI** - Making studying smarter, one question at a time.
