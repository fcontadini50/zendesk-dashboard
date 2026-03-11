import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Shield,
  Save,
  TestTube,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  Lock,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

const MOVIGOO_LOGO =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029189119/mBpT5TPBMiBQnBVLpBVGEL/movigoo-logo_9ce3c215.png";

export default function Admin() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [domain, setDomain] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [label, setLabel] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // tRPC queries and mutations
  const activeConfig = trpc.admin.getActiveConfig.useQuery(undefined, {
    retry: false,
    enabled: !!user && user.role === "admin",
  });

  const configHistory = trpc.admin.getConfigHistory.useQuery(undefined, {
    retry: false,
    enabled: !!user && user.role === "admin",
  });

  const saveMutation = trpc.admin.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração salva com sucesso!");
      setDomain("");
      setUserEmail("");
      setApiToken("");
      setLabel("");
      activeConfig.refetch();
      configHistory.refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const testMutation = trpc.admin.testConnection.useMutation({
    onSuccess: (data) => {
      setTestResult(data);
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      setTestResult({ success: false, message: error.message });
      toast.error(`Erro no teste: ${error.message}`);
    },
  });

  const deleteMutation = trpc.admin.deleteConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração removida!");
      activeConfig.refetch();
      configHistory.refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  // Prevent copy/paste on sensitive fields
  const preventCopy = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast.info("Cópia de dados sensíveis não é permitida por segurança.");
  };

  const preventContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      if (!user) {
        window.location.href = getLoginUrl();
      } else {
        setLocation("/");
        toast.error("Acesso restrito a administradores.");
      }
    }
  }, [user, authLoading, setLocation]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  const handleSave = () => {
    if (!domain || !userEmail || !apiToken) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    saveMutation.mutate({ domain, userEmail, apiToken, label });
  };

  const handleTest = () => {
    if (!domain || !userEmail || !apiToken) {
      toast.error("Preencha todos os campos para testar a conexão.");
      return;
    }
    setTestResult(null);
    testMutation.mutate({ domain, userEmail, apiToken });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => setLocation("/")}
                className="flex items-center gap-2"
              >
                <ArrowLeft size={18} />
                Voltar
              </Button>
              <img src={MOVIGOO_LOGO} alt="Movigoo" className="h-8 w-auto" />
              <div>
                <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Shield size={20} className="text-primary" />
                  Administração
                </h1>
                <p className="text-xs text-muted-foreground">
                  Configuração de credenciais Zendesk
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Acesso restrito
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Current Config Status */}
        {activeConfig.data?.configured && (
          <Card className="mb-6 p-5 border-green-200 bg-green-50">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-900">
                  Configuração Ativa
                </h3>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-green-700 font-medium">Domínio: </span>
                    <span className="text-green-900">
                      {activeConfig.data.config?.domain}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">Usuário: </span>
                    <span className="text-green-900">
                      {activeConfig.data.config?.userEmail}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">Token: </span>
                    <span className="text-green-900">
                      {activeConfig.data.config?.apiToken}
                    </span>
                  </div>
                  {activeConfig.data.config?.label && (
                    <div>
                      <span className="text-green-700 font-medium">Label: </span>
                      <span className="text-green-900">
                        {activeConfig.data.config.label}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Configuration Form */}
        <Card className="p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-1">
            {activeConfig.data?.configured
              ? "Atualizar Configuração"
              : "Nova Configuração Zendesk"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            As credenciais são criptografadas antes de serem armazenadas no banco
            de dados. Campos protegidos contra cópia por segurança.
          </p>

          <div className="space-y-5">
            {/* Label */}
            <div className="space-y-2">
              <Label htmlFor="label" className="text-sm font-medium">
                Label / Identificação (opcional)
              </Label>
              <Input
                id="label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex: Ambiente de Produção, Demo Cliente X"
                className="bg-background"
              />
            </div>

            {/* Domain */}
            <div className="space-y-2">
              <Label htmlFor="domain" className="text-sm font-medium">
                Domínio Zendesk <span className="text-destructive">*</span>
              </Label>
              <Input
                id="domain"
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onCopy={preventCopy}
                onCut={preventCopy}
                onContextMenu={preventContextMenu}
                placeholder="empresa.zendesk.com"
                className="bg-background"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Ex: d3v-movigoo-78837.zendesk.com
              </p>
            </div>

            {/* User Email */}
            <div className="space-y-2">
              <Label htmlFor="userEmail" className="text-sm font-medium">
                Usuário Zendesk (email/token) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="userEmail"
                type="text"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                onCopy={preventCopy}
                onCut={preventCopy}
                onContextMenu={preventContextMenu}
                placeholder="usuario@empresa.com/token"
                className="bg-background"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Formato: email/token (ex: usuario@empresa.com/token)
              </p>
            </div>

            {/* API Token */}
            <div className="space-y-2">
              <Label htmlFor="apiToken" className="text-sm font-medium">
                Token de API <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="apiToken"
                  type={showToken ? "text" : "password"}
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  onCopy={preventCopy}
                  onCut={preventCopy}
                  onContextMenu={preventContextMenu}
                  placeholder="Cole o token de API do Zendesk"
                  className="bg-background pr-10"
                  autoComplete="off"
                  style={{ WebkitTextSecurity: showToken ? "none" : "disc" } as any}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Obtido em Zendesk Admin &gt; Apps e integrações &gt; APIs &gt; Token de API
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2 flex-wrap">
              <Button
                onClick={handleTest}
                variant="outline"
                disabled={testMutation.isPending || !domain || !userEmail || !apiToken}
                className="flex items-center gap-2"
              >
                {testMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <TestTube size={16} />
                )}
                Testar Conexão
              </Button>

              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !domain || !userEmail || !apiToken}
                className="flex items-center gap-2 bg-primary text-primary-foreground"
              >
                {saveMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Salvar Configuração
              </Button>
            </div>

            {/* Test Result */}
            {testResult && (
              <Card
                className={`p-4 mt-2 ${
                  testResult.success
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex items-start gap-2">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <p
                    className={`text-sm ${
                      testResult.success ? "text-green-800" : "text-red-800"
                    }`}
                  >
                    {testResult.message}
                  </p>
                </div>
              </Card>
            )}
          </div>
        </Card>

        {/* Configuration History */}
        {configHistory.data && configHistory.data.length > 0 && (
          <Card className="mt-6 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-foreground mb-4">
              Histórico de Configurações
            </h2>
            <div className="space-y-3">
              {configHistory.data.map((config) => (
                <div
                  key={config.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    config.isActive
                      ? "border-green-200 bg-green-50"
                      : "border-border bg-muted/30"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">
                        {config.domain}
                      </span>
                      {config.isActive && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                          Ativo
                        </span>
                      )}
                      {config.label && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          {config.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Atualizado:{" "}
                      {config.updatedAt
                        ? new Date(config.updatedAt).toLocaleString("pt-BR")
                        : "N/A"}
                    </p>
                  </div>
                  {!config.isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate({ id: config.id })}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Security Info */}
        <Card className="mt-6 p-5 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 text-sm">
                Informações de Segurança
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-blue-800">
                <li>
                  As credenciais são criptografadas com AES-256-GCM antes do
                  armazenamento.
                </li>
                <li>
                  Os campos sensíveis são protegidos contra cópia e captura de
                  tela.
                </li>
                <li>
                  Apenas administradores autenticados podem acessar esta página.
                </li>
                <li>
                  As credenciais são descriptografadas apenas no momento das
                  chamadas à API Zendesk.
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
