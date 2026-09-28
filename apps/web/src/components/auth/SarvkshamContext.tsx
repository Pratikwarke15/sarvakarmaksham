"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";

export type SarvkshamPose =
  | "hero_clean"
  | "hero_greeting"
  | "pose_idle"
  | "pose_pointing"
  | "pose_celebrating"
  | "pose_guiding"
  | "pose_floating"
  | "pose_typing"
  | "exp_thinking"
  | "exp_confused"
  | "exp_excited"
  | "exp_happy";

export interface SarvkshamState {
  pose: SarvkshamPose;
  message: string;
  subtext: string | null;
  activeField: string | null;
  userName: string;
  isSpeaking: boolean;
}

interface SarvkshamContextType extends SarvkshamState {
  setPose: (pose: SarvkshamPose) => void;
  setMessage: (message: string, subtext?: string) => void;
  setActiveField: (field: string | null) => void;
  setUserName: (name: string) => void;
  celebrate: (message?: string) => void;
  speakCurrentMessage: () => void;
  resetToDefault: () => void;
}

const defaultState: SarvkshamState = {
  pose: "hero_greeting",
  message: "Namaste! I am Sarvksham, your AI Cooperative Assistant. How can I help you today?",
  subtext: "Secured by Sarvakarmakshamah Sovereign Cooperative Protocol",
  activeField: null,
  userName: "",
  isSpeaking: false,
};

const SarvkshamContext = createContext<SarvkshamContextType | null>(null);

export function SarvkshamProvider({ children }: { children: React.ReactNode }) {
  const [pose, setPose] = useState<SarvkshamPose>("hero_greeting");
  const [message, setMessageState] = useState<string>(defaultState.message);
  const [subtext, setSubtext] = useState<string | null>(defaultState.subtext);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const setMessage = useCallback((newMessage: string, newSubtext?: string) => {
    setMessageState(newMessage);
    if (newSubtext !== undefined) {
      setSubtext(newSubtext);
    }
  }, []);

  const celebrate = useCallback((customMessage?: string) => {
    setPose("pose_celebrating");
    if (customMessage) {
      setMessageState(customMessage);
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setPose("pose_idle");
    }, 4000);
  }, []);

  const resetToDefault = useCallback(() => {
    setPose("hero_greeting");
    setMessageState(defaultState.message);
    setSubtext(defaultState.subtext);
    setActiveField(null);
  }, []);

  const speakCurrentMessage = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  }, [message]);

  return (
    <SarvkshamContext.Provider
      value={{
        pose,
        message,
        subtext,
        activeField,
        userName,
        isSpeaking,
        setPose,
        setMessage,
        setActiveField,
        setUserName,
        celebrate,
        speakCurrentMessage,
        resetToDefault,
      }}
    >
      {children}
    </SarvkshamContext.Provider>
  );
}

export function useSarvksham() {
  const context = useContext(SarvkshamContext);
  if (!context) {
    // Return a safe fallback if used outside provider so components don't crash
    return {
      pose: "hero_greeting" as SarvkshamPose,
      message: "Namaste! Welcome to Sarvakarmakshamah.",
      subtext: null,
      activeField: null,
      userName: "",
      isSpeaking: false,
      setPose: () => {},
      setMessage: () => {},
      setActiveField: () => {},
      setUserName: () => {},
      celebrate: () => {},
      speakCurrentMessage: () => {},
      resetToDefault: () => {},
    };
  }
  return context;
}
