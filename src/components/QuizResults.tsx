import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, RotateCcw, FileText, HelpCircle } from "lucide-react";
import { toast } from "sonner";

interface QuizResultsProps {
  artist: string;
  song: string;
  lyrics: string;
  questions: string[];
  onReset: () => void;
}

export const QuizResults = ({ artist, song, lyrics, questions, onReset }: QuizResultsProps) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const copyToClipboard = async (text: string, type: string, index?: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      if (index !== undefined) setCopiedIndex(index);
      toast.success("Скопировано в буфер обмена!");
      
      setTimeout(() => {
        setCopiedType(null);
        setCopiedIndex(null);
      }, 2000);
    } catch (error) {
      toast.error("Не удалось скопировать текст");
    }
  };

  const copyAllQuestions = () => {
    const allQuestions = questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n');
    copyToClipboard(allQuestions, 'all');
  };

  return (
    <div className="w-full max-w-4xl space-y-6">
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">
            Квиз готов! 🎵
          </CardTitle>
          <p className="text-muted-foreground">
            <span className="text-primary font-semibold">{artist}</span> - 
            <span className="text-accent font-semibold ml-1">{song}</span>
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 justify-center">
            <Button
              variant="accent"
              onClick={copyAllQuestions}
              className="flex-1 max-w-xs"
            >
              {copiedType === 'all' ? (
                <>
                  <Check className="h-4 w-4" />
                  Скопировано!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Скопировать все вопросы
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onReset}
              className="flex-1 max-w-xs"
            >
              <RotateCcw className="h-4 w-4" />
              Создать новый квиз
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="questions" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-card">
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Вопросы квиза
          </TabsTrigger>
          <TabsTrigger value="lyrics" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Текст песни
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-4">
          <div className="grid gap-4">
            {questions.map((question, index) => (
              <Card key={index} className="bg-gradient-card border-border/50 hover:shadow-accent-glow transition-smooth">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-primary font-bold text-lg">
                          Вопрос {index + 1}
                        </span>
                      </div>
                      <p className="text-foreground leading-relaxed">
                        {question}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(question, 'question', index)}
                      className="shrink-0"
                    >
                      {copiedType === 'question' && copiedIndex === index ? (
                        <Check className="h-4 w-4 text-accent" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="lyrics">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Текст песни</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(lyrics, 'lyrics')}
              >
                {copiedType === 'lyrics' ? (
                  <>
                    <Check className="h-4 w-4" />
                    Скопировано!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Скопировать
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-background/30 p-6 rounded-lg border border-border/30">
                <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed font-mono">
                  {lyrics}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};