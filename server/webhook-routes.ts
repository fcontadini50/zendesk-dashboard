import { Router } from "express";
import { updateUraStatus, clearUraStatus, currentUraStatus } from "./ura-status-router";
import { updateBiometryState, getBiometryState } from "./biometry-router";

/**
 * REST webhook routes for external systems (URA, Biometry).
 * These endpoints are accessible without tRPC, allowing external systems
 * like IVR/URA platforms to send status updates via simple HTTP POST/GET.
 *
 * Endpoints:
 *   POST /api/ura-status          → Update URA navigation status
 *   GET  /api/ura-status          → Get current URA status
 *   POST /api/ura-status/clear    → Clear URA status
 *   POST /api/biometry-status     → Update biometry authentication status
 *   GET  /api/biometry-status     → Get current biometry status
 */
export function registerWebhookRoutes(app: Router) {
  // ─── URA Status Webhooks ───────────────────────────────────────────

  /**
   * POST /api/ura-status
   * Body: { "status": "Navegando no menu principal" }
   * Called by the URA/IVR system to update the current navigation status.
   */
  app.post("/api/ura-status", (req, res) => {
    try {
      const { status } = req.body;

      if (!status || typeof status !== "string" || status.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Campo 'status' é obrigatório e deve ser uma string não vazia.",
        });
      }

      updateUraStatus(status.trim());

      return res.json({
        success: true,
        message: "Status da URA atualizado com sucesso",
        status: currentUraStatus.message,
        timestamp: currentUraStatus.timestamp,
      });
    } catch (error) {
      console.error("[URA Webhook REST Error]", error);
      return res.status(500).json({
        success: false,
        message: "Erro interno ao atualizar status da URA",
      });
    }
  });

  /**
   * GET /api/ura-status
   * Returns the current URA navigation status.
   */
  app.get("/api/ura-status", (_req, res) => {
    return res.json({
      message: currentUraStatus.message,
      timestamp: currentUraStatus.timestamp,
    });
  });

  /**
   * POST /api/ura-status/clear
   * Clears the current URA status.
   */
  app.post("/api/ura-status/clear", (_req, res) => {
    clearUraStatus();
    return res.json({
      success: true,
      message: "Status da URA limpo com sucesso",
    });
  });

  // ─── Biometry Status Webhooks ──────────────────────────────────────

  /**
   * POST /api/biometry-status
   * Body: { "authenticated": true }
   * Called by the biometry system to update authentication status.
   */
  app.post("/api/biometry-status", (req, res) => {
    try {
      const { authenticated } = req.body;
      const status = authenticated !== false;

      updateBiometryState(status);

      return res.json({
        success: true,
        status,
        message: `Biometria atualizada: ${status ? "Autenticado" : "Não autenticado"}`,
      });
    } catch (error) {
      console.error("[Biometry Webhook REST Error]", error);
      return res.status(500).json({
        success: false,
        message: "Erro interno ao atualizar biometria",
      });
    }
  });

  /**
   * GET /api/biometry-status
   * Returns the current biometry authentication status.
   */
  app.get("/api/biometry-status", (_req, res) => {
    return res.json(getBiometryState());
  });

  console.log("[Webhooks] REST webhook routes registered: /api/ura-status, /api/biometry-status");
}
