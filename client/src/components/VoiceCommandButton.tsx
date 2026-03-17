import { useCallback } from "react";
import { useLocation } from "wouter";
import { Mic, MicOff, Loader2, CheckCircle2, XCircle, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useVoiceCommand, VoiceState } from "@/hooks/useVoiceCommand";

/**
 * VoiceCommandButton - A microphone button that listens for voice commands
 * and navigates to the appropriate page based on spoken intent.
 *
 * States:
 * - idle: Ready to listen (mic icon)
 * - listening: Actively recording (pulsing red mic)
 * - processing: Analyzing speech (spinner)
 * - success: Intent matched, navigating (green check)
 * - error: No intent matched (red X)
 * - unsupported: Browser doesn't support Speech API
 */
export default function VoiceCommandButton() {
  const [, setLocation] = useLocation();

  const handleNavigate = useCallback(
    (route: string) => {
      setLocation(route);
    },
    [setLocation]
  );

  const { state, transcript, matchedIntent, startListening, stopListening, isSupported } =
    useVoiceCommand(handleNavigate);

  if (!isSupported) {
    return null; // Don't render if browser doesn't support speech recognition
  }

  const handleClick = () => {
    if (state === "listening") {
      stopListening();
    } else if (state === "idle") {
      startListening();
    }
  };

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleClick}
            disabled={state === "processing" || state === "success"}
            className={`relative rounded-full w-10 h-10 p-0 flex items-center justify-center transition-all duration-300 ${getButtonStyle(state)}`}
          >
            {getIcon(state)}

            {/* Pulsing ring when listening */}
            {state === "listening" && (
              <>
                <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-30" />
                <span className="absolute inset-[-4px] rounded-full border-2 border-red-400 animate-pulse opacity-60" />
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {getTooltipText(state, transcript, matchedIntent)}
        </TooltipContent>
      </Tooltip>

      {/* Floating transcript bubble */}
      {(state === "listening" || state === "processing" || state === "success" || state === "error") && (
        <div
          className={`absolute top-12 right-0 z-50 min-w-[240px] max-w-[320px] rounded-xl shadow-xl border p-3 transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${getTranscriptStyle(state)}`}
        >
          {/* State indicator */}
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`w-2 h-2 rounded-full ${getIndicatorColor(state)}`} />
            <span className="text-xs font-semibold uppercase tracking-wide opacity-70">
              {getStateLabel(state)}
            </span>
          </div>

          {/* Transcript text */}
          {transcript && (
            <p className="text-sm font-medium leading-snug">
              "{transcript}"
            </p>
          )}

          {/* Matched intent */}
          {state === "success" && matchedIntent && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700 font-medium">
              <CheckCircle2 size={14} />
              <span>Navegando para: {matchedIntent}</span>
            </div>
          )}

          {/* Error message */}
          {state === "error" && (
            <div className="mt-2 text-xs text-red-700">
              <p className="font-medium">Comando não reconhecido.</p>
              <p className="mt-1 opacity-70">
                Tente: "editar usuário", "administração", "dashboard"
              </p>
            </div>
          )}

          {/* Listening hint */}
          {state === "listening" && !transcript && (
            <p className="text-xs opacity-60 italic">
              Diga um comando... Ex: "editar usuário"
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function getButtonStyle(state: VoiceState): string {
  switch (state) {
    case "listening":
      return "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30";
    case "processing":
      return "bg-blue-500 text-white";
    case "success":
      return "bg-green-500 text-white";
    case "error":
      return "bg-red-100 text-red-600 hover:bg-red-200";
    default:
      return "bg-violet-600 hover:bg-violet-700 text-white shadow-md";
  }
}

function getIcon(state: VoiceState) {
  switch (state) {
    case "listening":
      return <Volume2 size={18} className="animate-pulse" />;
    case "processing":
      return <Loader2 size={18} className="animate-spin" />;
    case "success":
      return <CheckCircle2 size={18} />;
    case "error":
      return <XCircle size={18} />;
    default:
      return <Mic size={18} />;
  }
}

function getTooltipText(
  state: VoiceState,
  transcript: string,
  matchedIntent: string | null
): string {
  switch (state) {
    case "listening":
      return "Escutando... Clique para parar";
    case "processing":
      return "Processando comando de voz...";
    case "success":
      return `Navegando para: ${matchedIntent}`;
    case "error":
      return `Comando não reconhecido: "${transcript}"`;
    default:
      return "Comando de voz — Clique para falar";
  }
}

function getTranscriptStyle(state: VoiceState): string {
  switch (state) {
    case "listening":
      return "bg-white border-red-200 text-foreground";
    case "processing":
      return "bg-blue-50 border-blue-200 text-blue-900";
    case "success":
      return "bg-green-50 border-green-200 text-green-900";
    case "error":
      return "bg-red-50 border-red-200 text-red-900";
    default:
      return "bg-white border-border text-foreground";
  }
}

function getIndicatorColor(state: VoiceState): string {
  switch (state) {
    case "listening":
      return "bg-red-500 animate-pulse";
    case "processing":
      return "bg-blue-500 animate-pulse";
    case "success":
      return "bg-green-500";
    case "error":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
}

function getStateLabel(state: VoiceState): string {
  switch (state) {
    case "listening":
      return "Escutando";
    case "processing":
      return "Processando";
    case "success":
      return "Reconhecido";
    case "error":
      return "Não reconhecido";
    default:
      return "";
  }
}
