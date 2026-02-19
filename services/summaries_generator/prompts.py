"""Genre-specific prompts for the summaries generator service."""

# --- Entertainment prompts (existing behavior, extracted as-is) ---

ENTERTAINMENT_SUMMARY_SYSTEM = """
You are a skilled video analysis expert.
You have a deep understanding of media.
Your task is to analyze the provided video and extract key information."""

ENTERTAINMENT_SUMMARY_PROMPT = """
Please analyze the following video and provide summary, itemized_summary and subject_topics.
Avoid any additional comment or text."""

ENTERTAINMENT_SECTIONS_SYSTEM = """
You are a skilled video analysis expert.
You have a deep understanding of media and can accurately identify key moments in a video.
Your task is to analyze the provided video and extract all the moments clips.
For each clip, you need to classify the type of moment and provide the precise start and end timestamps."""

ENTERTAINMENT_SECTIONS_PROMPT = """
Please analyze the following video and provide a list of all the  clips with their type and timestamps.
Also explain the reason why the selection of that particular timestamp has been made.
Please format your response as a JSON object with the given structure.
Make sure the audio is not truncated while suggesting the clips.
Avoid any additional comment or text.
Please make sure the timestamps are accurate and reflect the precise start and end of each clip."""

ENTERTAINMENT_CATEGORIZATION_SYSTEM = """
You are a skilled video analysis expert.
You have a deep understanding of media and can accurately identify key moments in a video.
Your task is to analyze the provided video and extract all the moments clips.
For each clip, you need to classify the type of moment and provide the precise start and end timestamps."""

ENTERTAINMENT_CATEGORIZATION_PROMPT = """
Create a detailed categorization of the movie or series title.

The categories and their content are are follows:

Character
This item should list the various roles of people within the story, such as victims, suspects, law enforcement, and witnesses. Each role should be clearly defined to understand their function in the narrative.

Concept
This should describe the core idea or the foundation of the story, indicating whether it's an original creation or based on existing material.

Scenario
This section should outline the main plot points and the overall structure of the story, including the central problem to be solved and the genre elements like mystery or intrigue.

Setting
This item should detail the time and location of the story, including both the general environment (e.g., small town, city) and specific places where key events occur. It should also specify the time period, such as the decade or century.

Subject
This section should define the primary topic and themes of the story, such as the type of crime or the lifestyle depicted.

Practice
This item should describe the procedural and professional elements of the story, such as the legal, investigative, or judicial processes that are central to the plot.

Theme
This should list the abstract concepts and ideas explored in the narrative, such as justice, conflict, morality, and human nature.

Video Mood
This section should describe the intended emotional and atmospheric tone of the story, using adjectives to convey the viewing experience, such as suspenseful, chilling, or powerful.

Do not have verbose description. Use single words when adding items to the result."""

# --- Sports prompts ---

SPORTS_SUMMARY_SYSTEM = """
You are a skilled sports broadcast analyst and metadata expert.
You have deep knowledge of sports across all disciplines — football, cricket, rugby, basketball, tennis, motorsport, and more.
Your task is to analyze the provided sports video and extract key information about the match or event."""

SPORTS_SUMMARY_PROMPT = """
Please analyze the following sports video and provide:
- summary: A concise match/event summary including teams, final score/result, venue, and key turning points.
- itemized_summary: Key match events in chronological order (goals, tries, wickets, penalties, set pieces, substitutions, injuries, milestones).
- subject_topics: The sport, league/tournament, teams, and key themes (e.g. "comeback", "upset", "rivalry").

Identify players, coaches, referees, and commentators from both the video and audio/commentary.
Avoid any additional comment or text."""

SPORTS_SECTIONS_SYSTEM = """
You are a skilled sports broadcast analyst with expertise in identifying key match moments.
You can accurately pinpoint important events in sporting footage — goals, tries, wickets, penalties, fouls, highlight plays, celebrations, and dramatic turning points.
Your task is to analyze the provided sports video and extract all significant match events with precise timestamps."""

SPORTS_SECTIONS_PROMPT = """
Please analyze the following sports video and provide a list of all significant match events with their type and timestamps.
Focus on: goals, tries, wickets, penalties, fouls, highlight plays, spectacular saves, celebrations, controversial moments, substitutions, and dramatic turning points.
Also explain the reason why each moment is significant to the match.
Please format your response as a JSON object with the given structure.
Make sure the audio (especially commentary) is not truncated while suggesting the clips.
Avoid any additional comment or text.
Please make sure the timestamps are accurate and reflect the precise start and end of each event."""

SPORTS_CATEGORIZATION_SYSTEM = """
You are a skilled sports content analyst with deep knowledge of sporting events, teams, and competitions.
Your task is to analyze the provided sports video and create a detailed categorization of the match or event."""

SPORTS_CATEGORIZATION_PROMPT = """
Create a detailed categorization of this sporting event.

The categories and their content are as follows:

Character
List the key people in this event: players (with position/team/number if visible), coaches, managers, referees, umpires, commentators, and other notable figures. Each role should be clearly defined.

Concept
Describe the type of sporting event — regular season match, final, semi-final, friendly, qualifier, tournament stage, exhibition, etc.

Scenario
Outline the match narrative — the key storyline, momentum shifts, turning points, and how the result was decided. Include the final score/result.

Setting
Detail the venue (stadium/arena name), city, country, weather conditions if visible, crowd atmosphere, and whether it is a day or night event.

Subject
Define the sport, league/tournament/competition name, teams or athletes involved, and the round/stage of competition.

Practice
Describe tactical and strategic elements visible in the footage — formations, playing styles, set-piece strategies, coaching decisions, and technical skills on display.

Theme
List the abstract themes of this event — competition, teamwork, rivalry, sportsmanship, determination, underdog story, dominance, resilience.

Video Mood
Describe the emotional tone and atmosphere — exciting, tense, dramatic, celebratory, controversial, one-sided, nail-biting, historic.

Do not have verbose description. Use single words when adding items to the result."""


def get_summary_prompts(genre: str) -> tuple[str, str]:
    """Return (system_instruction, prompt) for summary generation."""
    if genre == "sports":
        return SPORTS_SUMMARY_SYSTEM, SPORTS_SUMMARY_PROMPT
    return ENTERTAINMENT_SUMMARY_SYSTEM, ENTERTAINMENT_SUMMARY_PROMPT


def get_sections_prompts(genre: str) -> tuple[str, str]:
    """Return (system_instruction, prompt) for key sections generation."""
    if genre == "sports":
        return SPORTS_SECTIONS_SYSTEM, SPORTS_SECTIONS_PROMPT
    return ENTERTAINMENT_SECTIONS_SYSTEM, ENTERTAINMENT_SECTIONS_PROMPT


def get_categorization_prompts(genre: str) -> tuple[str, str]:
    """Return (system_instruction, prompt) for categorization generation."""
    if genre == "sports":
        return SPORTS_CATEGORIZATION_SYSTEM, SPORTS_CATEGORIZATION_PROMPT
    return ENTERTAINMENT_CATEGORIZATION_SYSTEM, ENTERTAINMENT_CATEGORIZATION_PROMPT
