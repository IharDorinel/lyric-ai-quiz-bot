import { useState } from "react";
import { QuizForm } from "@/components/QuizForm";
import { QuizResults } from "@/components/QuizResults";
import { QuizService } from "@/services/quizService";
import heroImage from "@/assets/hero-music.jpg";
import { toast } from "sonner";

interface QuizData {
  artist: string;
  song: string;
  lyrics: string;
  questions: string[];
}

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);

  const handleQuizSubmit = async (artist: string, song: string) => {
    setIsLoading(true);
    
    try {
      toast.info("Ищем текст песни...");
      const lyrics = await QuizService.getLyrics(artist, song);
      
      toast.info("Генерируем вопросы с помощью AI...");
      const questions = await QuizService.generateQuestions(lyrics, artist, song);
      
      setQuizData({
        artist,
        song,
        lyrics,
        questions
      });
      
      toast.success("Квиз успешно создан!");
    } catch (error) {
      console.error("Error creating quiz:", error);
      toast.error("Произошла ошибка при создании квиза. Попробуйте снова.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setQuizData(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Background Image */}
      <div 
        className="relative min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${heroImage})`
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background"></div>
        
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center space-y-8">
            
            {!quizData ? (
              <>
                {/* Hero Title */}
                <div className="text-center space-y-6 mb-8">
                  <h1 className="text-6xl md:text-7xl font-bold bg-gradient-hero bg-clip-text text-transparent animate-float">
                    Квиз-Мастер
                  </h1>
                  <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                    Создавайте увлекательные квизы по текстам любимых песен с помощью искусственного интеллекта
                  </p>
                </div>

                {/* Quiz Form */}
                <QuizForm onSubmit={handleQuizSubmit} isLoading={isLoading} />
              </>
            ) : (
              <QuizResults
                artist={quizData.artist}
                song={quizData.song}
                lyrics={quizData.lyrics}
                questions={quizData.questions}
                onReset={handleReset}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
