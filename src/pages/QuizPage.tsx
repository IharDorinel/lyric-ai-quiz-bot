import { useState } from "react";
import { QuizForm } from "@/components/QuizForm";
import { QuizResults } from "@/components/QuizResults";
import { Toaster } from "@/components/ui/sonner";
import { QuizService } from "@/services/quizService"; // Импортируем наш сервис
import { toast } from "sonner"; // Импортируем toast для уведомлений

// Define the structure of a single quiz question
interface Question {
  question_text: string;
  correct_answer: string;
}

export const QuizPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [quizData, setQuizData] = useState<{
    artist: string;
    song: string;
    lyrics: string;
    questions: Question[]; // Use the new interface here
  } | null>(null);

  const handleCreateQuiz = async (artist: string, song: string) => {
    setIsLoading(true);
    try {
      // Используем наш новый сервис
      const data = await QuizService.getLyricsAndQuiz(artist, song);
      
      setQuizData({
        artist,
        song,
        lyrics: data.lyrics,
        questions: data.quiz.questions, // Достаем вопросы из вложенного объекта
      });
    } catch (error) {
      // Ошибки уже логируются и показываются в toast внутри сервиса
      // Здесь можно ничего не делать, или добавить дополнительную логику
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setQuizData(null);
  };

  return (
    <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
      {!quizData ? (
        <QuizForm onSubmit={handleCreateQuiz} isLoading={isLoading} />
      ) : (
        <QuizResults
          artist={quizData.artist}
          song={quizData.song}
          lyrics={quizData.lyrics}
          questions={quizData.questions}
          onReset={handleReset}
        />
      )}
      <Toaster />
    </div>
  );
}; 