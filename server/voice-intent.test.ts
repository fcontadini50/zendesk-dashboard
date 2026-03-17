import { describe, expect, it } from "vitest";

/**
 * Test the voice intent matching logic.
 * Since the actual hook uses browser APIs (SpeechRecognition),
 * we test the intent matching algorithm separately.
 */

interface VoiceIntent {
  keywords: string[];
  route: string;
  label: string;
}

const VOICE_INTENTS: VoiceIntent[] = [
  {
    keywords: [
      "editar usuário", "editar usuario", "gerenciar usuário", "gerenciar usuario",
      "gerenciar usuários", "gerenciar usuarios", "cadastrar usuário", "cadastrar usuario",
      "novo usuário", "novo usuario", "criar usuário", "criar usuario",
      "usuário", "usuario", "usuários", "usuarios", "manage users",
    ],
    route: "/manage-users",
    label: "Gerenciar Usuários",
  },
  {
    keywords: [
      "administração", "administracao", "configuração", "configuracao", "configurar",
      "admin", "configurar zendesk", "domínio", "dominio", "credenciais", "token", "settings",
    ],
    route: "/admin",
    label: "Administração",
  },
  {
    keywords: [
      "início", "inicio", "home", "dashboard", "painel", "tickets",
      "monitoramento", "voltar", "página principal", "pagina principal", "tela principal",
    ],
    route: "/",
    label: "Dashboard Principal",
  },
];

function matchIntent(text: string): VoiceIntent | null {
  const normalized = text.toLowerCase().trim();

  const allIntents = VOICE_INTENTS.map((intent) => ({
    ...intent,
    sortedKeywords: [...intent.keywords].sort((a, b) => b.length - a.length),
  }));

  for (const intent of allIntents) {
    for (const keyword of intent.sortedKeywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        return intent;
      }
    }
  }

  return null;
}

describe("Voice Intent Matching", () => {
  it("should match 'editar usuário' to manage-users route", () => {
    const result = matchIntent("editar usuário");
    expect(result).not.toBeNull();
    expect(result!.route).toBe("/manage-users");
    expect(result!.label).toBe("Gerenciar Usuários");
  });

  it("should match 'gerenciar usuarios' to manage-users route", () => {
    const result = matchIntent("gerenciar usuarios");
    expect(result).not.toBeNull();
    expect(result!.route).toBe("/manage-users");
  });

  it("should match 'novo usuario' to manage-users route", () => {
    const result = matchIntent("quero criar um novo usuario");
    expect(result).not.toBeNull();
    expect(result!.route).toBe("/manage-users");
  });

  it("should match 'administração' to admin route", () => {
    const result = matchIntent("ir para administração");
    expect(result).not.toBeNull();
    expect(result!.route).toBe("/admin");
    expect(result!.label).toBe("Administração");
  });

  it("should match 'configurar zendesk' to admin route", () => {
    const result = matchIntent("preciso configurar zendesk");
    expect(result).not.toBeNull();
    expect(result!.route).toBe("/admin");
  });

  it("should match 'token' to admin route", () => {
    const result = matchIntent("alterar o token");
    expect(result).not.toBeNull();
    expect(result!.route).toBe("/admin");
  });

  it("should match 'dashboard' to home route", () => {
    const result = matchIntent("voltar para o dashboard");
    expect(result).not.toBeNull();
    expect(result!.route).toBe("/");
    expect(result!.label).toBe("Dashboard Principal");
  });

  it("should match 'tickets' to home route", () => {
    const result = matchIntent("ver os tickets");
    expect(result).not.toBeNull();
    expect(result!.route).toBe("/");
  });

  it("should match 'página principal' to home route", () => {
    const result = matchIntent("ir para a página principal");
    expect(result).not.toBeNull();
    expect(result!.route).toBe("/");
  });

  it("should return null for unrecognized commands", () => {
    const result = matchIntent("qual é a previsão do tempo");
    expect(result).toBeNull();
  });

  it("should be case insensitive", () => {
    const result = matchIntent("EDITAR USUÁRIO");
    expect(result).not.toBeNull();
    expect(result!.route).toBe("/manage-users");
  });

  it("should match partial phrases within longer sentences", () => {
    const result = matchIntent("eu gostaria de editar usuario por favor");
    expect(result).not.toBeNull();
    expect(result!.route).toBe("/manage-users");
  });

  it("should match 'credenciais' to admin route", () => {
    const result = matchIntent("preciso ver as credenciais");
    expect(result).not.toBeNull();
    expect(result!.route).toBe("/admin");
  });

  it("should match 'voltar' to home route", () => {
    const result = matchIntent("voltar");
    expect(result).not.toBeNull();
    expect(result!.route).toBe("/");
  });
});
