"use client";

import { LoadingSVG } from "@/components/button/LoadingSVG";
import { Header } from "@/components/Header";
import { Tile } from "@/components/Tile";
import { AgentMultibandAudioVisualizer } from "@/components/visualization/AgentMultibandAudioVisualizer";
import { useMultibandTrackVolume } from "@/hooks/useTrackVolume";
import { useWindowResize } from "@/hooks/useWindowResize";
import {
  useConnectionState,
  useLocalParticipant,
  useTracks,
  useVoiceAssistant,
} from "@livekit/components-react";
import { AnimatePresence, motion } from "framer-motion";
import { ConnectionState, LocalParticipant, Track } from "livekit-client";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "./button/Button";
import { MicrophoneButton } from "./MicrophoneButton";
import { MenuSVG } from "./ui/icons";
import { SettingsSVG } from "./ui/icons";

export interface AssistantProps {
  title?: string;
  logo?: ReactNode;
  onConnect: (connect: boolean, opts?: { token: string; url: string }) => void;
}

export interface Voice {
  id: string;
  user_id: string | null;
  is_public: boolean;
  name: string;
  description: string;
  created_at: Date;
  embedding: number[];
}

export interface Settings {
  openaiApiKey: string;
  systemPrompt: string;
  aiModel: string;
}

const headerHeight = 56;
const mobileWindowWidth = 768;
const desktopBarWidth = 72;
const desktopMaxBarHeight = 280;
const desktopMinBarHeight = 60;
const mobileMaxBarHeight = 140;
const mobileMinBarHeight = 48;
const mobileBarWidth = 48;
const barCount = 5;
const defaultVolumes = Array.from({ length: barCount }, () => [0.0]);

export default function Assistant({ title, logo, onConnect }: AssistantProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [settings, setSettings] = useState<Settings>({
    openaiApiKey: "",
    systemPrompt: "You are a voice assistant created by LiveKit. Your interface with users will be voice. Pretend we're having a conversation, no special formatting or headings, just natural speech.",
    aiModel: "gpt-4o-mini"
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showVoices, setShowVoices] = useState(true);
  const { localParticipant } = useLocalParticipant();
  const [currentVoiceId, setCurrentVoiceId] = useState<string>("");
  const windowSize = useWindowResize();
  const {
    agent: agentParticipant,
    state: agentState,
    audioTrack: agentAudioTrack,
    agentAttributes,
  } = useVoiceAssistant();
  const [isMobile, setIsMobile] = useState(false);
  const isAgentConnected = agentParticipant !== undefined;

  const roomState = useConnectionState();
  const tracks = useTracks();

  useEffect(() => {
    setIsMobile(windowSize.width < mobileWindowWidth);
    setShowVoices(windowSize.width >= mobileWindowWidth);
  }, [windowSize]);

  useEffect(() => {
    if (roomState === ConnectionState.Connected) {
      localParticipant.setMicrophoneEnabled(true);
    }
  }, [localParticipant, roomState]);

  // use voices provided by the agent
  useEffect(() => {
    if (agentAttributes?.voices) {
      setVoices(JSON.parse(agentAttributes.voices));
    }
  }, [agentAttributes?.voices]);

  const handleSettingsClick = useCallback(() => {
    setShowSettings(!showSettings);
    if (windowSize.width < mobileWindowWidth) {
      setShowVoices(false);
    }
  }, [showSettings, windowSize.width]);

  const subscribedVolumes = useMultibandTrackVolume(
    agentAudioTrack?.publication.track,
    barCount
  );

  const localTracks = tracks.filter(
    ({ participant }) => participant instanceof LocalParticipant
  );
  const localMicTrack = localTracks.find(
    ({ source }) => source === Track.Source.Microphone
  );

  const localMultibandVolume = useMultibandTrackVolume(
    localMicTrack?.publication.track,
    9
  );

  const onSelectVoice = useCallback(
    (voiceId: string) => {
      setCurrentVoiceId(voiceId);
      localParticipant.setAttributes({
        voice: voiceId,
      });
    },
    [localParticipant, setCurrentVoiceId]
  );

  const onUpdateSettings = useCallback(
    (newSettings: Partial<Settings>) => {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      
      // Only send settings update if we're connected
      if (isAgentConnected) {
        localParticipant.setAttributes({
          settings: JSON.stringify(updatedSettings)
        });

        // Show feedback based on what was updated
        let feedbackMessage = "";
        if (newSettings.openaiApiKey) {
          feedbackMessage = "OpenAI API Key updated";
        } else if (newSettings.systemPrompt) {
          feedbackMessage = "System prompt updated";
        } else if (newSettings.aiModel) {
          feedbackMessage = `Switched to ${newSettings.aiModel}`;
        }

        if (feedbackMessage) {
          // You can add a toast notification here if you have one
          console.log(feedbackMessage);
        }
      }
    },
    [settings, localParticipant, isAgentConnected]
  );

  const audioTileContent = useMemo(() => {
    const conversationToolbar = (
      <div className="fixed z-50 md:absolute left-1/2 bottom-4 md:bottom-auto md:top-1/2 -translate-y-1/2 -translate-x-1/2">
        <motion.div
          className="flex gap-3"
          initial={{
            opacity: 0,
            y: 25,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            y: 25,
          }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
        >
          <Button
            state="destructive"
            className=""
            size="medium"
            onClick={() => {
              onConnect(roomState === ConnectionState.Disconnected);
            }}
          >
            Disconnect
          </Button>
          <MicrophoneButton localMultibandVolume={localMultibandVolume} />
          <Button
            state="secondary"
            size="medium"
            onClick={() => {
              setShowVoices(!showVoices);
              if (windowSize.width < mobileWindowWidth) {
                setShowSettings(false);
              }
            }}
          >
            <MenuSVG />
          </Button>
        </motion.div>
      </div>
    );
    const isLoading =
      roomState === ConnectionState.Connecting ||
      (!agentAudioTrack && roomState === ConnectionState.Connected);
    const startConversationButton = (
      <div className="fixed bottom-2 md:bottom-auto md:absolute left-1/2 md:top-1/2 -translate-y-1/2 -translate-x-1/2 w-11/12 md:w-auto text-center">
        <motion.div
          className="flex gap-3"
          initial={{
            opacity: 0,
            y: 50,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            y: 50,
          }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
        >
          <Button
            state="primary"
            size="large"
            className="relative w-full text-sm md:text-base"
            onClick={() => {
              onConnect(roomState === ConnectionState.Disconnected);
            }}
          >
            <div
              className={`w-full ${isLoading ? "opacity-0" : "opacity-100"}`}
            >
              Start a conversation
            </div>
            <div
              className={`absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 ${
                isLoading ? "opacity-100" : "opacity-0"
              }`}
            >
              <LoadingSVG diameter={24} strokeWidth={4} />
            </div>
          </Button>
        </motion.div>
      </div>
    );
    const visualizerContent = (
      <div className="flex flex-col items-center justify-space-between h-full w-full pb-12">
        <div className="h-full flex">
          <AgentMultibandAudioVisualizer
            state={agentState}
            barWidth={isMobile ? mobileBarWidth : desktopBarWidth}
            minBarHeight={isMobile ? mobileMinBarHeight : desktopMinBarHeight}
            maxBarHeight={isMobile ? mobileMaxBarHeight : desktopMaxBarHeight}
            frequencies={!agentAudioTrack ? defaultVolumes : subscribedVolumes}
            gap={16}
          />
        </div>
        <div className="min-h-20 w-full relative">
          <AnimatePresence>
            {!agentAudioTrack ? startConversationButton : null}
          </AnimatePresence>
          <AnimatePresence>
            {agentAudioTrack ? conversationToolbar : null}
          </AnimatePresence>
        </div>
      </div>
    );

    return visualizerContent;
  }, [
    localMultibandVolume,
    showVoices,
    roomState,
    agentAudioTrack,
    isMobile,
    subscribedVolumes,
    onConnect,
    agentState,
  ]);

  const voiceSelectionPanel = useMemo(() => {
    return (
      <div className="flex flex-col h-full w-full items-start">
        {isAgentConnected && voices && voices.length > 0 && (
          <div className="w-full text-foreground py-4 relative">
            <div className="sticky bg-background py-2 top-0 flex flex-row justify-between items-center px-4 text-xs uppercase tracking-wider">
              <h3 className="font-mono font-semibold text-sm">Voices</h3>
            </div>
            <div className="px-4 py-2 text-xs text-foreground leading-normal">
              <div className={"flex flex-col text-left h-full"}>
                {voices.map((voice) => (
                  <button
                    onClick={() => {
                      onSelectVoice(voice.id);
                    }}
                    className={`w-full text-left px-3 py-2 font-mono text-lg md:text-sm ${
                      voice.id === currentVoiceId
                        ? "bg-foreground text-background"
                        : "hover:bg-white/10"
                    }`}
                    key={voice.id}
                  >
                    {voice.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }, [isAgentConnected, voices, currentVoiceId, onSelectVoice]);

  const settingsPanel = useMemo(() => {
    return (
      <div className="flex flex-col h-full w-full items-start">
        {isAgentConnected && (
          <div className="w-full text-foreground py-4 relative">
            <div className="sticky bg-background py-2 top-0 flex flex-row justify-between items-center px-4 text-xs uppercase tracking-wider">
              <h3 className="font-mono font-semibold text-sm">Settings</h3>
            </div>
            <div className="px-4 py-2 text-xs text-foreground leading-normal">
              <div className="flex flex-col gap-4">
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-4 rounded-lg border border-purple-500/30">
                  <h4 className="font-semibold mb-2">🚀 More Features Coming Soon!</h4>
                  <p className="text-sm mb-2">This is just a preview of what's possible with Knotie AI.</p>
                  <a 
                    href="https://knotie-ai.pro" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-purple-400 hover:text-purple-300 underline"
                  >
                    Join us today at the best ever price! 🎯
                  </a>
                </div>
                <div>
                  <label className="block mb-1">OpenAI API Key</label>
                  <input
                    type="password"
                    value={settings.openaiApiKey}
                    onChange={(e) => onUpdateSettings({ openaiApiKey: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 rounded font-mono text-sm"
                    placeholder="Enter OpenAI API Key"
                  />
                  <p className="text-xs text-gray-400 mt-1">Changes take effect immediately</p>
                </div>
                <div>
                  <label className="block mb-1">System Prompt</label>
                  <textarea
                    value={settings.systemPrompt}
                    onChange={(e) => onUpdateSettings({ systemPrompt: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 rounded font-mono text-sm h-32"
                    placeholder="Enter system prompt"
                  />
                  <p className="text-xs text-gray-400 mt-1">Changes take effect immediately</p>
                </div>
                <div>
                  <label className="block mb-1">AI Model</label>
                  <select
                    value={settings.aiModel}
                    onChange={(e) => onUpdateSettings({ aiModel: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 rounded font-mono text-sm"
                  >
                    <option value="gpt-4o-mini">GPT-4o-mini</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Changes take effect immediately</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }, [isAgentConnected, settings, onUpdateSettings]);

  return (
    <>
      <Header
        title={title}
        logo={logo}
        height={headerHeight}
        onConnectClicked={() =>
          onConnect(roomState === ConnectionState.Disconnected)
        }
        onSettingsClicked={handleSettingsClick}
      />
      <div
        className={`flex grow w-full selection:bg-cyan-900`}
        style={{ height: `calc(100% - ${headerHeight}px)` }}
      >
        {/* Voice Selection Panel - Left Side */}
        <Tile
          padding={false}
          className={`h-full w-full basis-1/4 items-start overflow-y-auto hidden max-w-[480px] border-l border-white/20 ${
            showVoices ? "md:flex" : "md:hidden"
          }`}
          childrenClassName="h-full grow items-start"
        >
          {voiceSelectionPanel}
        </Tile>

        {/* Main Content - Center */}
        <div className="flex-col grow basis-1/2 gap-4 h-full md:flex">
          <Tile
            title="ASSISTANT"
            className="w-full h-full grow"
            childrenClassName="justify-center"
          >
            {audioTileContent}
          </Tile>
        </div>

        {/* Settings Panel - Right Side */}
        <Tile
          padding={false}
          className={`h-full w-full basis-1/4 items-start overflow-y-auto hidden max-w-[480px] border-l border-white/20 ${
            showSettings ? "md:flex" : "md:hidden"
          }`}
          childrenClassName="h-full grow items-start"
        >
          {settingsPanel}
        </Tile>

        {/* Mobile Panels */}
        <div
          className={`bg-white/80 backdrop-blur-lg absolute w-full items-start transition-all duration-100 md:hidden ${
            showVoices || showSettings ? "translate-x-0" : "translate-x-full"
          }`}
          style={{ height: `calc(100% - ${headerHeight}px)` }}
        >
          <div className="overflow-y-scroll h-full w-full">
            <div className="pb-32">{showVoices ? voiceSelectionPanel : settingsPanel}</div>
          </div>
          <div className="pointer-events-none absolute z-10 bottom-0 w-full h-64 bg-gradient-to-t from-white to-transparent"></div>
        </div>
      </div>
    </>
  );
}
