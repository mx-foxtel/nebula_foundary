"""Classifies video content genre using a quick Gemini call."""

import logging

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

CLASSIFICATION_PROMPT = """Classify this video into exactly one category based on its CONTENT FORMAT:

- "sports": Real/live sporting event footage (matches, games, races, tournaments, athletics competitions). This includes broadcast recordings of actual sporting events with real athletes competing.
- "entertainment": Scripted/produced content — movies, TV shows, series, music videos, talk shows, reality TV. A movie ABOUT a sport (e.g. Rocky, Lagaan, Rush, Dangal) is still "entertainment" because it is scripted.
- "documentary": Non-fiction long-form content — documentaries, docuseries, educational films, investigative journalism.
- "other": Anything that doesn't fit the above — tutorials, vlogs, presentations, user-generated content.

Respond with ONLY the category name."""

VALID_GENRES = {"sports", "entertainment", "documentary", "other"}


def classify_content(video_uri: str, source: str, project_id: str, llm_model: str) -> str:
    """Classify video content genre via a quick Gemini call.

    Args:
        video_uri: GCS URI or YouTube URL of the video.
        source: "GCS" or "youtube".
        project_id: GCP project ID.
        llm_model: Gemini model name to use.

    Returns:
        One of "sports", "entertainment", "documentary", "other".
        Defaults to "entertainment" on any error.
    """
    try:
        client = genai.Client(vertexai=True, project=project_id, location="global")

        mime_type = "video/youtube" if source == "youtube" else "video/*"
        video_part = types.Part.from_uri(file_uri=video_uri, mime_type=mime_type)
        text_part = types.Part.from_text(text=CLASSIFICATION_PROMPT)

        config = types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=10,
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        )

        response = client.models.generate_content(
            model=llm_model,
            contents=[types.Content(role="user", parts=[text_part, video_part])],
            config=config,
        )

        genre = response.text.strip().lower()
        if genre in VALID_GENRES:
            logger.info("Content classified as: %s", genre)
            return genre

        logger.warning("Unexpected classification result: '%s', defaulting to 'entertainment'", genre)
        return "entertainment"

    except Exception:
        logger.warning("Content classification failed, defaulting to 'entertainment'", exc_info=True)
        return "entertainment"
