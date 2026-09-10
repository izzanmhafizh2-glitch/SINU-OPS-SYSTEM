// ============================================================
// Supabase Edge Function: send-push
// Mengirim Web Push ke perangkat berdasarkan role / username.
//
// Deploy:
//   supabase functions deploy send-push --no-verify-jwt
//
// Secrets yang harus diset (sekali):
//   supabase secrets set VAPID_PUBLIC_KEY=...  VAPID_PRIVATE_KEY=...  VAPID_SUBJECT=mailto:admin@ptsinu.com
//   (SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY sudah tersedia otomatis)
//
// Cara panggil (POST JSON):
//   { "roles": ["teknisi"], "title": "WO Baru", "body": "Ada tugas baru", "url": "/" }
//   atau { "usernames": ["budi"], "title": "...", "body": "..." }
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "https://esm.sh/web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@ptsinu.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function text(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

function people(value: unknown) {
  if (Array.isArray(value)) return value.filter(Boolean).map(item => text(item)).join(", ");
  return text(value);
}

// Ubah payload Database Webhook Supabase menjadi satu notifikasi push.
// Payload webhook berbentuk { type, table, record, old_record }.
function notificationFromWebhook(input: Record<string, unknown>) {
  const table = text(input.table).toLowerCase();
  const eventType = text(input.type).toUpperCase();
  const row = (input.record && typeof input.record === "object" ? input.record : {}) as Record<string, unknown>;
  const old = (input.old_record && typeof input.old_record === "object" ? input.old_record : {}) as Record<string, unknown>;
  if (!table || !Object.keys(row).length) return null;

  const status = text(row.status).toUpperCase();
  const oldStatus = text(old.status).toUpperCase();
  const id = text(row.wo_id || row.id || row.sn || Date.now());
  const customer = text(row.pelanggan || row.nama_pelanggan || "Pelanggan");
  const changed = eventType === "INSERT" || (eventType === "UPDATE" && status !== oldStatus);
  let roles: string[] = [];
  let usernames: string[] = [];
  let title = "Pembaruan PT SINu";
  let body = `${id} mengalami pembaruan.`;

  if (table === "work_orders") {
    const tipe = text(row.tipe).toUpperCase();
    const isMaintenance = tipe === "MAINTENANCE";
    const technicianRelease = status === "RELEASE" && !isMaintenance;

    if (eventType === "INSERT" && isMaintenance) {
      roles = ["admin", "noc", "supervisor"];
      title = "Maintenance Baru";
      body = `${id} — ${customer} masuk ke antrian NOC.`;
    } else if (eventType === "INSERT" && technicianRelease) {
      roles = ["teknisi"];
      title = "Tugas Baru";
      body = `${id} — ${customer} tersedia untuk diambil.`;
    } else if (eventType === "UPDATE" && isMaintenance && changed && status) {
      if (status === "RELEASE") {
        roles = ["teknisi", "admin", "noc", "supervisor"];
        title = "Maintenance Dilempar ke Teknisi";
        body = `${id} — ${customer} dilepas NOC untuk dikerjakan teknisi.`;
      } else {
        roles = ["admin", "noc", "supervisor"];
        title = "Update Maintenance";
        body = `${id} — ${customer} berubah ke status ${status}.`;
      }
    } else if (eventType === "UPDATE" && status === "RELEASE" && oldStatus !== "RELEASE") {
      roles = ["teknisi"];
      title = "Tugas Kembali";
      body = `${id} — ${customer} kembali tersedia untuk diambil.`;
    } else if (eventType === "UPDATE" && status === "PICKUP" && oldStatus !== "PICKUP") {
      roles = ["admin", "cs", "supervisor"];
      title = "Tugas Diambil";
      body = `${id} — ${customer} diambil oleh ${people(row.teknisi || row.noc_name) || "teknisi"}.`;
    } else if (eventType === "UPDATE" && status === "SELESAI" && oldStatus !== "SELESAI") {
      roles = ["admin", "cs", "supervisor"];
      title = "Tugas Selesai";
      body = `${id} — ${customer} selesai oleh ${people(row.teknisi) || "teknisi"}.`;
    } else if (eventType === "UPDATE" && status === "SELESAI" && !row.rl_radius_done
      && ["INSTALASI", "INSTALASI_RESELLER", "PERLUASAN_RESELLER"].includes(tipe)) {
      roles = ["admin", "cs"];
      title = "Perlu Input RL Radius";
      body = `${id} — ${customer} menunggu No. Layanan / RL Radius.`;
    }
  } else if (table === "device_history" && eventType === "INSERT") {
    roles = ["noc", "admin", "cs", "supervisor"];
    title = "Pergerakan Perangkat";
    body = `${text(row.sn, "SN")} — ${text(row.dari, "Gudang")} → ${text(row.ke, "-")}${row.keterangan ? ` • ${text(row.keterangan)}` : ""}`;
  } else if (table === "tiket_dismantle" && changed && status) {
    if (status === "RELEASE") {
      roles = ["teknisi"];
      title = "Tugas Dismantle Baru";
      body = `${id} — ${customer} siap di-pickup.`;
    } else {
      roles = ["noc", "admin", "cs", "supervisor"];
      title = "Update Dismantle";
      body = `${id} — ${customer} berubah ke status ${status}.`;
    }
  } else if (table === "dismantle_items" && (eventType === "INSERT" || (eventType === "UPDATE" && changed))) {
    roles = ["noc", "admin", "cs", "supervisor"];
    title = eventType === "INSERT" ? "Perangkat Dismantle Masuk" : "Hasil Cek Perangkat";
    body = `${text(row.sn, "SN")} — ${text(row.jenis, "Perangkat")}${row.hasil_noc && text(row.hasil_noc) !== "PENDING" ? ` dinyatakan ${text(row.hasil_noc)}.` : " menunggu pengecekan NOC."}`;
  } else if (table === "provisioning_requests" && eventType === "INSERT") {
    roles = ["admin", "cs", "noc"];
    title = "Request Provisioning Baru";
    body = `${id} — ${text(row.teknisi_name, "Teknisi")} meminta provisioning.`;
  } else if (table === "provisioning_requests" && eventType === "UPDATE" && status === "DONE" && oldStatus !== "DONE") {
    const technician = text(row.teknisi_name).toLowerCase();
    if (technician) usernames = [technician];
    title = "Provisioning Selesai";
    body = `${id} sudah selesai diproses.`;
  }

  if (!roles.length && !usernames.length) return null;
  return {
    roles,
    usernames,
    title,
    body,
    url: "/",
    tag: `sinu-${table}-${id}-${eventType}-${status || "event"}`
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const input = await req.json() as Record<string, unknown>;
    const webhookNotification = input.table && input.record ? notificationFromWebhook(input) : null;
    const isWebhook = Boolean(input.table && input.record);
    if (isWebhook && !webhookNotification) {
      return new Response(JSON.stringify({ sent: 0, removed: 0, total: 0, ignored: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const notification = webhookNotification || {
      roles: Array.isArray(input.roles) ? input.roles.map((role: unknown) => text(role).toLowerCase()) : [],
      usernames: Array.isArray(input.usernames) ? input.usernames.map((username: unknown) => text(username).toLowerCase()) : [],
      title: text(input.title, "PT SINu"),
      body: text(input.body, "Ada pembaruan baru."),
      url: text(input.url, "/"),
      tag: text(input.tag, "sinu-notif")
    };

    let query = admin.from("push_subscriptions").select("*");
    if (notification.roles.length) query = query.in("role", notification.roles);
    else if (notification.usernames.length) query = query.in("username", notification.usernames);
    else throw new Error("Target penerima notifikasi tidak ditemukan.");

    const { data: subs, error } = await query;
    if (error) throw error;

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      url: notification.url,
      tag: notification.tag,
    });

    let sent = 0;
    let removed = 0;
    for (const s of subs ?? []) {
      const subscription = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      };
      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          removed++;
        }
      }
    }

    return new Response(JSON.stringify({ sent, removed, total: subs?.length ?? 0 }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
