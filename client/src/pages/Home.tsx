import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  RefreshCw,
  AlertCircle,
  Users,
  Fingerprint,
  ChevronDown,
  ChevronUp,
  Settings,
  Pencil,
  Trash2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import VoiceCommandButton from "@/components/VoiceCommandButton";

const MOVIGOO_LOGO =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029189119/mBpT5TPBMiBQnBVLpBVGEL/movigoo-logo_9ce3c215.png";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [zenDeskTickets, setZendeskTickets] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [biometryStatus, setBiometryStatus] = useState(false);
  const [uraStatusMessage, setUraStatusMessage] = useState("");
  const [uraStatusHistory, setUraStatusHistory] = useState<
    Array<{ message: string; timestamp: Date }>
  >([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isStatusFading, setIsStatusFading] = useState(false);

  // tRPC queries
  const uraStatusQuery = trpc.uraStatus.getStatus.useQuery(undefined, {
    refetchInterval: 500,
    enabled: true,
    staleTime: 0,
  });

  const biometryQuery = trpc.biometry.getBiometryStatus.useQuery(undefined, {
    refetchInterval: 1000,
    enabled: true,
    staleTime: 0,
  });

  const zendeskQuery = trpc.zendesk.getTickets.useQuery(undefined, {
    refetchInterval: 20000,
    enabled: true,
    retry: 1,
  });

  // URA status with fade-out
  useEffect(() => {
    if (uraStatusQuery.data?.message) {
      setUraStatusMessage(uraStatusQuery.data.message);
      setIsStatusFading(false);

      setUraStatusHistory((prev) => {
        const newHistory = [
          { message: uraStatusQuery.data!.message, timestamp: new Date() },
          ...prev,
        ];
        return newHistory.slice(0, 10);
      });

      const fadeTimeout = setTimeout(() => {
        setIsStatusFading(true);
      }, 9000);

      const clearMsgTimeout = setTimeout(() => {
        setUraStatusMessage("");
        setIsStatusFading(false);
      }, 10000);

      return () => {
        clearTimeout(fadeTimeout);
        clearTimeout(clearMsgTimeout);
      };
    }
  }, [uraStatusQuery.data?.message]);

  // Biometry status
  useEffect(() => {
    if (biometryQuery.data !== undefined) {
      setBiometryStatus(biometryQuery.data.isAuthenticated);
    }
  }, [biometryQuery.data]);

  // Process Zendesk tickets
  useEffect(() => {
    if (zendeskQuery.data?.tickets) {
      const priorityOrder: Record<string, number> = {
        urgent: 0,
        high: 1,
        normal: 2,
        low: 3,
      };

      const sorted = [...zendeskQuery.data.tickets].sort((a: any, b: any) => {
        const priorityA = priorityOrder[a.priority?.toLowerCase() || "normal"] ?? 2;
        const priorityB = priorityOrder[b.priority?.toLowerCase() || "normal"] ?? 2;
        return priorityA - priorityB;
      });

      setZendeskTickets(sorted);
      setLastUpdate(new Date());
    }
  }, [zendeskQuery.data]);

  useEffect(() => {
    setIsUpdating(zendeskQuery.isFetching);
  }, [zendeskQuery.isFetching]);

  // Filter tickets
  const filteredTickets = zenDeskTickets.filter((ticket: any) => {
    const statusMatch = statusFilter === "all" || ticket.status === statusFilter;
    const priorityMatch =
      priorityFilter === "all" || ticket.priority === priorityFilter;
    return statusMatch && priorityMatch;
  });

  // Stats
  const openTickets = zenDeskTickets.filter(
    (t: any) => t.status === "open" || t.status === "new"
  );

  const ticketStats = {
    total_open: openTickets.length,
    urgent: openTickets.filter((t: any) => t.priority === "urgent").length,
    high: openTickets.filter((t: any) => t.priority === "high").length,
    normal: openTickets.filter((t: any) => t.priority === "normal").length,
    low: openTickets.filter((t: any) => t.priority === "low").length,
  };

  const statusStats = {
    opened: zenDeskTickets.filter((t: any) => t.status === "open").length,
    closed: zenDeskTickets.filter((t: any) => t.status === "closed").length,
    new: zenDeskTickets.filter((t: any) => t.status === "new").length,
    solved: zenDeskTickets.filter((t: any) => t.status === "solved").length,
  };

  const uniqueStatuses = Array.from(
    new Set(zenDeskTickets.map((t: any) => t.status))
  );

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatTime = (date: Date | null) => {
    if (!date) return "Nunca";
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatHistoryTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getPriorityColor = (priority: string | undefined) => {
    if (!priority) return "bg-gray-100 text-gray-800";
    const p = priority.toLowerCase();
    if (p === "urgent") return "bg-red-100 text-red-800";
    if (p === "high") return "bg-orange-100 text-orange-800";
    if (p === "normal") return "bg-yellow-100 text-yellow-800";
    if (p === "low") return "bg-green-100 text-green-800";
    return "bg-blue-100 text-blue-800";
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return "bg-gray-100 text-gray-800";
    const s = status.toLowerCase();
    if (s === "open") return "bg-purple-100 text-purple-800";
    if (s === "new") return "bg-indigo-100 text-indigo-800";
    if (s === "solved") return "bg-cyan-100 text-cyan-800";
    if (s === "closed") return "bg-slate-100 text-slate-800";
    if (s === "pending") return "bg-amber-100 text-amber-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo and Title */}
            <div className="flex items-center gap-4 flex-1">
              <img
                src={MOVIGOO_LOGO}
                alt="Movigoo"
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-xl font-bold text-foreground leading-tight">
                  Demonstração Visual
                </h1>
                <h1 className="text-xl font-bold text-foreground leading-tight">
                  da Navegação
                </h1>
                <p className="text-xs text-muted-foreground">
                  Monitoramento de tickets em tempo real
                </p>
              </div>
            </div>

            {/* Biometry Indicator */}
            <div className="flex-shrink-0 hidden md:block">
              <Card
                className={`p-2.5 border-2 w-44 ${
                  biometryStatus
                    ? "bg-gradient-to-br from-green-900 to-green-800 border-green-700 shadow-lg shadow-green-500/30"
                    : "bg-gradient-to-br from-gray-700 to-gray-600 border-gray-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={`text-xs font-semibold ${
                        biometryStatus ? "text-green-100" : "text-gray-300"
                      }`}
                    >
                      Biometria
                    </p>
                    <p
                      className={`text-sm font-bold ${
                        biometryStatus ? "text-white" : "text-gray-400"
                      }`}
                    >
                      {biometryStatus ? "Conectado" : "Aguardando"}
                    </p>
                  </div>
                  <div
                    className={`rounded-lg p-1.5 ${
                      biometryStatus ? "bg-green-700/50" : "bg-gray-500/50"
                    }`}
                  >
                    <Fingerprint
                      className={`h-5 w-5 ${
                        biometryStatus
                          ? "text-green-300 drop-shadow-lg"
                          : "text-gray-300"
                      }`}
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Voice Command */}
            <div className="flex-shrink-0">
              <VoiceCommandButton />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={() => setLocation("/manage-users")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 px-3 rounded-lg flex items-center gap-2"
              >
                <Users size={16} />
                <span className="hidden sm:inline">Gerenciar Usuários</span>
              </Button>

              {user?.role === "admin" && (
                <Button
                  onClick={() => setLocation("/admin")}
                  className="bg-slate-700 hover:bg-slate-800 text-white font-medium text-sm py-2 px-3 rounded-lg flex items-center gap-2"
                >
                  <Settings size={16} />
                  <span className="hidden sm:inline">Administração</span>
                </Button>
              )}
            </div>

            {/* Sync Status */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-muted-foreground">Última atualização</p>
                <p className="text-sm font-medium text-foreground">
                  {formatTime(lastUpdate)}
                </p>
              </div>
              <div
                className={`rounded-full p-2 ${
                  isUpdating ? "bg-primary/10" : "bg-muted"
                }`}
              >
                <RefreshCw
                  className={`h-4 w-4 text-primary ${
                    isUpdating ? "animate-spin" : ""
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Agent Virtual Status Bar */}
      {uraStatusMessage && (
        <div
          className={`transition-opacity duration-1000 ${
            isStatusFading ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-800 px-4 py-3">
            <div className="container mx-auto flex items-center justify-between">
              <p className="text-lg text-white">
                Status do Agente Virtual: {uraStatusMessage}
              </p>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-white hover:text-blue-100 transition-colors"
                title="Ver histórico de status"
              >
                {showHistory ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Panel */}
      {showHistory && uraStatusHistory.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-4">
          <div className="container mx-auto">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">
              Histórico de Status (últimas 10 mensagens)
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {uraStatusHistory.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-2 bg-white rounded border border-blue-100"
                >
                  <span className="text-xs text-blue-600 font-mono whitespace-nowrap pt-0.5">
                    {formatHistoryTime(item.timestamp)}
                  </span>
                  <p className="text-sm text-blue-900 flex-1">{item.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4">
        {/* Indicators Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Priority Indicators */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-semibold text-gray-600 mb-4 uppercase tracking-wide">
              Prioridade
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3 bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 font-semibold">
                      Total Abertos
                    </p>
                    <p className="mt-1 text-xl font-bold text-blue-900">
                      {ticketStats.total_open}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-100 p-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-3 bg-red-50 border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-red-600 font-semibold">Urgentes</p>
                    <p className="mt-1 text-xl font-bold text-red-900">
                      {ticketStats.urgent}
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-100 p-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-3 bg-orange-50 border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-orange-600 font-semibold">Alta</p>
                    <p className="mt-1 text-xl font-bold text-orange-900">
                      {ticketStats.high}
                    </p>
                  </div>
                  <div className="rounded-lg bg-orange-100 p-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-3 bg-yellow-50 border-yellow-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-yellow-600 font-semibold">Normal</p>
                    <p className="mt-1 text-xl font-bold text-yellow-900">
                      {ticketStats.normal}
                    </p>
                  </div>
                  <div className="rounded-lg bg-yellow-100 p-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-3 bg-green-50 border-green-200 col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-600 font-semibold">Baixa</p>
                    <p className="mt-1 text-xl font-bold text-green-900">
                      {ticketStats.low}
                    </p>
                  </div>
                  <div className="rounded-lg bg-green-100 p-2">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-600 mb-4 uppercase tracking-wide">
              Status
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3 bg-purple-50 border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-600 font-semibold">
                      Abertos
                    </p>
                    <p className="mt-1 text-xl font-bold text-purple-900">
                      {statusStats.opened}
                    </p>
                  </div>
                  <div className="rounded-lg bg-purple-100 p-2">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-3 bg-indigo-50 border-indigo-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-indigo-600 font-semibold">Novos</p>
                    <p className="mt-1 text-xl font-bold text-indigo-900">
                      {statusStats.new}
                    </p>
                  </div>
                  <div className="rounded-lg bg-indigo-100 p-2">
                    <AlertCircle className="h-5 w-5 text-indigo-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-3 bg-cyan-50 border-cyan-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-cyan-600 font-semibold">
                      Resolvidos
                    </p>
                    <p className="mt-1 text-xl font-bold text-cyan-900">
                      {statusStats.solved}
                    </p>
                  </div>
                  <div className="rounded-lg bg-cyan-100 p-2">
                    <Clock className="h-5 w-5 text-cyan-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-3 bg-slate-50 border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 font-semibold">
                      Fechados
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {statusStats.closed}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-100 p-2">
                    <Clock className="h-5 w-5 text-slate-600" />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {zendeskQuery.error && (
          <Card className="mb-6 border-destructive/50 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-destructive flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-destructive">
                  Erro ao carregar dados do Zendesk
                </h3>
                <p className="mt-1 text-sm text-destructive/80">
                  {zendeskQuery.error instanceof Error
                    ? zendeskQuery.error.message
                    : "Erro desconhecido"}
                </p>
                {user?.role === "admin" && (
                  <Button
                    onClick={() => setLocation("/admin")}
                    variant="outline"
                    className="mt-2 text-sm"
                  >
                    <Settings size={14} className="mr-1" />
                    Verificar configuração
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Filters and Ticket List */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <h2 className="text-lg font-bold text-foreground">Tickets Zendesk</h2>
            <div className="flex gap-3 flex-wrap">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
              >
                <option value="all">Todas as Prioridades</option>
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="normal">Normal</option>
                <option value="low">Baixa</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
              >
                <option value="all">Todos os Status</option>
                {uniqueStatuses.map((status: string) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {zendeskQuery.isLoading && !zenDeskTickets.length ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">
                    Carregando tickets Zendesk...
                  </p>
                </div>
              </div>
            ) : filteredTickets.length === 0 && !zendeskQuery.isLoading ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  {zendeskQuery.error
                    ? "Configure o Zendesk na página de Administração para visualizar tickets."
                    : "Nenhum ticket encontrado com os filtros selecionados."}
                </p>
              </Card>
            ) : (
              filteredTickets.map((ticket: any) => (
                <Card
                  key={ticket.id}
                  className="p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-foreground truncate">
                          #{ticket.id} - {ticket.subject || "Sem título"}
                        </h3>
                        {ticket.priority && (
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        )}
                        {ticket.status && (
                          <Badge className={getStatusColor(ticket.status)}>
                            {ticket.status}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {ticket.description || "Sem descrição"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>Criado: {formatDate(ticket.created_at)}</span>
                        <span>
                          Atualizado: {formatDate(ticket.updated_at)}
                        </span>
                        {ticket.assignee_id ? (
                          <span>Atribuído a: ID {ticket.assignee_id}</span>
                        ) : (
                          <span>Não atribuído</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
