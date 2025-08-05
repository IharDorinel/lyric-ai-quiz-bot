import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface QuizFormProps {
  onSubmit: (artist: string, song: string) => Promise<void>;
  isLoading: boolean;
}

export const QuizForm = ({ onSubmit, isLoading }: QuizFormProps) => {
  const [artist, setArtist] = useState("");
  const [song, setSong] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!artist.trim() || !song.trim()) {
      toast.error("Пожалуйста, введите имя артиста и название песни");
      return;
    }

    await onSubmit(artist.trim(), song.trim());
  };

  return (
    <Card className="w-full max-w-2xl bg-gradient-card border-border/50 shadow-card">
      <CardHeader className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-gradient-primary animate-pulse-glow">
            <Music className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <CardTitle className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
          Квиз-Мастер по Песням
        </CardTitle>
        <p className="text-muted-foreground text-lg">
          Введите артиста и название песни, и мы создадим квиз по её тексту
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Имя артиста
            </label>
            <Input
              type="text"
              placeholder="Например: Король и Шут"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="bg-background/50 border-border/50 focus:border-primary transition-smooth"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Название песни
            </label>
            <Input
              type="text"
              placeholder="Например: Лесник"
              value={song}
              onChange={(e) => setSong(e.target.value)}
              className="bg-background/50 border-border/50 focus:border-primary transition-smooth"
              disabled={isLoading}
            />
          </div>
          <Button
            type="submit"
            variant="hero"
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Создаём квиз...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                Создать квиз
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};