import os
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import re
import json
from openai import AsyncOpenAI
import unicodedata
from urllib.parse import quote_plus
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

# Load environment variables from .env file
load_dotenv()

# --- Initialize OpenAI Client ---
# It's good practice to initialize it once and reuse it.
# The key is read automatically from the OPENAI_API_KEY environment variable.
aclient = AsyncOpenAI()

app = FastAPI()

# CORS Middleware Setup
origins = ["*"] # Разрешаем все источники для простоты локальной разработки
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Genius API and Scraping Logic ---

BASE_URL = "https://api.genius.com"

def search_song_url(artist_name, song_title):
    """
    Search for a song on Genius and return the URL to its lyrics page,
    ensuring the artist matches.
    """
    genius_api_token = os.getenv("GENIUS_API_TOKEN")
    if not genius_api_token:
        raise HTTPException(status_code=500, detail="Genius API token not configured")

    headers = {'Authorization': f'Bearer {genius_api_token}'}
    search_url = f"{BASE_URL}/search"
    params = {'q': f"{artist_name} {song_title}"}
    
    response = requests.get(search_url, params=params, headers=headers)
    response.raise_for_status()
    
    json_response = response.json()
    
    # --- Artist Name Normalization Helper ---
    def normalize_artist_name(name):
        # Replace common variations, remove punctuation, spaces, and text in parentheses
        name = name.lower()
        name = name.replace('э', 'е')
        # Remove anything in parentheses (e.g., "(Band'Eros)")
        name = re.sub(r'\(.*\)', '', name)
        # Remove punctuation and spaces
        name = re.sub(r'[^\w]', '', name)
        return name

    user_artist_normalized = normalize_artist_name(artist_name)

    # Iterate through the hits to find a match for the artist
    for hit in json_response.get('response', {}).get('hits', []):
        result = hit.get('result', {})
        api_artist_name = result.get('primary_artist', {}).get('name', '')
        
        api_artist_normalized = normalize_artist_name(api_artist_name)

        if user_artist_normalized == api_artist_normalized:
            song_path = result.get('path')
            if song_path:
                print(f"Found a matching song on Genius: '{result.get('full_title', 'Unknown Title')}'")
                return f"https://genius.com{song_path}"

    print(f"No song found on Genius with a matching artist for '{artist_name}'.")
    return None

def _get_selenium_driver():
    """Helper function to configure and return a Selenium WebDriver instance."""
    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    # Add arguments to make Selenium look more like a real user
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    # This script helps to hide the fact that we're using an automated browser
    driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
        'source': '''
            Object.defineProperty(navigator, 'webdriver', {
              get: () => undefined
            })
        '''
    })
    return driver

def scrape_lyrics_from_url(url):
    """Scrape the lyrics from a Genius song page using Selenium to bypass anti-scraping."""
    try:
        with _get_selenium_driver() as driver:
            driver.get(url)
            
            # Instead of a fixed sleep, we wait for a specific element that indicates the page is ready.
            # We look for the body tag, but with a generous timeout to allow Cloudflare to do its check.
            WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.TAG_NAME, "body")))

            # --- Wait for Lyrics and Scrape ---
            try:
                # This new selector is more robust against Genius's changing class names.
                # It looks for any div where the class name starts with "Lyrics__Container".
                lyrics_container_selector = "div[class^='Lyrics__Container']"
                WebDriverWait(driver, 15).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, lyrics_container_selector))
                )

                # If the wait succeeds, the elements are guaranteed to be there.
                lyrics_containers = driver.find_elements(By.CSS_SELECTOR, lyrics_container_selector)

                lyrics_parts = []
                for container in lyrics_containers:
                    # Replace <br> tags with newlines for proper formatting
                    inner_html = container.get_attribute('innerHTML')
                    text_with_newlines = inner_html.replace('<br>', '\n').replace('</br>', '\n')
                    soup = BeautifulSoup(text_with_newlines, 'lxml')
                    lyrics_parts.append(soup.get_text())

                lyrics = "\n".join(lyrics_parts)
                return lyrics.strip()

            except TimeoutException:
                print("Fatal: Lyrics container did not appear on the page within 15 seconds.")
                # Save a screenshot for debugging what the browser sees.
                driver.save_screenshot('debug_screenshot.png')
                print("A screenshot has been saved as 'debug_screenshot.png' in the 'backend' folder.")
                return "Lyrics not found on page."

    except Exception as e:
        print(f"An error occurred during Selenium scraping: {e}")
        # Use a more generic error detail to avoid leaking implementation details
        raise HTTPException(status_code=502, detail="Failed to fetch lyrics page from Genius.")

def scrape_lyrics_from_google_search(artist, song):
    """
    Fallback function to search for lyrics on Google if Genius fails.
    This is less reliable as it depends on Google's search results structure
    and the varying HTML of lyrics websites.
    """
    print(f"Searching for '{artist} - {song}' on Google...")
    search_term = f"{artist} {song} текст песни"
    search_url = f"https://www.google.com/search?q={quote_plus(search_term)}"

    try:
        with _get_selenium_driver() as driver:
            driver.get(search_url)

            # --- Handle Google Cookie Consent (if any) ---
            try:
                # Google uses buttons with specific roles or text
                cookie_button_xpath = "//button[div[contains(text(), 'Accept all') or contains(text(), 'Принять все')]]"
                cookie_button = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.XPATH, cookie_button_xpath))
                )
                cookie_button.click()
                print("Google cookie consent accepted.")
            except TimeoutException:
                print("Google cookie consent button not found, continuing...")

            # Find search result links, avoiding known non-lyrics sites
            # Google frequently changes its selectors, so we try a few common ones.
            # This selector targets the <a> tag within the most common modern result container.
            possible_link_selectors = [
                'div.yuRUbf a',    # More general than `> a`, should be more robust.
                'div.r a',         # An older, but sometimes still valid selector
                'div.g a'          # The original selector as a fallback
            ]
            search_results = []
            for selector in possible_link_selectors:
                search_results = driver.find_elements(By.CSS_SELECTOR, selector)
                if search_results:
                    print(f"Found search result links using selector: '{selector}'")
                    break
            
            # If no links were found after trying all selectors, save a screenshot for debugging.
            if not search_results:
                driver.save_screenshot('google_debug_screenshot.png')
                print("DEBUG: No search links found. Saved screenshot to 'google_debug_screenshot.png'")

            urls_to_try = []
            ignored_domains = ['youtube.com', 'wikipedia.org', 'genius.com', 'google.com']
            
            for result in search_results:
                href = result.get_attribute('href')
                if href and not any(domain in href for domain in ignored_domains):
                    urls_to_try.append(href)
            
            if not urls_to_try:
                print("No suitable links found in Google search results.")
                return None

            # Try to scrape the first few valid links
            for i, url in enumerate(urls_to_try[:3]): # Try the top 3 results
                try:
                    print(f"Attempting to scrape lyrics from: {url}")
                    driver.get(url)

                    # This is a very generic attempt to find lyrics.
                    # It looks for common class names on lyrics sites.
                    possible_selectors = [
                        "#maintxt",                     # Specific ID for textove.com
                        "p[itemprop='text']",           # For sites using schema.org markup
                        "div.wrap2",                    # Specific for rnb-music.ru
                        "div[class*='lyrics']",         # Stricter than *[class*='lyrics']
                        "div[class*='song-text']",      # e.g., <div class="song-text-wrapper">
                        "article[class*='entry-content']", # Common in blogs/WordPress
                        "div[data-lyrics-container='true']" # For Genius-like structures
                    ]
                    
                    lyrics_element = None
                    for selector in possible_selectors:
                        try:
                            element_candidate = driver.find_element(By.CSS_SELECTOR, selector)
                            # --- Improved Check ---
                            # Instead of just checking if the element exists, we do a quick check
                            # to see if it actually contains a reasonable amount of text.
                            # This avoids stopping on empty containers.
                            inner_html = element_candidate.get_attribute('innerHTML')
                            soup = BeautifulSoup(inner_html, 'lxml')
                            candidate_text = soup.get_text(strip=True)
                            
                            if len(candidate_text) > 100: # Must have at least 100 chars
                                lyrics_element = element_candidate
                                print(f"Found viable lyrics container with selector: '{selector}'")
                                break # Found a good one
                        except NoSuchElementException:
                            continue # Try next selector
                    
                    if lyrics_element:
                        # The element is already confirmed to be good, so we re-do the extraction
                        # properly with newlines to get the final formatted text.
                        inner_html = lyrics_element.get_attribute('innerHTML')
                        soup = BeautifulSoup(inner_html, 'lxml')
                        lyrics = soup.get_text(separator='\n', strip=True)

                        # --- Heuristic Check for "Junk" Text ---
                        # We check for a reasonable length, a minimum number of line breaks,
                        # and the absence of common non-lyric keywords.
                        num_lines = lyrics.count('\n')
                        junk_keywords = [
                            'cookie', 'copyright', 'регистрация', 'войти', 
                            'меню', 'навигация', 'согласие', 'политика'
                        ]
                        has_junk = any(keyword in lyrics.lower() for keyword in junk_keywords)

                        if len(lyrics) > 150 and num_lines > 5 and not has_junk:
                            print("Successfully scraped lyrics from Google search result.")
                            return lyrics.strip()
                        else:
                            print(f"Found container, but it failed heuristic checks (Lines: {num_lines}, Junk: {has_junk}). Trying next link.")
                
                except Exception as e:
                    print(f"Failed to scrape {url}: {e}")
                    continue

        print("Could not find lyrics in the top Google search results.")
        return None

    except Exception as e:
        print(f"An error occurred during Google search scraping: {e}")
        return None

# --- AI Question Generation ---

async def generate_quiz_questions(lyrics: str):
    """Generate quiz questions based on the song lyrics using OpenAI."""
    if not aclient.api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    prompt = (
        "You are an assistant for creating simple and fun music quizzes. "
        "Your task is to generate 5 quiz questions in Russian based on the provided song lyrics. "
        "The questions should be straightforward and suitable for a casual audience. Please include the following types of questions:\n"
        "- At least one question asking to continue a specific line from the song (e.g., 'Finish the line: ...').\n"
        "- If there are any proper nouns (names of people, places, characters), create a question about one of them.\n"
        "- The rest should be simple, factual questions about details in the lyrics.\n\n"
        "IMPORTANT: Avoid deep, philosophical, or open-ended questions about the song's meaning.\n\n"
        "Format the output as a JSON object with a single key 'questions', which is an array of objects. "
        "Each object must have 'question_text' and 'correct_answer'. Both fields must be in Russian.\n\n"
        "Here are the lyrics:\n\n"
        f"{lyrics}"
    )

    try:
        response = await aclient.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {"role": "system", "content": "You are a helpful assistant designed to output JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        # Assuming the response is a JSON string that needs to be parsed.
        # The API in JSON mode should return a valid JSON object in the content.
        quiz_data = response.choices[0].message.content
        return quiz_data
    except Exception as e:
        print(f"An error occurred while calling OpenAI: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate quiz questions.")


# --- API Endpoint ---

class SongRequest(BaseModel):
    artist: str
    song: str

class LyricsResponse(BaseModel):
    lyrics: str
    quiz: dict # We expect a dictionary from the parsed JSON

@app.post("/lyrics", response_model=LyricsResponse)
async def get_lyrics_endpoint(request: SongRequest):
    """API endpoint to get song lyrics and generate quiz questions."""
    lyrics = None
    try:
        # Step 1: Try to find the song on Genius
        song_url = search_song_url(request.artist, request.song)
        if song_url:
            lyrics_candidate = scrape_lyrics_from_url(song_url)
            # Check if scraping was successful
            if lyrics_candidate and "Lyrics not found" not in lyrics_candidate:
                lyrics = lyrics_candidate
        
        # Step 2: If Genius fails, fall back to Google Search
        if not lyrics:
            print("Song not found on Genius, falling back to Google search.")
            lyrics = scrape_lyrics_from_google_search(request.artist, request.song)

        # Step 3: If both sources fail, raise an error
        if not lyrics:
            raise HTTPException(status_code=404, detail="Song not found on Genius or via Google search.")
        
        # Clean the lyrics 
        lyrics = re.sub(r'(\[.*?\])', r'\n\1\n', lyrics)
        lyrics = re.sub(r' +', ' ', lyrics)
        lyrics = re.sub(r' ([А-ЯA-Z])', r'\n\1', lyrics)
        lyrics = re.sub(r' *\n *', '\n', lyrics)
        lyrics = re.sub(r'\n{3,}', '\n\n', lyrics)
        lyrics = lyrics.strip()

        # Generate quiz questions
        quiz_json = await generate_quiz_questions(lyrics)
        quiz_data = json.loads(quiz_json) # Parse the JSON string from OpenAI

        return {"lyrics": lyrics, "quiz": quiz_data}

    except HTTPException as e:
        # Re-raise HTTPException to be handled by FastAPI
        raise e
    except Exception as e:
        # Catch any other unexpected errors
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")


@app.get("/")
def read_root():
    return {"status": "Server is running"} 