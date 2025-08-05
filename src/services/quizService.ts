import { toast } from "sonner";

// Пример интеграции с API - в реальном проекте здесь будут настоящие API-вызовы
export class QuizService {
  
  // Симуляция поиска текста песни через API Genius
  static async getLyrics(artist: string, song: string): Promise<string> {
    // Имитация задержки API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // В реальном приложении здесь будет вызов к API Genius
    // return await this.callGeniusAPI(artist, song);
    
    // Для демонстрации возвращаем пример текста
    const exampleLyrics = `
[Куплет 1]
В темном лесу где-то далеко
Живет старый лесник одиноко
Знает он тайны всех деревьев
И слышит шепот древних корней

[Припев]
Лесник, лесник, хранитель леса
Ты знаешь все его секреты
Лесник, лесник, седой как время
Ты помнишь все былые лета

[Куплет 2]
Звери приходят к нему за советом
Птицы поют ему на рассвете
Он понимает язык природы
И чувствует смену погоды

[Припев]
Лесник, лесник, хранитель леса
Ты знаешь все его секреты
Лесник, лесник, седой как время
Ты помнишь все былые лета

[Финал]
Когда придет его последний час
Лес сохранит о нем рассказ
И будет петь ветер в кронах
О том, кто жил здесь испокон
    `.trim();

    return exampleLyrics;
  }

  // Генерация вопросов с помощью AI
  static async generateQuestions(lyrics: string, artist: string, song: string): Promise<string[]> {
    // Имитация задержки AI
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // В реальном приложении здесь будет вызов к AI API
    // return await this.callAIAPI(lyrics, artist, song);
    
    // Для демонстрации возвращаем пример вопросов
    const exampleQuestions = [
      "Где живет лесник согласно тексту песни?",
      "Какими знаниями обладает главный герой песни?",
      "Кто приходит к леснику за советом?",
      "В какое время дня птицы поют леснику?",
      "Что, согласно песне, произойдет после смерти лесника?",
      "Какое прилагательное используется для описания лесника в припеве?",
      "Что лесник понимает, согласно второму куплету?",
      "Что будет петь ветер в кронах деревьев?"
    ];

    return exampleQuestions;
  }

  // В реальном приложении эти методы будут содержать настоящие API-вызовы:
  
  /*
  private static async callGeniusAPI(artist: string, song: string): Promise<string> {
    const response = await fetch('/api/genius/lyrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artist, song })
    });
    
    if (!response.ok) {
      throw new Error('Не удалось найти текст песни');
    }
    
    const data = await response.json();
    return data.lyrics;
  }

  private static async callAIAPI(lyrics: string, artist: string, song: string): Promise<string[]> {
    const prompt = `
    Ты — ассистент для создания музыкальных квизов. 
    Вот текст песни "${song}" исполнителя "${artist}":
    
    ${lyrics}
    
    Создай 8 интересных вопросов по этому тексту. Вопросы должны:
    - Проверять знание содержания песни
    - Быть разной сложности (от простых до сложных)
    - Касаться сюжета, персонажей, деталей и метафор
    - Быть сформулированы четко и понятно
    
    Верни только список вопросов, по одному на строку.
    `;

    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error('Не удалось сгенерировать вопросы');
    }

    const data = await response.json();
    return data.questions;
  }
  */
}