import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Voice command intent mapping.
 * Each intent has keywords (in Portuguese) and a target route.
 * The system matches spoken text against these keywords to determine navigation.
 */
interface VoiceIntent {
  keywords: string[];
  route: string;
  label: string;
}

const VOICE_INTENTS: VoiceIntent[] = [
  {
    keywords: [
      "editar usuário",
      "editar usuario",
      "gerenciar usuário",
      "gerenciar usuario",
      "gerenciar usuários",
      "gerenciar usuarios",
      "cadastrar usuário",
      "cadastrar usuario",
      "novo usuário",
      "novo usuario",
      "criar usuário",
      "criar usuario",
      "usuário",
      "usuario",
      "usuários",
      "usuarios",
      "manage users",
    ],
    route: "/manage-users",
    label: "Gerenciar Usuários",
  },
  {
    keywords: [
      "administração",
      "administracao",
      "configuração",
      "configuracao",
      "configurar",
      "admin",
      "configurar zendesk",
      "domínio",
      "dominio",
      "credenciais",
      "token",
      "settings",
    ],
    route: "/admin",
    label: "Administração",
  },
  {
    keywords: [
      "início",
      "inicio",
      "home",
      "dashboard",
      "painel",
      "tickets",
      "monitoramento",
      "voltar",
      "página principal",
      "pagina principal",
      "tela principal",
    ],
    route: "/",
    label: "Dashboard Principal",
  },
];

export type VoiceState = "idle" | "listening" | "processing" | "success" | "error" | "unsupported";

interface UseVoiceCommandReturn {
  state: VoiceState;
  transcript: string;
  matchedIntent: string | null;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
}

export function useVoiceCommand(
  onNavigate: (route: string) => void
): UseVoiceCommandReturn {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [matchedIntent, setMatchedIntent] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check browser support
  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // Match transcript against intents
  const matchIntent = useCallback(
    (text: string): VoiceIntent | null => {
      const normalized = text.toLowerCase().trim();

      // Try exact phrase match first (longer keywords first for specificity)
      const allIntents = VOICE_INTENTS.map((intent) => ({
        ...intent,
        sortedKeywords: [...intent.keywords].sort(
          (a, b) => b.length - a.length
        ),
      }));

      for (const intent of allIntents) {
        for (const keyword of intent.sortedKeywords) {
          if (normalized.includes(keyword.toLowerCase())) {
            return intent;
          }
        }
      }

      return null;
    },
    []
  );

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setState("unsupported");
      return;
    }

    cleanup();
    setTranscript("");
    setMatchedIntent(null);

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setState("listening");
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const currentText = finalTranscript || interimTranscript;
      setTranscript(currentText);

      if (finalTranscript) {
        setState("processing");

        const intent = matchIntent(finalTranscript);

        if (intent) {
          setMatchedIntent(intent.label);
          setState("success");

          // Navigate after a brief visual feedback delay
          timeoutRef.current = setTimeout(() => {
            onNavigate(intent.route);
            // Reset state after navigation
            timeoutRef.current = setTimeout(() => {
              setState("idle");
              setTranscript("");
              setMatchedIntent(null);
            }, 2000);
          }, 800);
        } else {
          setState("error");
          setMatchedIntent(null);

          // Reset after showing error
          timeoutRef.current = setTimeout(() => {
            setState("idle");
            setTranscript("");
          }, 3000);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("[Voice] Recognition error:", event.error);
      if (event.error === "no-speech") {
        setState("idle");
      } else {
        setState("error");
        timeoutRef.current = setTimeout(() => {
          setState("idle");
          setTranscript("");
        }, 3000);
      }
    };

    recognition.onend = () => {
      // Only reset to idle if we're still in listening state (not processing/success/error)
      setState((prev) => (prev === "listening" ? "idle" : prev));
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error("[Voice] Failed to start recognition:", err);
      setState("error");
    }
  }, [isSupported, cleanup, matchIntent, onNavigate]);

  const stopListening = useCallback(() => {
    cleanup();
    setState("idle");
    setTranscript("");
    setMatchedIntent(null);
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    state,
    transcript,
    matchedIntent,
    startListening,
    stopListening,
    isSupported,
  };
}
