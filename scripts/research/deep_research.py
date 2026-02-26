import time
import sys
import os
from dotenv import load_dotenv
from google import genai

# Load environment variables from .env
load_dotenv()

# Co-CEO Note: GEMINI_API_KEY loaded from .env
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

topic = sys.argv[1] if len(sys.argv) > 1 else "Rise of the Flavian Dynasty"

print(f"🚀 Co-CEO: Initiating Deep Research on: {topic}...")

# This calls the specialized Deep Research agent
interaction = client.interactions.create(
    input=topic,
    agent='deep-research-pro-preview-12-2025',
    background=True
)

interaction_id = interaction.id
print(f"📡 Research ID: {interaction_id}. This will take a few minutes...")

while True:
    status_update = client.interactions.get(interaction_id)
    if status_update.status == 'completed':
        # Grab the final report text
        report = status_update.outputs[-1].text
        with open("deep_research_report.md", "w") as f:
            f.write(report)
        print("\n✅ Research Complete! Results saved to deep_research_report.md")
        break
    elif status_update.status == 'failed':
        print(f"\n❌ Research failed: {status_update.error}")
        break
    else:
        print(".", end="", flush=True)
        time.sleep(10)
