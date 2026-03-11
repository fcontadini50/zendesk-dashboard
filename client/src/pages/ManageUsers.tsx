import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  UserPlus,
  Users,
  Loader2,
  Search,
  Pencil,
  Trash2,
  X,
  Save,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

const MOVIGOO_LOGO =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029189119/mBpT5TPBMiBQnBVLpBVGEL/movigoo-logo_9ce3c215.png";

export default function ManageUsers() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState("end-user");
  const [formEmpresaDemo, setFormEmpresaDemo] = useState("");
  const [formAgenteVirtual, setFormAgenteVirtual] = useState("");
  const [formTipoDemo, setFormTipoDemo] = useState("");
  const [formWebsiteDemo, setFormWebsiteDemo] = useState("");

  const utils = trpc.useUtils();

  const usersQuery = trpc.zendesk.getUsers.useQuery(undefined, {
    retry: 1,
  });

  const createMutation = trpc.zendesk.createUser.useMutation({
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      resetForm();
      utils.zendesk.getUsers.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao criar usuário: ${error.message}`);
    },
  });

  const updateMutation = trpc.zendesk.updateUser.useMutation({
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      resetForm();
      utils.zendesk.getUsers.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const deleteMutation = trpc.zendesk.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("Usuário removido com sucesso!");
      utils.zendesk.getUsers.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormRole("end-user");
    setFormEmpresaDemo("");
    setFormAgenteVirtual("");
    setFormTipoDemo("");
    setFormWebsiteDemo("");
    setEditingUser(null);
    setShowForm(false);
  };

  const handleEdit = (zendeskUser: any) => {
    setEditingUser(zendeskUser);
    setFormName(zendeskUser.name || "");
    setFormEmail(zendeskUser.email || "");
    setFormPhone(zendeskUser.phone || "");
    setFormRole(zendeskUser.role || "end-user");
    setFormEmpresaDemo(zendeskUser.user_fields?.empresa_demo || "");
    setFormAgenteVirtual(zendeskUser.user_fields?.agenteVirtual || "");
    setFormTipoDemo(zendeskUser.user_fields?.tipoDemo || "");
    setFormWebsiteDemo(zendeskUser.user_fields?.websiteDemo || "");
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formName || !formEmail) {
      toast.error("Nome e email são obrigatórios.");
      return;
    }

    const data = {
      name: formName,
      email: formEmail,
      phone: formPhone || undefined,
      role: formRole as "end-user" | "agent" | "admin",
      empresa_demo: formEmpresaDemo || undefined,
      agenteVirtual: formAgenteVirtual || undefined,
      tipoDemo: formTipoDemo || undefined,
      websiteDemo: formWebsiteDemo || undefined,
    };

    if (editingUser) {
      updateMutation.mutate({ userId: editingUser.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredUsers = (usersQuery.data?.users || []).filter((u: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (u.name || "").toLowerCase().includes(term) ||
      (u.email || "").toLowerCase().includes(term)
    );
  });

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
                  <Users size={20} className="text-primary" />
                  Gerenciar Usuários
                </h1>
                <p className="text-xs text-muted-foreground">
                  Gerenciamento de usuários Zendesk
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="flex items-center gap-2 bg-primary text-primary-foreground"
            >
              <UserPlus size={16} />
              <span className="hidden sm:inline">Novo Usuário</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Form */}
        {showForm && (
          <Card className="mb-6 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">
                {editingUser ? "Editar Usuário" : "Novo Usuário"}
              </h2>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X size={18} />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nome <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+55 11 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Papel</Label>
                <select
                  id="role"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                >
                  <option value="end-user">Usuário Final</option>
                  <option value="agent">Agente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="empresa_demo">Empresa Demo</Label>
                <Input
                  id="empresa_demo"
                  value={formEmpresaDemo}
                  onChange={(e) => setFormEmpresaDemo(e.target.value)}
                  placeholder="Nome da empresa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agenteVirtual">Agente Virtual</Label>
                <Input
                  id="agenteVirtual"
                  value={formAgenteVirtual}
                  onChange={(e) => setFormAgenteVirtual(e.target.value)}
                  placeholder="Nome do agente virtual"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipoDemo">Tipo Demo</Label>
                <Input
                  id="tipoDemo"
                  value={formTipoDemo}
                  onChange={(e) => setFormTipoDemo(e.target.value)}
                  placeholder="Tipo de demonstração"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="websiteDemo">Website Demo</Label>
                <Input
                  id="websiteDemo"
                  value={formWebsiteDemo}
                  onChange={(e) => setFormWebsiteDemo(e.target.value)}
                  placeholder="https://demo.empresa.com"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex items-center gap-2 bg-primary text-primary-foreground"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {editingUser ? "Atualizar" : "Criar Usuário"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </Card>
        )}

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Users List */}
        {usersQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">
              Carregando usuários...
            </span>
          </div>
        ) : usersQuery.error ? (
          <Card className="p-6 text-center border-destructive/50 bg-destructive/5">
            <p className="text-destructive">
              Erro ao carregar usuários:{" "}
              {usersQuery.error instanceof Error
                ? usersQuery.error.message
                : "Erro desconhecido"}
            </p>
          </Card>
        ) : filteredUsers.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((zUser: any) => (
              <Card
                key={zUser.id}
                className="p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">
                        {zUser.name || "Sem nome"}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          zUser.role === "admin"
                            ? "bg-red-100 text-red-800"
                            : zUser.role === "agent"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {zUser.role}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {zUser.email || "Sem email"}
                    </p>
                    {zUser.phone && (
                      <p className="text-sm text-muted-foreground">
                        Tel: {zUser.phone}
                      </p>
                    )}
                    {zUser.user_fields && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {zUser.user_fields.empresa_demo && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                            Empresa: {zUser.user_fields.empresa_demo}
                          </span>
                        )}
                        {zUser.user_fields.agenteVirtual && (
                          <span className="text-xs bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded">
                            Agente: {zUser.user_fields.agenteVirtual}
                          </span>
                        )}
                        {zUser.user_fields.tipoDemo && (
                          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                            Tipo: {zUser.user_fields.tipoDemo}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {user && (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(zUser)}
                        className="text-primary hover:text-primary"
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Tem certeza que deseja remover o usuário "${zUser.name}"?`
                            )
                          ) {
                            deleteMutation.mutate({ userId: zUser.id });
                          }
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
