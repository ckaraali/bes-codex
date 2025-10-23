import { getAuthSession } from "@/lib/auth";
import { CommunicationPlanTabs, type PlannedRecord, type SentRecord } from "@/components/communications/CommunicationPlanTabs";
import { formatReasonLabels } from "@/lib/communication-reasons";
import { supabaseAdmin } from "@/lib/supabase";

export default async function CommunicationsPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return null;
  }

  const [clientsResponse, campaignsResponse, sentLogsResponse] = await Promise.all([
    supabaseAdmin
      .from("clients")
      .select("id, name, email")
      .eq("owner_id", session.user.id)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("communication_campaigns")
      .select(
        `
        id,
        subject,
        body_text,
        reasons_json,
        scheduled_at,
        status,
        created_at,
        communication_channel_statuses (
          channel,
          status
        ),
        communication_recipients (
          id
        )
      `
      )
      .eq("owner_id", session.user.id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("email_logs")
      .select("id, subject, recipients, sent_at, body_preview")
      .eq("owner_id", session.user.id)
      .order("sent_at", { ascending: false })
  ]);

  if (clientsResponse.error) {
    throw clientsResponse.error;
  }
  if (campaignsResponse.error) {
    throw campaignsResponse.error;
  }
  if (sentLogsResponse.error) {
    throw sentLogsResponse.error;
  }

  const clients = clientsResponse.data ?? [];
  const campaigns = campaignsResponse.data ?? [];
  const sentLogs = sentLogsResponse.data ?? [];

  const plannedRecords: PlannedRecord[] = campaigns
    .filter((campaign) => campaign.status !== "COMPLETED" && campaign.status !== "CANCELLED")
    .map((campaign) => {
      const reasonIds = safeParseReasons(campaign.reasons_json ?? "[]");
      const channelStatuses = campaign.communication_channel_statuses ?? [];
      const status = deriveStatus(
        campaign.status ?? "",
        channelStatuses.map((item) => item.status ?? "")
      );
      return {
        id: campaign.id,
        campaignName: campaign.subject,
        recipients: (campaign.communication_recipients ?? []).length,
        channels: channelStatuses.map((channel) => (channel.channel ?? "").toLowerCase()),
        reason: formatReasonLabels(reasonIds),
        scheduledAt: campaign.scheduled_at
          ? new Date(campaign.scheduled_at).toISOString()
          : new Date(campaign.created_at).toISOString(),
        status,
        bodyPreview: (campaign.body_text ?? "").slice(0, 120)
      };
    });

  const sentRecords: SentRecord[] = sentLogs.map((log) => ({
    id: log.id,
    campaignName: log.subject,
    recipients: log.recipients,
    channels: ["email"],
    reason: "Gönderilen e-posta",
    sentAt: log.sent_at ? new Date(log.sent_at).toISOString() : new Date().toISOString(),
    bodyPreview: log.body_preview ?? ""
  }));

  return (
    <div className="page-shell">
      <header style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--accent)" }}>Kampanya takibi</span>
        <h1 style={{ margin: 0, fontSize: "2.15rem" }}>İletişim Planı</h1>
        <p style={{ color: "var(--text-muted)", marginTop: "0.25rem", maxWidth: "700px" }}>
          Planlanan ve gönderilen tüm mesajları tek ekranda takip edin. Filtreleyin, durumlarını izleyin ve müşteri
          iletişimini güncel tutun.
        </p>
      </header>

      <CommunicationPlanTabs
        clients={clients.map((client) => ({
          id: client.id,
          name: client.name,
          email: client.email ?? undefined
        }))}
        plannedRecords={plannedRecords}
        sentRecords={sentRecords}
      />
    </div>
  );
}

function safeParseReasons(reasonsJson: string): string[] {
  try {
    const parsed = JSON.parse(reasonsJson);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function deriveStatus(campaignStatus: string, channelStatuses: string[]): "pending" | "scheduled" | "draft" {
  const normalizedCampaign = (campaignStatus ?? "").toUpperCase();
  const normalizedChannels = channelStatuses.map((status) => (status ?? "").toUpperCase());

  if (normalizedCampaign === "DRAFT") {
    return "draft";
  }
  if (normalizedCampaign === "SCHEDULED") {
    return "scheduled";
  }
  if (normalizedCampaign === "SENDING") {
    return "pending";
  }
  if (normalizedCampaign === "COMPLETED" || normalizedChannels.every((status) => status === "SENT")) {
    return "scheduled";
  }
  return "pending";
}
