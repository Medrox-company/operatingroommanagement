"""Generuje diagramy závislostí, architektury a DB schématu pro ORM dokumentaci.

Všechny diagramy jsou v dark themu s žlutým accentem (#FBBF24), aby ladily s
designem přihlašovací stránky aplikace.
"""

from __future__ import annotations

import os
from pathlib import Path

import matplotlib.pyplot as plt
import networkx as nx
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from matplotlib.lines import Line2D

# ============================================================================
# Design tokens — sladěno s LoginPage.tsx
# ============================================================================

BG = "#020617"          # tmavé pozadí (slate-950)
SURFACE = "#0F172A"     # karta (slate-900)
BORDER = "#1E293B"      # hrana
ACCENT = "#FBBF24"      # primary brand (yellow)
ACCENT_DIM = "#92741A"  # ztlumený accent
TEXT = "#E2E8F0"        # primární text (slate-200)
TEXT_DIM = "#94A3B8"    # sekundární text (slate-400)
GREEN = "#10B981"
CYAN = "#06B6D4"
PURPLE = "#A855F7"
PINK = "#EC4899"
ORANGE = "#F97316"
RED = "#EF4444"
BLUE = "#3B82F6"


def _style_axes(ax, title: str | None = None) -> None:
    """Aplikuje dark theme na axes objekt."""
    ax.set_facecolor(BG)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["bottom"].set_color(BORDER)
    ax.spines["left"].set_color(BORDER)
    ax.tick_params(colors=TEXT_DIM, which="both")
    ax.xaxis.label.set_color(TEXT)
    ax.yaxis.label.set_color(TEXT)
    if title:
        ax.set_title(title, color=ACCENT, fontsize=14, fontweight="bold", pad=14)


def _new_figure(width: float, height: float):
    fig, ax = plt.subplots(figsize=(width, height), dpi=140)
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.set_axis_off()
    return fig, ax


# ============================================================================
# Diagram 1 — Vrstvená architektura aplikace
# ============================================================================

def render_architecture(out_path: Path) -> None:
    fig, ax = _new_figure(12, 8.5)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)

    layers = [
        # (y, label, popis, accent, items)
        (7.5, "PRESENTATION", "React komponenty + LoginPage design",
         ACCENT,
         ["LoginPage", "Sidebar / TopBar / MobileNav", "Dashboard (App.tsx)",
          "RoomDetail", "TimelineModule", "StatisticsModule"]),
        (5.5, "STATE", "Context API + custom hooks",
         PURPLE,
         ["AuthContext", "WorkflowStatusesContext",
          "useRealtimeSubscription", "useEmergencyAlert", "useEmailNotifications"]),
        (3.5, "API / SERVICES", "Next.js Route Handlers + lib utilities",
         CYAN,
         ["/api/auth/*", "/api/rooms", "/api/admin/*", "/api/operating-rooms/reorder",
          "lib/db.ts", "lib/email.ts", "lib/realtime-notifications.ts"]),
        (1.5, "DATA / INFRA", "Supabase Postgres + Realtime + Vercel hosting",
         GREEN,
         ["app_users", "operating_rooms", "staff", "schedules",
          "workflow_statuses", "app_modules", "app_settings",
          "Realtime channels", "RLS policies"]),
    ]

    for y, label, sub, color, items in layers:
        # Levá štítek vrstvy
        ax.add_patch(FancyBboxPatch(
            (0.2, y - 0.6), 2.5, 1.2,
            boxstyle="round,pad=0.05,rounding_size=0.15",
            facecolor=color, edgecolor=color, alpha=0.18, linewidth=1.5,
        ))
        ax.text(1.45, y + 0.05, label, color=color, fontsize=11,
                fontweight="bold", ha="center", va="center")
        ax.text(1.45, y - 0.35, sub, color=TEXT_DIM, fontsize=7.5,
                ha="center", va="center", style="italic")

        # Items karta
        ax.add_patch(FancyBboxPatch(
            (3.0, y - 0.7), 8.7, 1.4,
            boxstyle="round,pad=0.05,rounding_size=0.18",
            facecolor=SURFACE, edgecolor=BORDER, linewidth=1.2,
        ))
        # Rozdělit do 3 sloupců
        cols = 3
        per_col = (len(items) + cols - 1) // cols
        for i, item in enumerate(items):
            col = i // per_col
            row = i % per_col
            x = 3.25 + col * 2.85
            y_item = y + 0.35 - row * 0.32
            ax.text(x, y_item, f"• {item}", color=TEXT, fontsize=8,
                    ha="left", va="center", family="monospace")

    # Šipky závislostí (shora dolů)
    for y_top, y_bot in [(6.9, 6.2), (4.9, 4.2), (2.9, 2.2)]:
        for x in [4.5, 7.5, 10.5]:
            arrow = FancyArrowPatch(
                (x, y_top), (x, y_bot),
                arrowstyle="->,head_length=0.25,head_width=0.18",
                color=ACCENT_DIM, linewidth=1.3, alpha=0.7,
            )
            ax.add_patch(arrow)

    # Title
    ax.text(6, 8.6, "VRSTVENÁ ARCHITEKTURA APLIKACE",
            color=ACCENT, fontsize=14, fontweight="bold", ha="center")
    ax.text(6, 8.25, "OperatingRoom Manager — Next.js 15 App Router + Supabase",
            color=TEXT_DIM, fontsize=9, ha="center", style="italic")

    # Footer caption
    ax.text(6, 0.4, "Toky dat: shora dolů (UI → State → API → DB), realtime updates obráceně",
            color=TEXT_DIM, fontsize=8, ha="center", style="italic")

    fig.tight_layout()
    fig.savefig(out_path, facecolor=BG, edgecolor="none", bbox_inches="tight")
    plt.close(fig)


# ============================================================================
# Diagram 2 — Graf závislostí komponent (network graph)
# ============================================================================

def render_dependency_graph(out_path: Path) -> None:
    G = nx.DiGraph()

    # Uzly: (id, kategorie)
    nodes = {
        # Roots
        "app/page.tsx": "root",
        "AuthProvider": "context",
        "WorkflowStatusesProvider": "context",
        "App.tsx": "root",
        # Layouts
        "Sidebar": "ui",
        "TopBar": "ui",
        "MobileNav": "ui",
        "MobileShell": "ui",
        # Views
        "LoginPage": "view",
        "RoomCard": "view",
        "RoomDetail": "view",
        "TimelineModule": "view",
        "StatisticsModule": "view",
        "StaffManager": "view",
        "OperatingRoomsManager": "view",
        "DepartmentsManager": "view",
        "StatusesManager": "view",
        "ManagementManager": "view",
        "NotificationsManager": "view",
        "BackgroundManager": "view",
        "SystemSettingsModule": "view",
        "ShiftScheduleManager": "view",
        "SettingsPage": "view",
        # Hooks
        "useRealtimeSubscription": "hook",
        "useEmergencyAlert": "hook",
        "useEmailNotifications": "hook",
        "useWorkflowStatuses": "hook",
        # Lib
        "lib/db.ts": "lib",
        "lib/supabase.ts": "lib",
        "lib/email.ts": "lib",
        "lib/auth/session.ts": "lib",
        # API
        "/api/auth/*": "api",
        "/api/rooms": "api",
        "/api/admin/*": "api",
        "/api/operating-rooms/reorder": "api",
        "/api/send-notification": "api",
        # DB
        "Supabase DB": "db",
    }
    for n, cat in nodes.items():
        G.add_node(n, category=cat)

    edges = [
        # Bootstrapping
        ("app/page.tsx", "AuthProvider"),
        ("AuthProvider", "WorkflowStatusesProvider"),
        ("WorkflowStatusesProvider", "App.tsx"),
        ("AuthProvider", "LoginPage"),
        ("AuthProvider", "/api/auth/*"),
        # App.tsx skládá hlavní moduly
        ("App.tsx", "Sidebar"),
        ("App.tsx", "TopBar"),
        ("App.tsx", "MobileNav"),
        ("App.tsx", "RoomCard"),
        ("App.tsx", "TimelineModule"),
        ("App.tsx", "StatisticsModule"),
        ("App.tsx", "StaffManager"),
        ("App.tsx", "SettingsPage"),
        ("App.tsx", "BackgroundManager"),
        ("App.tsx", "useRealtimeSubscription"),
        ("App.tsx", "useEmergencyAlert"),
        ("App.tsx", "useEmailNotifications"),
        # Detail otevírá se z RoomCard
        ("RoomCard", "RoomDetail"),
        ("RoomDetail", "useWorkflowStatuses"),
        # Settings podstrany
        ("SettingsPage", "OperatingRoomsManager"),
        ("SettingsPage", "DepartmentsManager"),
        ("SettingsPage", "StatusesManager"),
        ("SettingsPage", "ManagementManager"),
        ("SettingsPage", "NotificationsManager"),
        ("SettingsPage", "BackgroundManager"),
        ("SettingsPage", "SystemSettingsModule"),
        ("SettingsPage", "ShiftScheduleManager"),
        # Mobile shell
        ("App.tsx", "MobileShell"),
        # Hooks → lib
        ("useRealtimeSubscription", "lib/supabase.ts"),
        ("useEmailNotifications", "/api/send-notification"),
        ("useWorkflowStatuses", "/api/admin/*"),
        # Operations Manager → API
        ("OperatingRoomsManager", "/api/operating-rooms/reorder"),
        ("OperatingRoomsManager", "/api/rooms"),
        # API → DB
        ("/api/auth/*", "lib/auth/session.ts"),
        ("/api/auth/*", "lib/db.ts"),
        ("/api/rooms", "lib/db.ts"),
        ("/api/admin/*", "lib/db.ts"),
        ("/api/send-notification", "lib/email.ts"),
        ("lib/db.ts", "lib/supabase.ts"),
        ("lib/supabase.ts", "Supabase DB"),
    ]
    G.add_edges_from(edges)

    # Layout — kombinace shells (kategorie → soustředné kruhy)
    pos = nx.shell_layout(G, nlist=[
        ["Supabase DB"],
        ["lib/db.ts", "lib/supabase.ts", "lib/email.ts", "lib/auth/session.ts"],
        ["/api/auth/*", "/api/rooms", "/api/admin/*",
         "/api/operating-rooms/reorder", "/api/send-notification"],
        ["useRealtimeSubscription", "useEmergencyAlert",
         "useEmailNotifications", "useWorkflowStatuses",
         "AuthProvider", "WorkflowStatusesProvider"],
        ["App.tsx", "LoginPage", "Sidebar", "TopBar", "MobileNav", "MobileShell",
         "RoomCard", "RoomDetail", "TimelineModule", "StatisticsModule",
         "StaffManager", "SettingsPage", "OperatingRoomsManager",
         "DepartmentsManager", "StatusesManager", "ManagementManager",
         "NotificationsManager", "BackgroundManager", "SystemSettingsModule",
         "ShiftScheduleManager"],
        ["app/page.tsx"],
    ])

    color_map = {
        "root": ACCENT,
        "context": PURPLE,
        "ui": BLUE,
        "view": CYAN,
        "hook": PINK,
        "lib": ORANGE,
        "api": GREEN,
        "db": "#FACC15",
    }
    node_colors = [color_map[G.nodes[n]["category"]] for n in G.nodes]

    fig, ax = _new_figure(14, 14)

    nx.draw_networkx_edges(
        G, pos, ax=ax, edge_color=ACCENT_DIM, alpha=0.45,
        arrows=True, arrowsize=10, width=0.9,
        connectionstyle="arc3,rad=0.08",
    )
    nx.draw_networkx_nodes(
        G, pos, ax=ax, node_color=node_colors,
        node_size=950, alpha=0.9, edgecolors=BG, linewidths=1.3,
    )
    nx.draw_networkx_labels(
        G, pos, ax=ax, font_size=6.6, font_color=TEXT,
        font_family="monospace",
    )

    # Legenda
    legend_handles = [
        Line2D([0], [0], marker="o", color="none",
               markerfacecolor=color_map[c], markersize=10, label=label)
        for c, label in [
            ("root", "Root / entry"),
            ("context", "React Context"),
            ("ui", "Layout UI"),
            ("view", "Views / Modules"),
            ("hook", "Custom hook"),
            ("lib", "Lib / utility"),
            ("api", "API route"),
            ("db", "Database"),
        ]
    ]
    legend = ax.legend(
        handles=legend_handles, loc="lower left", bbox_to_anchor=(0.0, 0.0),
        frameon=True, facecolor=SURFACE, edgecolor=BORDER, labelcolor=TEXT,
        fontsize=8, title="Kategorie uzlu", title_fontsize=9,
    )
    legend.get_title().set_color(ACCENT)

    ax.set_title(
        "GRAF ZÁVISLOSTÍ KOMPONENT, HOOKŮ A API",
        color=ACCENT, fontsize=15, fontweight="bold", pad=20,
    )
    fig.tight_layout()
    fig.savefig(out_path, facecolor=BG, edgecolor="none", bbox_inches="tight")
    plt.close(fig)


# ============================================================================
# Diagram 3 — DB schéma s vazbami
# ============================================================================

def render_db_schema(out_path: Path) -> None:
    fig, ax = _new_figure(14, 11)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 11)

    # (x, y, w, h, name, columns, je_master?)
    tables = [
        (0.3, 8.5, 3.4, 2.3, "app_users",
         ["id (uuid) PK", "email", "name", "role", "password_hash",
          "is_active", "created_at"], True),
        (4.0, 8.5, 3.4, 2.3, "app_modules",
         ["id (text) PK", "name", "description", "is_enabled",
          "icon", "accent_color", "allowed_roles", "sort_order"], True),
        (7.7, 8.5, 3.0, 2.3, "departments",
         ["id (text) PK", "name", "description",
          "accent_color", "is_active"], True),
        (11.0, 8.5, 2.7, 2.3, "sub_departments",
         ["id PK", "department_id FK",
          "name", "is_active"], False),

        (0.3, 5.4, 3.4, 2.7, "operating_rooms",
         ["id (text) PK", "name", "department FK", "status",
          "current_step_index", "current_patient_id",
          "doctor_id FK", "nurse_id FK", "anesthesiologist_id FK",
          "weekly_schedule (jsonb)", "sort_order"], True),
        (4.0, 5.4, 3.4, 2.7, "staff",
         ["id (text) PK", "name", "role",
          "skill_level", "availability", "is_active",
          "is_external", "is_recommended",
          "vacation_days", "sick_leave_days"], True),
        (7.7, 5.4, 3.0, 2.7, "workflow_statuses",
         ["id (text) PK", "name", "description",
          "accent_color", "icon", "default_duration_minutes",
          "is_special", "special_type",
          "show_in_timeline", "sort_order"], True),
        (11.0, 5.4, 2.7, 2.7, "schedules",
         ["id PK", "operating_room_id FK",
          "patient_id", "procedure_id",
          "scheduled_date", "scheduled_time",
          "duration_minutes", "priority", "status"], False),

        (0.3, 2.3, 3.4, 2.7, "shift_schedules",
         ["id PK", "operating_room_id FK", "staff_id FK",
          "shift_date", "start_time", "end_time",
          "shift_type", "is_available"], False),
        (4.0, 2.3, 3.4, 2.7, "room_status_history",
         ["id (uuid) PK", "operating_room_id FK",
          "step_index", "step_name", "event_type",
          "timestamp", "duration_seconds",
          "metadata (jsonb)"], False),
        (7.7, 2.3, 3.0, 2.7, "management_contacts",
         ["id PK", "name", "position", "email", "phone",
          "notify_emergencies", "notify_late_arrival",
          "notify_daily_reports", "is_active"], True),
        (11.0, 2.3, 2.7, 2.7, "notifications_log",
         ["id (uuid) PK", "room_id FK", "room_name",
          "notification_type", "custom_reason",
          "recipient_count", "created_at"], False),

        (0.3, 0.2, 3.4, 1.8, "equipment",
         ["id PK", "operating_room_id FK", "name",
          "type", "is_available",
          "last_maintenance", "next_maintenance"], False),
        (4.0, 0.2, 3.4, 1.8, "app_settings",
         ["id (singleton) PK", "facility_name",
          "background_type", "background_colors (jsonb)",
          "background_image_url", "background_opacity"], True),
    ]

    for x, y, w, h, name, cols, master in tables:
        accent = ACCENT if master else CYAN
        ax.add_patch(FancyBboxPatch(
            (x, y), w, h,
            boxstyle="round,pad=0.04,rounding_size=0.12",
            facecolor=SURFACE, edgecolor=accent, linewidth=1.3,
        ))
        # Header
        ax.add_patch(FancyBboxPatch(
            (x, y + h - 0.4), w, 0.4,
            boxstyle="round,pad=0.02,rounding_size=0.08",
            facecolor=accent, edgecolor="none", alpha=0.18,
        ))
        ax.text(x + w / 2, y + h - 0.18, name,
                color=accent, fontsize=10, fontweight="bold",
                ha="center", va="center", family="monospace")
        # Columns
        for i, col in enumerate(cols):
            ax.text(x + 0.12, y + h - 0.6 - i * 0.22, col,
                    color=TEXT, fontsize=7, family="monospace",
                    ha="left", va="center")

    # FK vazby (jen vybrané, hlavní)
    fks = [
        # (from xy, to xy)
        ((11.0, 9.65), (10.7, 9.65)),                  # sub_departments → departments
        ((4.0, 6.0), (3.7, 6.0)),                      # staff → operating_rooms (doctor/nurse FK)
        ((7.7, 6.7), (3.7, 6.7)),                      # workflow_statuses ← operating_rooms
        ((11.0, 6.0), (10.7, 6.0)),                    # schedules → operating_rooms (přes department)
        ((1.5, 5.0), (1.5, 5.0)),                      # placeholder
        ((2.0, 5.0), (5.7, 4.5)),                      # operating_rooms → shift_schedules
        ((5.7, 5.0), (5.7, 5.0)),                      # placeholder
        ((4.0, 3.6), (3.7, 4.5)),                      # room_status_history → operating_rooms
        ((11.0, 3.6), (10.7, 4.5)),                    # notifications_log → operating_rooms
        ((1.5, 0.9), (1.5, 5.4)),                      # equipment → operating_rooms
    ]
    for a, b in fks:
        arrow = FancyArrowPatch(
            a, b,
            arrowstyle="-|>,head_length=0.18,head_width=0.12",
            color=ACCENT_DIM, linewidth=0.9, alpha=0.55,
            connectionstyle="arc3,rad=-0.18",
        )
        ax.add_patch(arrow)

    ax.text(7, 10.7, "DATABÁZOVÉ SCHÉMA — SUPABASE POSTGRES",
            color=ACCENT, fontsize=14, fontweight="bold", ha="center")
    ax.text(7, 10.4, "15 tabulek · RLS na všech tabulkách · 4 policies / tabulka",
            color=TEXT_DIM, fontsize=9, ha="center", style="italic")

    legend_handles = [
        Line2D([0], [0], marker="s", color="none",
               markerfacecolor=ACCENT, markersize=11, label="Master (kmenová) tabulka"),
        Line2D([0], [0], marker="s", color="none",
               markerfacecolor=CYAN, markersize=11, label="Pohybová / vztahová"),
    ]
    legend = ax.legend(
        handles=legend_handles, loc="lower right", bbox_to_anchor=(0.99, -0.02),
        frameon=True, facecolor=SURFACE, edgecolor=BORDER, labelcolor=TEXT,
        fontsize=8,
    )

    fig.tight_layout()
    fig.savefig(out_path, facecolor=BG, edgecolor="none", bbox_inches="tight")
    plt.close(fig)


# ============================================================================
# Diagram 4 — Workflow operace (state machine)
# ============================================================================

def render_workflow_diagram(out_path: Path) -> None:
    fig, ax = _new_figure(14, 6.5)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 6)

    steps = [
        ("Sál připraven", "#6B7280", "Vedoucí sestra"),
        ("Příjezd na sál", "#8B5CF6", "Příjmový tým"),
        ("Začátek anestezie", "#EC4899", "Anesteziolog"),
        ("Chirurgický výkon", "#EF4444", "Chirurg"),
        ("Ukončení výkonu", "#F59E0B", "Chirurg"),
        ("Ukončení anestezie", "#A855F7", "Anesteziolog"),
        ("Odjezd ze sálu", "#10B981", "Příjmový tým"),
        ("Úklid sálu", "#F97316", "Sanitární tým"),
    ]
    n = len(steps)
    spacing = 14 / (n + 0.5)

    for i, (name, color, organizer) in enumerate(steps):
        x = 0.6 + i * spacing
        y = 3.5
        # Step bubble
        ax.add_patch(FancyBboxPatch(
            (x - 0.7, y - 0.55), 1.4, 1.1,
            boxstyle="round,pad=0.02,rounding_size=0.18",
            facecolor=color, edgecolor=color, alpha=0.25, linewidth=1.4,
        ))
        ax.text(x, y + 0.18, str(i), color=color, fontsize=14,
                fontweight="bold", ha="center", va="center")
        ax.text(x, y - 0.22, name, color=TEXT, fontsize=7,
                ha="center", va="center", wrap=True)
        # Organizer below
        ax.text(x, y - 0.95, organizer, color=TEXT_DIM, fontsize=6.5,
                ha="center", va="center", style="italic")
        # Arrow to next
        if i < n - 1:
            arrow = FancyArrowPatch(
                (x + 0.72, y), (x + spacing - 0.72, y),
                arrowstyle="->,head_length=0.2,head_width=0.15",
                color=ACCENT_DIM, linewidth=1.2, alpha=0.8,
            )
            ax.add_patch(arrow)

    # Special statuses (bottom row)
    special = [
        ("Pauza", "#22D3EE", "Tlačítko"),
        ("Hygienický režim", "#FBBF24", "Tlačítko"),
        ("Volání pacienta", "#3B82F6", "Tlačítko"),
        ("Příjezd do traktu", "#06B6D4", "Tlačítko"),
    ]
    for i, (name, color, kind) in enumerate(special):
        x = 1.5 + i * 3.0
        y = 1.2
        ax.add_patch(FancyBboxPatch(
            (x - 1.0, y - 0.4), 2.0, 0.85,
            boxstyle="round,pad=0.02,rounding_size=0.15",
            facecolor=color, edgecolor=color, alpha=0.16, linewidth=1.0,
        ))
        ax.text(x, y + 0.1, name, color=color, fontsize=8.5,
                fontweight="bold", ha="center", va="center")
        ax.text(x, y - 0.22, kind, color=TEXT_DIM, fontsize=7,
                ha="center", va="center", style="italic")

    ax.text(7, 5.8, "WORKFLOW OPERACE — 8 STAVŮ + 4 SPECIÁLNÍ",
            color=ACCENT, fontsize=14, fontweight="bold", ha="center")
    ax.text(7, 5.45, "Sekvenční přechody mezi stavy · speciální stavy spuštěné tlačítky paralelně",
            color=TEXT_DIM, fontsize=9, ha="center", style="italic")

    ax.text(7, 0.3,
            "Každý přechod loguje záznam do tabulky room_status_history (timestamp, duration, metadata)",
            color=TEXT_DIM, fontsize=8, ha="center", style="italic")

    fig.tight_layout()
    fig.savefig(out_path, facecolor=BG, edgecolor="none", bbox_inches="tight")
    plt.close(fig)


# ============================================================================
# Diagram 5 — Auth flow
# ============================================================================

def render_auth_flow(out_path: Path) -> None:
    fig, ax = _new_figure(13, 7)
    ax.set_xlim(0, 13)
    ax.set_ylim(0, 7)

    # Sloupce: Browser, Next.js Server, Supabase
    cols = [
        (1.5, "BROWSER", BLUE),
        (6.5, "NEXT.JS SERVER", ACCENT),
        (11.5, "SUPABASE", GREEN),
    ]
    for x, label, color in cols:
        ax.add_patch(FancyBboxPatch(
            (x - 1.5, 5.8), 3.0, 0.8,
            boxstyle="round,pad=0.05,rounding_size=0.15",
            facecolor=color, edgecolor=color, alpha=0.18, linewidth=1.4,
        ))
        ax.text(x, 6.2, label, color=color, fontsize=11,
                fontweight="bold", ha="center", va="center")
        # Vertical line
        ax.plot([x, x], [0.5, 5.8], color=color, alpha=0.18, linewidth=1.0, linestyle=":")

    # Steps: (y, from_x, to_x, label, color)
    steps = [
        (5.3, 1.5, 6.5, "POST /api/auth/login (email, password)", ACCENT),
        (4.7, 6.5, 11.5, "SELECT * FROM app_users WHERE email = ?", GREEN),
        (4.1, 11.5, 6.5, "user row + password_hash", GREEN),
        (3.5, 6.5, 6.5, "bcrypt.compare(password, hash)", ACCENT),
        (2.9, 6.5, 6.5, "createSession() → JWT signed", ACCENT),
        (2.3, 6.5, 1.5, "Set-Cookie: session=JWT (HttpOnly, Secure)", BLUE),
        (1.7, 1.5, 6.5, "GET /api/auth/me (cookie sent automatically)", BLUE),
        (1.1, 6.5, 1.5, "{ user: { id, email, role } }", ACCENT),
    ]
    for y, fx, tx, label, color in steps:
        if fx == tx:
            # self-loop
            ax.add_patch(FancyArrowPatch(
                (fx + 0.5, y + 0.15), (fx + 0.5, y - 0.15),
                connectionstyle="arc3,rad=2.0",
                arrowstyle="->,head_length=0.18,head_width=0.13",
                color=color, linewidth=1.3,
            ))
            ax.text(fx + 0.65, y, label, color=TEXT, fontsize=8,
                    ha="left", va="center", family="monospace")
        else:
            arrow = FancyArrowPatch(
                (fx, y), (tx, y),
                arrowstyle="->,head_length=0.22,head_width=0.16",
                color=color, linewidth=1.4,
            )
            ax.add_patch(arrow)
            mid = (fx + tx) / 2
            ax.text(mid, y + 0.18, label, color=TEXT, fontsize=8,
                    ha="center", va="bottom", family="monospace")

    ax.text(6.5, 6.75, "AUTENTIZAČNÍ TOK — BCRYPT + HTTPONLY SESSION COOKIE",
            color=ACCENT, fontsize=13, fontweight="bold", ha="center")

    ax.text(6.5, 0.25,
            "Session cookie nelze přečíst z JavaScriptu (XSS-safe) · CSRF chráněno SameSite=Lax",
            color=TEXT_DIM, fontsize=8.5, ha="center", style="italic")

    fig.tight_layout()
    fig.savefig(out_path, facecolor=BG, edgecolor="none", bbox_inches="tight")
    plt.close(fig)


# ============================================================================
# Entry
# ============================================================================

def render_all(out_dir: Path) -> dict[str, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = {
        "architecture": out_dir / "architecture.png",
        "dependencies": out_dir / "dependencies.png",
        "db_schema": out_dir / "db_schema.png",
        "workflow": out_dir / "workflow.png",
        "auth_flow": out_dir / "auth_flow.png",
    }
    print("[v0] Rendering architecture diagram...")
    render_architecture(paths["architecture"])
    print("[v0] Rendering dependency graph...")
    render_dependency_graph(paths["dependencies"])
    print("[v0] Rendering DB schema...")
    render_db_schema(paths["db_schema"])
    print("[v0] Rendering workflow state machine...")
    render_workflow_diagram(paths["workflow"])
    print("[v0] Rendering auth flow...")
    render_auth_flow(paths["auth_flow"])
    return paths


if __name__ == "__main__":
    out = Path(os.environ.get("ORM_DIAGRAM_DIR", "/tmp/orm-diagrams"))
    paths = render_all(out)
    for k, p in paths.items():
        print(f"[v0] {k}: {p}")
