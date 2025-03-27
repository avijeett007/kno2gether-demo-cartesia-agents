import asyncio
import json
import os
import requests
from typing import List, Any, Dict

from livekit import rtc
from livekit.agents import JobContext, WorkerOptions, cli, JobProcess
from livekit.agents.llm import (
    ChatContext,
    ChatMessage,
)
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.agents.log import logger
from livekit.plugins import deepgram, silero, cartesia, openai
from dotenv import load_dotenv

load_dotenv()


def prewarm(proc: JobProcess):
    # preload models when process starts to speed up first interaction
    proc.userdata["vad"] = silero.VAD.load()

    # fetch cartesia voices
    headers = {
        "X-API-Key": os.getenv("CARTESIA_API_KEY", ""),
        "Cartesia-Version": "2024-08-01",
        "Content-Type": "application/json",
    }
    response = requests.get("https://api.cartesia.ai/voices", headers=headers)
    if response.status_code == 200:
        proc.userdata["cartesia_voices"] = response.json()
    else:
        logger.warning(f"Failed to fetch Cartesia voices: {response.status_code}")


async def entrypoint(ctx: JobContext):
    # Initialize with default settings
    initial_settings = {
        "openaiApiKey": os.getenv("OPENAI_API_KEY", ""),
        "systemPrompt": "You are a voice assistant created by LiveKit. Your interface with users will be voice. Pretend we're having a conversation, no special formatting or headings, just natural speech.",
        "aiModel": "gpt-4o-mini"
    }
    
    initial_ctx = ChatContext(
        messages=[
            ChatMessage(
                role="system",
                content=initial_settings["systemPrompt"],
            )
        ]
    )
    cartesia_voices: List[dict[str, Any]] = ctx.proc.userdata["cartesia_voices"]

    tts = cartesia.TTS(
        model="sonic-2",
    )
    
    # Initialize LLM with default settings
    llm = openai.LLM(
        model=initial_settings["aiModel"],
        api_key=initial_settings["openaiApiKey"]
    )
    
    agent = VoicePipelineAgent(
        vad=ctx.proc.userdata["vad"],
        stt=deepgram.STT(),
        llm=llm,
        tts=tts,
        chat_ctx=initial_ctx,
    )

    is_user_speaking = False
    is_agent_speaking = False

    @ctx.room.on("participant_attributes_changed")
    def on_participant_attributes_changed(
        changed_attributes: dict[str, str], participant: rtc.Participant
    ):
        # check for attribute changes from the user itself
        if participant.kind != rtc.ParticipantKind.PARTICIPANT_KIND_STANDARD:
            return

        if "voice" in changed_attributes:
            voice_id = participant.attributes.get("voice")
            logger.info(
                f"participant {participant.identity} requested voice change: {voice_id}"
            )
            if not voice_id:
                return

            voice_data = next(
                (voice for voice in cartesia_voices if voice["id"] == voice_id), None
            )
            if not voice_data:
                logger.warning(f"Voice {voice_id} not found")
                return
            if "embedding" in voice_data:
                language = "en"
                if "language" in voice_data and voice_data["language"] != "en":
                    language = voice_data["language"]
                tts._opts.voice = voice_data["embedding"]
                tts._opts.language = language
                # allow user to confirm voice change as long as no one is speaking
                if not (is_agent_speaking or is_user_speaking):
                    asyncio.create_task(
                        agent.say("How do I sound now?", allow_interruptions=True)
                    )
        
        elif "settings" in changed_attributes:
            try:
                settings = json.loads(participant.attributes.get("settings", "{}"))
                logger.info(f"Received settings update: {settings}")
                
                # Update system prompt if changed
                if "systemPrompt" in settings and settings["systemPrompt"] != initial_settings["systemPrompt"]:
                    initial_settings["systemPrompt"] = settings["systemPrompt"]
                    agent.chat_ctx.messages[0].content = settings["systemPrompt"]
                    logger.info("Updated system prompt")
                
                # Update OpenAI API key if changed
                if "openaiApiKey" in settings and settings["openaiApiKey"] != initial_settings["openaiApiKey"]:
                    initial_settings["openaiApiKey"] = settings["openaiApiKey"]
                    agent.llm._opts.api_key = settings["openaiApiKey"]
                    logger.info("Updated OpenAI API key")
                
                # Update AI model if changed
                if "aiModel" in settings and settings["aiModel"] != initial_settings["aiModel"]:
                    initial_settings["aiModel"] = settings["aiModel"]
                    agent.llm._opts.model = settings["aiModel"]
                    logger.info(f"Updated AI model to {settings['aiModel']}")
                    
                    # Confirm model change to user
                    if not (is_agent_speaking or is_user_speaking):
                        asyncio.create_task(
                            agent.say(f"I've switched to {settings['aiModel']}. How can I help you?", allow_interruptions=True)
                        )
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse settings: {e}")
            except Exception as e:
                logger.error(f"Error updating settings: {e}")

    await ctx.connect()

    @agent.on("agent_started_speaking")
    def agent_started_speaking():
        nonlocal is_agent_speaking
        is_agent_speaking = True

    @agent.on("agent_stopped_speaking")
    def agent_stopped_speaking():
        nonlocal is_agent_speaking
        is_agent_speaking = False

    @agent.on("user_started_speaking")
    def user_started_speaking():
        nonlocal is_user_speaking
        is_user_speaking = True

    @agent.on("user_stopped_speaking")
    def user_stopped_speaking():
        nonlocal is_user_speaking
        is_user_speaking = False

    # set voice listing as attribute for UI
    voices = []
    for voice in cartesia_voices:
        voices.append(
            {
                "id": voice["id"],
                "name": voice["name"],
            }
        )
    voices.sort(key=lambda x: x["name"])
    await ctx.room.local_participant.set_attributes({"voices": json.dumps(voices)})

    agent.start(ctx.room)
    await agent.say("Hi there, how are you doing today?", allow_interruptions=True)


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))
