# Knotie-AI Pro Voice Assistant

This is a customized fork of [Cartesia Voice Agent](https://github.com/livekit-examples/cartesia-voice-agent) showcasing the capabilities of [Knotie-AI Pro](https://knotie-ai.pro) - an advanced AI voice assistant platform.

## 🚀 Special Offer Alert!
Join our [waitlist](https://knotie-ai.pro) in the next 3-4 weeks to receive an exclusive coupon code for Knotie-AI Pro's launch! Early adopters get special pricing.

## Prerequisites

- Node.js
- Python 3.9-3.12
- LiveKit Cloud account (or OSS LiveKit server)
- Cartesia API key (for speech synthesis)
- OpenAI API key (for LLM)
- Deepgram API key (for speech-to-text)

## Setup Instructions

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Copy the environment file and configure:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

3. Install dependencies and run:
   ```bash
   npm install
   npm run dev
   ```

### Agent Setup

1. Navigate to the agent directory:
   ```bash
   cd agent
   ```

2. Set up Python environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Copy environment file and configure:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

5. Run the agent:
   ```bash
   python main.py dev
   ```

## Features
- Real-time voice conversations with AI
- Multiple voice options
- Customizable system prompts
- Easy integration with OpenAI models
- Live settings updates through UI

## Support
Need help? Contact us at support@kno2gether.com

## About Knotie-AI Pro
Knotie-AI Pro is revolutionizing voice AI interactions with advanced features, natural conversations, and seamless integration capabilities. Currently in public beta, we're offering early access with special benefits to waitlist members.

[Join our waitlist](https://knotie-ai.pro) today to:
- Get exclusive launch pricing
- Receive special coupon codes
- Access beta features first
- Shape the future of voice AI

## License
This demo is provided as-is under the MIT license. For commercial use, please visit [Knotie-AI Pro](https://knotie-ai.pro).
