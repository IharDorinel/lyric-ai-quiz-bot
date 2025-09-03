import { toast } from "sonner";

export class QuizService {
  private static API_BASE_URL = "http://127.0.0.1:8001"; // Указываем адрес нашего бэкенда

  // Получаем и текст, и квиз одним запросом
  static async getLyricsAndQuiz(artist: string, song: string): Promise<{ lyrics: string; quiz: any }> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/lyrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist, song })
      });
      
      if (!response.ok) {
        // Попробуем извлечь сообщение об ошибке из ответа бэкенда
        const errorData = await response.json().catch(() => ({ detail: 'Не удалось получить текст и квиз' }));
        toast.error(`Ошибка: ${errorData.detail || response.statusText}`);
        throw new Error(errorData.detail);
      }
      
      const data = await response.json();
      return data; // Возвращаем весь объект { lyrics, quiz }
    } catch (error) {
      console.error("Ошибка при получении данных:", error);
      // Перебрасываем ошибку, чтобы компонент мог ее обработать
      throw error;
    }
  }
}