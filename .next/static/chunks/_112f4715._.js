(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/types.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_WEEKLY_SCHEDULE",
    ()=>DEFAULT_WEEKLY_SCHEDULE,
    "DEFAULT_WORKING_HOURS",
    ()=>DEFAULT_WORKING_HOURS,
    "RoomStatus",
    ()=>RoomStatus
]);
var RoomStatus = /*#__PURE__*/ function(RoomStatus) {
    RoomStatus["FREE"] = "FREE";
    RoomStatus["BUSY"] = "BUSY";
    RoomStatus["CLEANING"] = "CLEANING";
    RoomStatus["MAINTENANCE"] = "MAINTENANCE";
    return RoomStatus;
}({});
const DEFAULT_WORKING_HOURS = {
    enabled: true,
    startHour: 7,
    startMinute: 0,
    endHour: 15,
    endMinute: 30
};
const DEFAULT_WEEKLY_SCHEDULE = {
    monday: {
        ...DEFAULT_WORKING_HOURS
    },
    tuesday: {
        ...DEFAULT_WORKING_HOURS
    },
    wednesday: {
        ...DEFAULT_WORKING_HOURS
    },
    thursday: {
        ...DEFAULT_WORKING_HOURS
    },
    friday: {
        ...DEFAULT_WORKING_HOURS
    },
    saturday: {
        enabled: false,
        startHour: 7,
        startMinute: 0,
        endHour: 12,
        endMinute: 0
    },
    sunday: {
        enabled: false,
        startHour: 7,
        startMinute: 0,
        endHour: 12,
        endMinute: 0
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/constants.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_DEPARTMENTS",
    ()=>DEFAULT_DEPARTMENTS,
    "MOCK_ROOMS",
    ()=>MOCK_ROOMS,
    "SIDEBAR_ITEMS",
    ()=>SIDEBAR_ITEMS,
    "SPECIAL_STATUSES",
    ()=>SPECIAL_STATUSES,
    "STEP_COLORS",
    ()=>STEP_COLORS,
    "STEP_DURATIONS",
    ()=>STEP_DURATIONS,
    "WORKFLOW_STEPS",
    ()=>WORKFLOW_STEPS
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/types.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.454.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/user.js [app-client] (ecmascript) <export default as User>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$grid$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutGrid$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.454.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/layout-grid.js [app-client] (ecmascript) <export default as LayoutGrid>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$days$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarDays$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.454.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/calendar-days.js [app-client] (ecmascript) <export default as CalendarDays>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.454.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/settings.js [app-client] (ecmascript) <export default as Settings>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.454.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/activity.js [app-client] (ecmascript) <export default as Activity>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.454.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-client] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.454.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/user-check.js [app-client] (ecmascript) <export default as UserCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$syringe$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Syringe$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.454.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/syringe.js [app-client] (ecmascript) <export default as Syringe>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$scissors$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Scissors$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.454.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/scissors.js [app-client] (ecmascript) <export default as Scissors>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$star$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Star$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.454.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/star.js [app-client] (ecmascript) <export default as Star>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.454.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/sparkles.js [app-client] (ecmascript) <export default as Sparkles>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.454.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/chart-column.js [app-client] (ecmascript) <export default as BarChart3>");
;
;
const DEFAULT_DEPARTMENTS = [
    {
        id: 'tra',
        name: 'Traumatologie',
        description: 'Léčba úrazů a poranění',
        isActive: true,
        subDepartments: [],
        accentColor: '#00D8C1'
    },
    {
        id: 'chir',
        name: 'Chirurgie',
        description: 'Chirurgické výkony',
        isActive: true,
        subDepartments: [
            {
                id: 'chir-hpb',
                name: 'HPB (játra, pankreas, žlučník)',
                isActive: true
            },
            {
                id: 'chir-cevni',
                name: 'Cévní chirurgie',
                isActive: true
            },
            {
                id: 'chir-detske',
                name: 'Dětská chirurgie',
                isActive: true
            },
            {
                id: 'chir-mammo',
                name: 'Mammo chirurgie',
                isActive: true
            },
            {
                id: 'chir-prokto',
                name: 'Proktochirurgie',
                isActive: true
            }
        ],
        accentColor: '#7C3AED'
    },
    {
        id: 'neurochir',
        name: 'Neurochirurgie',
        description: 'Chirurgie nervové soustavy',
        isActive: true,
        subDepartments: [],
        accentColor: '#06B6D4'
    },
    {
        id: 'uro',
        name: 'Urologie',
        description: 'Léčba urogenitálního systému',
        isActive: true,
        subDepartments: [],
        accentColor: '#EC4899'
    },
    {
        id: 'gyn',
        name: 'Gynekologie',
        description: 'Gynekologické výkony',
        isActive: true,
        subDepartments: [],
        accentColor: '#F59E0B'
    },
    {
        id: 'orl',
        name: 'ORL',
        description: 'Otolaryngologie',
        isActive: true,
        subDepartments: [],
        accentColor: '#3B82F6'
    },
    {
        id: 'oftalmologie',
        name: 'Oftalmologie',
        description: 'Oční lékařství',
        isActive: true,
        subDepartments: [],
        accentColor: '#8B5CF6'
    },
    {
        id: 'ortopedicka',
        name: 'Ortopedická chirurgie',
        description: 'Ortopedické výkony',
        isActive: true,
        subDepartments: [],
        accentColor: '#14B8A6'
    }
];
const WORKFLOW_STEPS = [
    {
        name: "Sál připraven",
        title: "Sál připraven",
        organizer: "Vedoucí sestra",
        status: "Připraven",
        color: '#6B7280',
        Icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"]
    },
    {
        name: "Příjezd na sál",
        title: "Příjezd na sál",
        organizer: "Příjmový tým",
        status: "Na sále",
        color: '#8B5CF6',
        Icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserCheck$3e$__["UserCheck"]
    },
    {
        name: "Začátek anestezie",
        title: "Začátek anestezie",
        organizer: "Anesteziolog",
        status: "Anestezie",
        color: '#EC4899',
        Icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$syringe$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Syringe$3e$__["Syringe"]
    },
    {
        name: "Začátek chirurgického výkonu",
        title: "Chirurgický výkon",
        organizer: "Chirurg",
        status: "Operace",
        color: '#EF4444',
        Icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$scissors$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Scissors$3e$__["Scissors"]
    },
    {
        name: "Ukončení chirurgického výkonu",
        title: "Ukončení výkonu",
        organizer: "Chirurg",
        status: "Dokončování",
        color: '#F59E0B',
        Icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$star$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Star$3e$__["Star"]
    },
    {
        name: "Ukončení anestezie",
        title: "Ukončení anestezie",
        organizer: "Anesteziolog",
        status: "Probouzení",
        color: '#A855F7',
        Icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"]
    },
    {
        name: "Odjezd ze sálu",
        title: "Odjezd ze sálu",
        organizer: "Příjmový tým",
        status: "Odjezd",
        color: '#10B981',
        Icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"]
    },
    {
        name: "Úklid sálu",
        title: "Úklid sálu",
        organizer: "Sanitární tým",
        status: "Úklid",
        color: '#F97316',
        Icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"]
    }
];
const SPECIAL_STATUSES = [
    {
        id: "status-pause",
        name: "Pauza",
        color: '#22D3EE',
        icon: 'Pause',
        special_type: 'pause'
    },
    {
        id: "status-hygiene",
        name: "Hygienický režim",
        color: '#FBBF24',
        icon: 'Shield',
        special_type: 'hygiene'
    },
    {
        id: "status-patient-called",
        name: "Volání pacienta",
        color: '#3B82F6',
        icon: 'Phone',
        special_type: 'patient_called'
    },
    {
        id: "status-patient-tract",
        name: "Příjezd do operačního traktu",
        color: '#06B6D4',
        icon: 'Building',
        special_type: 'patient_arrived_tract'
    }
];
const STEP_DURATIONS = [
    0,
    5,
    20,
    60,
    10,
    15,
    10,
    15
];
const STEP_COLORS = {
    0: {
        bg: 'rgba(107,114,128,0.15)',
        fill: 'rgba(107,114,128,0.35)',
        border: 'rgba(107,114,128,0.25)',
        text: '#6B7280',
        glow: 'rgba(107,114,128,0.2)',
        solid: '#6B7280'
    },
    1: {
        bg: 'rgba(139,92,246,0.15)',
        fill: 'rgba(139,92,246,0.35)',
        border: 'rgba(139,92,246,0.25)',
        text: '#8B5CF6',
        glow: 'rgba(139,92,246,0.2)',
        solid: '#8B5CF6'
    },
    2: {
        bg: 'rgba(236,72,153,0.15)',
        fill: 'rgba(236,72,153,0.35)',
        border: 'rgba(236,72,153,0.25)',
        text: '#EC4899',
        glow: 'rgba(236,72,153,0.2)',
        solid: '#EC4899'
    },
    3: {
        bg: 'rgba(239,68,68,0.15)',
        fill: 'rgba(239,68,68,0.35)',
        border: 'rgba(239,68,68,0.25)',
        text: '#EF4444',
        glow: 'rgba(239,68,68,0.2)',
        solid: '#EF4444'
    },
    4: {
        bg: 'rgba(245,158,11,0.15)',
        fill: 'rgba(245,158,11,0.35)',
        border: 'rgba(245,158,11,0.25)',
        text: '#F59E0B',
        glow: 'rgba(245,158,11,0.2)',
        solid: '#F59E0B'
    },
    5: {
        bg: 'rgba(168,85,247,0.15)',
        fill: 'rgba(168,85,247,0.35)',
        border: 'rgba(168,85,247,0.25)',
        text: '#A855F7',
        glow: 'rgba(168,85,247,0.2)',
        solid: '#A855F7'
    },
    6: {
        bg: 'rgba(16,185,129,0.15)',
        fill: 'rgba(16,185,129,0.35)',
        border: 'rgba(16,185,129,0.25)',
        text: '#10B981',
        glow: 'rgba(16,185,129,0.2)',
        solid: '#10B981'
    },
    7: {
        bg: 'rgba(249,115,22,0.15)',
        fill: 'rgba(249,115,22,0.35)',
        border: 'rgba(249,115,22,0.25)',
        text: '#F97316',
        glow: 'rgba(249,115,22,0.2)',
        solid: '#F97316'
    }
};
const SIDEBAR_ITEMS = [
    {
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$grid$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutGrid$3e$__["LayoutGrid"],
        label: 'Přehled',
        id: 'dashboard'
    },
    {
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$days$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarDays$3e$__["CalendarDays"],
        label: 'Timeline',
        id: 'timeline'
    },
    {
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__["BarChart3"],
        label: 'Statistiky',
        id: 'statistics'
    },
    {
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__["User"],
        label: 'Personál',
        id: 'staff'
    },
    {
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"],
        label: 'Upozornění',
        id: 'alerts'
    },
    {
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"],
        label: 'Nastavení',
        id: 'settings'
    }
];
const MOCK_ROOMS = [
    {
        id: '1',
        name: 'Sál č. 1',
        department: 'TRA',
        status: __TURBOPACK__imported__module__$5b$project$5d2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RoomStatus"].BUSY,
        queueCount: 0,
        operations24h: 4,
        currentStepIndex: 3,
        isEmergency: false,
        isLocked: false,
        estimatedEndTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        staff: {
            doctor: {
                name: 'MUDr. Procházka',
                role: 'DOCTOR'
            },
            nurse: {
                name: 'Bc. Veselá',
                role: 'NURSE'
            },
            anesthesiologist: {
                name: 'MUDr. Jelínek',
                role: 'ANESTHESIOLOGIST'
            }
        },
        currentPatient: {
            name: 'Eva Nováková',
            id: '755210/5678',
            age: 48,
            bloodType: 'B-'
        },
        currentProcedure: {
            name: 'Artroskopie ramene',
            startTime: '08:00',
            estimatedDuration: 120,
            progress: 75
        }
    },
    {
        id: '2',
        name: 'Sál č. 2',
        department: 'CHIR',
        status: __TURBOPACK__imported__module__$5b$project$5d2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RoomStatus"].BUSY,
        queueCount: 1,
        operations24h: 6,
        currentStepIndex: 4,
        isEmergency: false,
        isLocked: false,
        staff: {
            doctor: {
                name: 'MUDr. Svoboda',
                role: 'DOCTOR'
            },
            nurse: {
                name: 'Bc. Malá',
                role: 'NURSE'
            },
            anesthesiologist: {
                name: 'MUDr. Černý',
                role: 'ANESTHESIOLOGIST'
            }
        },
        currentPatient: {
            name: 'Jan Novotný',
            id: '850102/1234',
            age: 42,
            bloodType: 'A+'
        },
        currentProcedure: {
            name: 'Laparoskopická cholecystektomie',
            startTime: '10:00',
            estimatedDuration: 90,
            progress: 90
        }
    },
    {
        id: '3',
        name: 'Sál č. 3',
        department: 'TRA',
        status: __TURBOPACK__imported__module__$5b$project$5d2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RoomStatus"].FREE,
        queueCount: 0,
        operations24h: 3,
        currentStepIndex: 0,
        isEmergency: false,
        isLocked: false,
        staff: {
            doctor: {
                name: 'MUDr. Kučera',
                role: 'DOCTOR'
            },
            nurse: {
                name: 'Bc. Horáková',
                role: 'NURSE'
            },
            anesthesiologist: {
                name: 'MUDr. Černý',
                role: 'ANESTHESIOLOGIST'
            }
        },
        currentPatient: {
            name: 'Pavel Černý',
            id: '680315/4321',
            age: 56,
            bloodType: 'O+'
        },
        currentProcedure: {
            name: 'Náhrada kyčelního kloubu',
            startTime: '09:30',
            estimatedDuration: 180,
            progress: 0
        }
    },
    {
        id: '4',
        name: 'Sál č. 4',
        department: 'CHIR',
        status: __TURBOPACK__imported__module__$5b$project$5d2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RoomStatus"].FREE,
        queueCount: 0,
        operations24h: 5,
        currentStepIndex: 0,
        isEmergency: false,
        isLocked: false,
        staff: {
            doctor: {
                name: 'MUDr. Zeman',
                role: 'DOCTOR'
            },
            nurse: {
                name: 'Bc. Králová',
                role: 'NURSE'
            },
            anesthesiologist: {
                name: 'MUDr. Kovář',
                role: 'ANESTHESIOLOGIST'
            }
        },
        currentPatient: {
            name: 'Lucie Bílá',
            id: '905525/6789',
            age: 33,
            bloodType: 'A-'
        },
        currentProcedure: {
            name: 'Operace štítné žlázy',
            startTime: '11:00',
            estimatedDuration: 150,
            progress: 0
        }
    },
    {
        id: '5',
        name: 'Sál č. 5',
        department: 'CHIR',
        status: __TURBOPACK__imported__module__$5b$project$5d2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RoomStatus"].FREE,
        queueCount: 0,
        operations24h: 2,
        currentStepIndex: 0,
        isEmergency: false,
        isLocked: false,
        staff: {
            doctor: {
                name: 'MUDr. Svoboda',
                role: 'DOCTOR'
            },
            nurse: {
                name: 'Bc. Malá',
                role: 'NURSE'
            },
            anesthesiologist: {
                name: 'MUDr. Marek',
                role: 'ANESTHESIOLOGIST'
            }
        },
        currentPatient: {
            name: 'Karel Vorel',
            id: '550101/1122',
            age: 69,
            bloodType: 'AB+'
        },
        currentProcedure: {
            name: 'Bypass koronární arterie',
            startTime: '07:45',
            estimatedDuration: 360,
            progress: 0
        }
    },
    {
        id: '6',
        name: 'DaVinci',
        department: 'ROBOT',
        status: __TURBOPACK__imported__module__$5b$project$5d2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RoomStatus"].FREE,
        queueCount: 0,
        operations24h: 3,
        currentStepIndex: 0,
        isEmergency: false,
        isLocked: false,
        staff: {
            doctor: {
                name: 'MUDr. Novák',
                role: 'DOCTOR'
            },
            nurse: {
                name: 'Bc. Dvořáková',
                role: 'NURSE'
            },
            anesthesiologist: {
                name: 'MUDr. Kovář',
                role: 'ANESTHESIOLOGIST'
            }
        },
        currentPatient: {
            name: 'Petr Veselý',
            id: '780515/9988',
            age: 55,
            bloodType: '0-'
        },
        currentProcedure: {
            name: 'Robotická prostatektomie',
            startTime: '08:30',
            estimatedDuration: 240,
            progress: 0
        }
    },
    {
        id: '7',
        name: 'Sál č. 7',
        department: 'URO',
        status: __TURBOPACK__imported__module__$5b$project$5d2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RoomStatus"].FREE,
        queueCount: 0,
        operations24h: 4,
        currentStepIndex: 0,
        isEmergency: false,
        isLocked: false,
        staff: {
            doctor: {
                name: 'MUDr. Fiala',
                role: 'DOCTOR'
            },
            nurse: {
                name: 'Bc. Pokorná',
                role: 'NURSE'
            },
            anesthesiologist: {
                name: 'MUDr. Černý',
                role: 'ANESTHESIOLOGIST'
            }
        },
        currentPatient: {
            name: 'Martin Dlouhý',
            id: '820818/7766',
            age: 41,
            bloodType: 'O-'
        },
        currentProcedure: {
            name: 'Nefrektomie',
            startTime: '12:00',
            estimatedDuration: 200,
            progress: 0
        }
    },
    {
        id: '8',
        name: 'Sál č. 8',
        department: 'ORL',
        status: __TURBOPACK__imported__module__$5b$project$5d2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RoomStatus"].FREE,
        queueCount: 0,
        operations24h: 8,
        currentStepIndex: 0,
        isEmergency: false,
        isLocked: false,
        staff: {
            doctor: {
                name: 'MUDr. Krátký',
                role: 'DOCTOR'
            },
            nurse: {
                name: 'Bc. Jelínková',
                role: 'NURSE'
            },
            anesthesiologist: {
                name: 'MUDr. Kovář',
                role: 'ANESTHESIOLOGIST'
            }
        },
        currentPatient: {
            name: 'Jana Malá',
            id: '056012/3344',
            age: 18,
            bloodType: 'A+'
        },
        currentProcedure: {
            name: 'Tonzilektomie',
            startTime: '13:00',
            estimatedDuration: 60,
            progress: 0
        }
    },
    {
        id: '9',
        name: 'Sál č. 9',
        department: 'CÉVNÍ',
        status: __TURBOPACK__imported__module__$5b$project$5d2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RoomStatus"].FREE,
        queueCount: 0,
        operations24h: 4,
        currentStepIndex: 0,
        isEmergency: false,
        isLocked: false,
        staff: {
            doctor: {
                name: 'MUDr. Beneš',
                role: 'DOCTOR'
            },
            nurse: {
                name: 'Bc. Dvořáková',
                role: 'NURSE'
            },
            anesthesiologist: {
                name: 'MUDr. Veselý',
                role: 'ANESTHESIOLOGIST'
            }
        },
        currentPatient: {
            name: 'František Vlk',
            id: '491102/4455',
            age: 74,
            bloodType: 'B+'
        },
        currentProcedure: {
            name: 'Endarterektomie karotidy',
            startTime: '10:30',
            estimatedDuration: 120,
            progress: 0
        }
    },
    {
        id: '10',
        name: 'Sál č. 10',
        department: 'HPB + PLICNÍ',
        status: __TURBOPACK__imported__module__$5b$project$5d2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RoomStatus"].FREE,
        queueCount: 0,
        operations24h: 3,
        currentStepIndex: 0,
        isEmergency: false,
        isLocked: false,
        staff: {
            doctor: {
                name: 'MUDr. Horáková',
                role: 'DOCTOR'
            },
            nurse: {
                name: 'Bc. Králová',
                role: 'NURSE'
            },
            anesthesiologist: {
                name: 'MUDr. Kovář',
                role: 'ANESTHESIOLOGIST'
            }
        },
        currentPatient: {
            name: 'Jana Rychlá',
            id: '505101/0011',
            age: 73,
            bloodType: 'B+'
        },
        currentProcedure: {
            name: 'Resekce jater',
            startTime: '09:15',
            estimatedDuration: 300,
            progress: 0
        }
    },
    {
        id: '11',
        name: 'Sál č. 11',
        department: 'DĚTSKÉ',
        status: __TURBOPACK__imported__module__$5b$project$5d2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RoomStatus"].FREE,
        queueCount: 0,
        operations24h: 9,
        currentStepIndex: 0,
        isEmergency: false,
        isLocked: false,
        staff: {
            doctor: {
                name: 'MUDr. Růžička',
                role: 'DOCTOR'
            },
            nurse: {
                name: 'Bc. Holá',
                role: 'NURSE'
            },
            anesthesiologist: {
                name: 'MUDr. Marek',
                role: 'ANESTHESIOLOGIST'
            }
        },
        currentPatient: {
            name: 'Anna Poláková',
            id: '185405/7890',
            age: 5,
            bloodType: 'O+'
        },
        currentProcedure: {
            name: 'Operace tříselné kýly',
            startTime: '14:00',
            estimatedDuration: 45,
            progress: 0
        }
    },
    {
        id: '12',
        name: 'Sál č. 12',
        department: 'MAMMO',
        status: __TURBOPACK__imported__module__$5b$project$5d2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RoomStatus"].FREE,
        queueCount: 0,
        operations24h: 7,
        currentStepIndex: 0,
        isEmergency: false,
        isLocked: false,
        staff: {
            doctor: {
                name: 'MUDr. Horáková',
                role: 'DOCTOR'
            },
            nurse: {
                name: 'Bc. Nová',
                role: 'NURSE'
            },
            anesthesiologist: {
                name: 'MUDr. Jelínek',
                role: 'ANESTHESIOLOGIST'
            }
        },
        currentPatient: {
            name: 'Marie Kopecká',
            id: '655903/1212',
            age: 58,
            bloodType: 'A+'
        },
        currentProcedure: {
            name: 'Lumpektomie',
            startTime: '08:45',
            estimatedDuration: 90,
            progress: 0
        }
    }
];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/supabase.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isSupabaseConfigured",
    ()=>isSupabaseConfigured,
    "supabase",
    ()=>supabase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.14_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$supabase$2d$js$40$2$2e$101$2e$1$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@supabase+supabase-js@2.101.1/node_modules/@supabase/supabase-js/dist/index.mjs [app-client] (ecmascript) <locals>");
;
// For Next.js, environment variables are accessed via process.env
// Supabase integration provides NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseUrl = ("TURBOPACK compile-time value", "https://krljrxescufmdtfvlaqm.supabase.co") || '';
const supabaseAnonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtybGpyeGVzY3VmbWR0ZnZsYXFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTY4NDksImV4cCI6MjA4ODM5Mjg0OX0._PNxW7Hw5BRi4CD8Xz7FuQdneYeBNKJpe5pkTLvM5wU") || '';
const supabase = ("TURBOPACK compile-time truthy", 1) ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$supabase$2d$js$40$2$2e$101$2e$1$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseAnonKey) : "TURBOPACK unreachable";
const isSupabaseConfigured = !!supabase;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/db.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "fetchBackgroundSettings",
    ()=>fetchBackgroundSettings,
    "fetchCompletedOperationsForDay",
    ()=>fetchCompletedOperationsForDay,
    "fetchOperatingRooms",
    ()=>fetchOperatingRooms,
    "fetchRoomStatistics",
    ()=>fetchRoomStatistics,
    "fetchStatusHistory",
    ()=>fetchStatusHistory,
    "recordStatusEvent",
    ()=>recordStatusEvent,
    "saveBackgroundSettings",
    ()=>saveBackgroundSettings,
    "subscribeToOperatingRooms",
    ()=>subscribeToOperatingRooms,
    "transformSingleRoom",
    ()=>transformSingleRoom,
    "updateOperatingRoom",
    ()=>updateOperatingRoom
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/types.ts [app-client] (ecmascript)");
;
;
// Transform DB row to app type
function transformRoom(row, staffMap, patientMap, procedureMap) {
    const doctor = row.doctor_id ? staffMap.get(row.doctor_id) : null;
    const nurse = row.nurse_id ? staffMap.get(row.nurse_id) : null;
    const anesthesiologist = row.anesthesiologist_id ? staffMap.get(row.anesthesiologist_id) : null;
    const patient = row.current_patient_id ? patientMap.get(row.current_patient_id) : null;
    const procedure = row.current_procedure_id ? procedureMap.get(row.current_procedure_id) : null;
    return {
        id: row.id,
        name: row.name,
        department: row.department,
        status: row.status || __TURBOPACK__imported__module__$5b$project$5d2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RoomStatus"].FREE,
        queueCount: row.queue_count,
        operations24h: row.operations_24h,
        isSeptic: row.is_septic,
        isEmergency: row.is_emergency,
        isEnhancedHygiene: row.is_enhanced_hygiene,
        isPaused: row.is_paused,
        patientCalledAt: row.patient_called_at,
        patientArrivedAt: row.patient_arrived_at,
        phaseStartedAt: row.phase_started_at,
        operationStartedAt: row.operation_started_at,
        statusHistory: row.status_history || [],
        completedOperations: row.completed_operations || [],
        isLocked: row.is_locked,
        currentStepIndex: row.current_step_index,
        estimatedEndTime: row.estimated_end_time || undefined,
        weeklySchedule: row.weekly_schedule,
        staff: {
            doctor: {
                name: (doctor === null || doctor === void 0 ? void 0 : doctor.name) || null,
                role: 'DOCTOR'
            },
            nurse: {
                name: (nurse === null || nurse === void 0 ? void 0 : nurse.name) || null,
                role: 'NURSE'
            },
            anesthesiologist: anesthesiologist ? {
                name: anesthesiologist.name,
                role: 'ANESTHESIOLOGIST'
            } : undefined
        },
        currentPatient: patient ? {
            id: patient.id,
            name: patient.name,
            age: patient.age,
            bloodType: patient.blood_type || undefined
        } : undefined,
        currentProcedure: procedure ? {
            name: procedure.name,
            startTime: procedure.start_time,
            estimatedDuration: procedure.estimated_duration,
            progress: procedure.progress
        } : undefined
    };
}
async function fetchOperatingRooms() {
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isSupabaseConfigured"] || !__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"]) {
        return null;
    }
    try {
        // Fetch rooms and staff data in parallel
        const [roomsRes, staffRes] = await Promise.all([
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('operating_rooms').select('*').order('name'),
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('staff').select('*')
        ]);
        if (roomsRes.error) throw roomsRes.error;
        if (!roomsRes.data || roomsRes.data.length === 0) return null;
        // Create staff lookup map
        const staffMap = new Map();
        (staffRes.data || []).forEach((s)=>staffMap.set(s.id, s));
        // Empty maps for removed tables
        const patientMap = new Map();
        const procedureMap = new Map();
        // Transform rows
        return roomsRes.data.map((row)=>transformRoom(row, staffMap, patientMap, procedureMap));
    } catch (error) {
        console.error('[DB] Failed to fetch operating rooms:', error);
        return null;
    }
}
async function updateOperatingRoom(id, updates) {
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isSupabaseConfigured"] || !__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"]) {
        return false;
    }
    try {
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('operating_rooms').update(updates).eq('id', id);
        if (error) {
            console.error('Error updating operating room:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Error updating operating room:', err);
        return false;
    }
}
async function fetchCompletedOperationsForDay(roomId, date) {
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isSupabaseConfigured"] || !__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"]) {
        return null;
    }
    try {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('room_status_history').select('*').eq('operating_room_id', roomId).gte('timestamp', startOfDay.toISOString()).lte('timestamp', endOfDay.toISOString()).order('timestamp', {
            ascending: true
        });
        if (error) throw error;
        if (!data || data.length === 0) return [];
        // Group events into operations
        // Strategy: Look for operation_end events or "Úklid sálu" to mark end of operation
        // Then collect all events backwards to operation_start or first event
        const operations = [];
        let i = 0;
        while(i < data.length){
            const event = data[i];
            // Check if this is start of an operation (operation_start or first step_change)
            if (event.event_type === 'operation_start' || event.event_type === 'step_change' && event.step_name === 'Příjezd na sál') {
                const operationStart = i;
                let operationEnd = i;
                // Find the end of this operation (operation_end or "Úklid sálu")
                for(let j = i + 1; j < data.length; j++){
                    if (data[j].event_type === 'operation_end' || data[j].event_type === 'step_change' && data[j].step_name === 'Úklid sálu') {
                        operationEnd = j;
                        break;
                    }
                }
                // Extract events for this operation
                const operationEvents = data.slice(operationStart, operationEnd + 1);
                const op = buildCompletedOperation(operationEvents);
                if (op) {
                    operations.push(op);
                }
                // Move to next event after this operation
                i = operationEnd + 1;
            } else {
                i++;
            }
        }
        return operations;
    } catch (error) {
        console.error('[DB] Failed to fetch completed operations:', error);
        return null;
    }
}
// Build a completed operation from events
function buildCompletedOperation(events) {
    if (events.length === 0) return null;
    // Collect all step_change events as status history
    const statusHistory = events.filter((e)=>e.event_type === 'step_change' && e.step_index !== null).map((e)=>({
            stepIndex: e.step_index,
            startedAt: e.timestamp,
            color: getStepColor(e.step_index),
            stepName: e.step_name || ''
        })).sort((a, b)=>new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
    if (statusHistory.length === 0) return null;
    // Operation starts at first step_change and ends at last step_change
    const startTime = statusHistory[0].startedAt;
    const endTime = statusHistory[statusHistory.length - 1].startedAt;
    return {
        startedAt: startTime,
        endedAt: endTime,
        statusHistory
    };
}
// Get color for a step index (you can adjust these colors)
function getStepColor(stepIndex) {
    const colors = {
        0: '#6b7280',
        1: '#3b82f6',
        2: '#8b5cf6',
        3: '#ec4899',
        4: '#f59e0b',
        5: '#10b981',
        6: '#ef4444'
    };
    return colors[stepIndex] || '#6b7280';
}
function subscribeToOperatingRooms(onFullRefresh, onRoomUpdate) {
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isSupabaseConfigured"] || !__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"]) {
        return null;
    }
    const channel = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].channel('operating_rooms_realtime').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'operating_rooms'
    }, (payload)=>{
        if (payload.eventType === 'UPDATE' && payload.new && onRoomUpdate) {
            const newRecord = payload.new;
            const oldRecord = payload.old;
            // Check if staff changed - if so, do full refresh to get staff names
            // If we don't have old record (REPLICA IDENTITY not FULL), check if staff IDs exist
            let staffChanged = false;
            if (oldRecord) {
                // Compare old and new staff IDs
                staffChanged = newRecord.doctor_id !== oldRecord.doctor_id || newRecord.nurse_id !== oldRecord.nurse_id || newRecord.anesthesiologist_id !== oldRecord.anesthesiologist_id;
            } else {
                // No old record available - check if any staff field is in the payload
                // This happens when REPLICA IDENTITY is not FULL
                const changedKeys = Object.keys(payload.new);
                staffChanged = changedKeys.includes('doctor_id') || changedKeys.includes('nurse_id') || changedKeys.includes('anesthesiologist_id');
            }
            if (staffChanged) {
                // Staff changed - need full refresh to get updated staff names
                onFullRefresh();
            } else {
                // Granular update - only update the changed room
                onRoomUpdate(newRecord.id, newRecord);
            }
        } else {
            // Full refresh for INSERT/DELETE or if no granular handler
            onFullRefresh();
        }
    }).subscribe();
    return ()=>{
        channel.unsubscribe();
    };
}
function transformSingleRoom(row) {
    const result = {};
    if (row.id !== undefined) result.id = row.id;
    if (row.name !== undefined) result.name = row.name;
    if (row.department !== undefined) result.department = row.department;
    if (row.status !== undefined) result.status = row.status;
    if (row.queue_count !== undefined) result.queueCount = row.queue_count;
    if (row.operations_24h !== undefined) result.operations24h = row.operations_24h;
    if (row.is_septic !== undefined) result.isSeptic = row.is_septic;
    if (row.is_emergency !== undefined) result.isEmergency = row.is_emergency;
    if (row.is_enhanced_hygiene !== undefined) result.isEnhancedHygiene = row.is_enhanced_hygiene;
    if (row.is_paused !== undefined) result.isPaused = row.is_paused;
    if (row.patient_called_at !== undefined) result.patientCalledAt = row.patient_called_at;
    if (row.patient_arrived_at !== undefined) result.patientArrivedAt = row.patient_arrived_at;
    if (row.phase_started_at !== undefined) result.phaseStartedAt = row.phase_started_at;
    if (row.operation_started_at !== undefined) result.operationStartedAt = row.operation_started_at;
    if (row.status_history !== undefined) result.statusHistory = row.status_history || [];
    if (row.completed_operations !== undefined) result.completedOperations = row.completed_operations || [];
    if (row.is_locked !== undefined) result.isLocked = row.is_locked;
    if (row.current_step_index !== undefined) result.currentStepIndex = row.current_step_index;
    if (row.estimated_end_time !== undefined) result.estimatedEndTime = row.estimated_end_time || undefined;
    if (row.weekly_schedule !== undefined) result.weeklySchedule = row.weekly_schedule;
    return result;
}
async function recordStatusEvent(event) {
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isSupabaseConfigured"] || !__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"]) {
        return false;
    }
    try {
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('room_status_history').insert({
            operating_room_id: event.operating_room_id,
            event_type: event.event_type,
            step_index: event.step_index,
            step_name: event.step_name,
            duration_seconds: event.duration_seconds,
            timestamp: event.timestamp || new Date().toISOString(),
            metadata: event.metadata || {}
        });
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('[DB] Failed to record status event:', error);
        return false;
    }
}
async function fetchStatusHistory(options) {
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isSupabaseConfigured"] || !__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"]) {
        return null;
    }
    try {
        let query = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('room_status_history').select('*').order('timestamp', {
            ascending: false
        });
        if (options === null || options === void 0 ? void 0 : options.roomId) {
            query = query.eq('operating_room_id', options.roomId);
        }
        if ((options === null || options === void 0 ? void 0 : options.eventTypes) && options.eventTypes.length > 0) {
            query = query.in('event_type', options.eventTypes);
        }
        if (options === null || options === void 0 ? void 0 : options.fromDate) {
            query = query.gte('timestamp', options.fromDate.toISOString());
        }
        if (options === null || options === void 0 ? void 0 : options.toDate) {
            query = query.lte('timestamp', options.toDate.toISOString());
        }
        if (options === null || options === void 0 ? void 0 : options.limit) {
            query = query.limit(options.limit);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[DB] Failed to fetch status history:', error);
        return null;
    }
}
async function fetchRoomStatistics(fromDate, toDate) {
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isSupabaseConfigured"] || !__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"]) {
        return null;
    }
    try {
        const from = fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // default 30 days
        const to = toDate || new Date();
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('room_status_history').select('*').gte('timestamp', from.toISOString()).lte('timestamp', to.toISOString()).order('timestamp', {
            ascending: true
        });
        if (error) throw error;
        if (!data || data.length === 0) {
            return {
                totalOperations: 0,
                averageOperationDuration: 0,
                averageStepDurations: {},
                emergencyCount: 0,
                utilizationRate: 0,
                operationsByRoom: {},
                operationsByDay: {}
            };
        }
        // Calculate statistics
        const operationStarts = data.filter((e)=>e.event_type === 'operation_start');
        const operationEnds = data.filter((e)=>e.event_type === 'operation_end');
        const emergencyEvents = data.filter((e)=>e.event_type === 'emergency_on');
        const stepChanges = data.filter((e)=>e.event_type === 'step_change' && e.duration_seconds);
        // Total operations (completed)
        const totalOperations = operationEnds.length;
        // Average operation duration
        const durations = operationEnds.map((e)=>e.duration_seconds).filter((d)=>d !== null && d !== undefined);
        const averageOperationDuration = durations.length > 0 ? Math.round(durations.reduce((a, b)=>a + b, 0) / durations.length / 60) : 0;
        // Average step durations
        const stepDurations = {};
        stepChanges.forEach((e)=>{
            if (e.step_name && e.duration_seconds) {
                if (!stepDurations[e.step_name]) stepDurations[e.step_name] = [];
                stepDurations[e.step_name].push(e.duration_seconds);
            }
        });
        const averageStepDurations = {};
        Object.entries(stepDurations).forEach((param)=>{
            let [name, durations] = param;
            averageStepDurations[name] = Math.round(durations.reduce((a, b)=>a + b, 0) / durations.length / 60);
        });
        // Emergency count
        const emergencyCount = emergencyEvents.length;
        // Operations by room
        const operationsByRoom = {};
        operationEnds.forEach((e)=>{
            operationsByRoom[e.operating_room_id] = (operationsByRoom[e.operating_room_id] || 0) + 1;
        });
        // Operations by day
        const operationsByDay = {};
        operationEnds.forEach((e)=>{
            const day = e.timestamp.split('T')[0];
            operationsByDay[day] = (operationsByDay[day] || 0) + 1;
        });
        // Utilization rate (simplified: total operation time / total available time)
        const totalDays = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
        const totalAvailableMinutes = totalDays * 12 * 60 * 12; // 12 rooms, 12 hours/day
        const totalOperationMinutes = durations.reduce((a, b)=>a + b, 0) / 60;
        const utilizationRate = totalAvailableMinutes > 0 ? Math.round(totalOperationMinutes / totalAvailableMinutes * 100) : 0;
        return {
            totalOperations,
            averageOperationDuration,
            averageStepDurations,
            emergencyCount,
            utilizationRate,
            operationsByRoom,
            operationsByDay
        };
    } catch (error) {
        console.error('[DB] Failed to fetch room statistics:', error);
        return null;
    }
}
async function fetchBackgroundSettings() {
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isSupabaseConfigured"] || !__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"]) {
        return null;
    }
    try {
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('app_settings').select('*').eq('id', 'global').single();
        if (error || !data) {
            // Settings don't exist yet, return null
            return null;
        }
        var _data_background_opacity, _data_background_image_opacity, _data_background_image_blur;
        // Map database columns to BackgroundSettings interface
        return {
            type: data.background_type || 'linear',
            colors: data.background_colors || [
                {
                    color: '#0a0a12',
                    position: 0
                },
                {
                    color: '#1a1a2e',
                    position: 100
                }
            ],
            direction: data.background_direction || 'to bottom',
            opacity: (_data_background_opacity = data.background_opacity) !== null && _data_background_opacity !== void 0 ? _data_background_opacity : 100,
            imageUrl: data.background_image_url || '',
            imageOpacity: (_data_background_image_opacity = data.background_image_opacity) !== null && _data_background_image_opacity !== void 0 ? _data_background_image_opacity : 15,
            imageBlur: (_data_background_image_blur = data.background_image_blur) !== null && _data_background_image_blur !== void 0 ? _data_background_image_blur : 0
        };
    } catch (error) {
        console.error('[DB] Failed to fetch background settings:', error);
        return null;
    }
}
async function saveBackgroundSettings(settings) {
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isSupabaseConfigured"] || !__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"]) {
        return false;
    }
    try {
        // Map BackgroundSettings to database columns
        const dbData = {
            id: 'global',
            background_type: settings.type,
            background_colors: settings.colors,
            background_direction: settings.direction,
            background_opacity: settings.opacity,
            background_image_url: settings.imageUrl,
            background_image_opacity: settings.imageOpacity,
            background_image_blur: settings.imageBlur,
            updated_at: new Date().toISOString()
        };
        // Upsert - insert or update
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('app_settings').upsert(dbData, {
            onConflict: 'id'
        });
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('[DB] Failed to save background settings:', error);
        return false;
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/email.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Email utility - calls Supabase Edge Function to send emails via Resend
// This avoids CORS issues by routing through Supabase Edge Functions
// Supabase project URL
__turbopack_context__.s([
    "generateEmailTemplate",
    ()=>generateEmailTemplate,
    "sendBatchEmailNotifications",
    ()=>sendBatchEmailNotifications,
    "sendEmailNotification",
    ()=>sendEmailNotification
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.14_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
const SUPABASE_URL = ("TURBOPACK compile-time value", "https://krljrxescufmdtfvlaqm.supabase.co") || '';
async function sendEmailNotification(notification) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    try {
        // Encode the body as UTF-8 to handle Czech characters properly
        const bodyData = JSON.stringify({
            to: notification.to,
            subject: notification.subject,
            html: notification.html
        });
        const response = await fetch("".concat(SUPABASE_URL, "/functions/v1/send-email"), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: bodyData
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('[Email] API error:', data);
            return {
                success: false,
                error: data.error || 'Failed to send email'
            };
        }
        console.log('[Email] Email sent successfully:', data.messageId);
        return {
            success: true,
            messageId: data.messageId
        };
    } catch (error) {
        console.error('[Email] Failed to send email:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
function generateEmailTemplate(data) {
    const getRoomColor = (type)=>{
        const colors = {
            emergency_alert: '#ef4444',
            status_change: '#5B65DC',
            queue_update: '#8b5cf6',
            maintenance: '#f59e0b',
            custom: '#00D8C1'
        };
        return colors[type] || '#00D8C1';
    };
    const accentColor = getRoomColor(data.type);
    const getTypeLabel = (type)=>{
        const labels = {
            emergency_alert: 'EMERGENCY ALERT',
            status_change: 'STATUS CHANGE',
            queue_update: 'QUEUE UPDATE',
            maintenance: 'MAINTENANCE',
            custom: 'SYSTEM NOTIFICATION'
        };
        return labels[type] || 'NOTIFICATION';
    };
    let detailsHtml = '';
    if (data.details && Object.keys(data.details).length > 0) {
        detailsHtml = '\n      <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">\n        '.concat(Object.entries(data.details).map((param)=>{
            let [key, value] = param;
            return '\n          <tr>\n            <td style="padding: 12px 16px; font-size: 13px; color: rgba(255,255,255,0.5); border-bottom: 1px solid rgba(255,255,255,0.05); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">'.concat(key, '</td>\n            <td style="padding: 12px 16px; font-size: 14px; color: #ffffff; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right; font-weight: 500;">').concat(value, "</td>\n          </tr>\n        ");
        }).join(''), "\n      </table>\n    ");
    }
    return '\n    <!DOCTYPE html>\n    <html>\n      <head>\n        <meta charset="UTF-8">\n        <meta name="viewport" content="width=device-width, initial-scale=1.0">\n        <title>Operating Room Notification</title>\n      </head>\n      <body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif;">\n        \n        <!-- Outer wrapper with gradient background -->\n        <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #0a0a0a 0%, #000000 100%); min-height: 100vh;">\n          <tr>\n            <td align="center" style="padding: 40px 20px;">\n              \n              <!-- Main container -->\n              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">\n                \n                <!-- Header with accent glow -->\n                <tr>\n                  <td style="padding: 0 0 32px 0; text-align: center;">\n                    <!-- Logo area with glow effect -->\n                    <div style="display: inline-block; padding: 16px 32px; background: rgba(91, 101, 220, 0.1); border-radius: 40px; border: 1px solid rgba(91, 101, 220, 0.2);">\n                      <span style="font-size: 10px; font-weight: 800; color: #00D8C1; letter-spacing: 3px; text-transform: uppercase;">OPERATINGROOM CONTROL</span>\n                    </div>\n                  </td>\n                </tr>\n\n                <!-- Main content card -->\n                <tr>\n                  <td>\n                    <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; overflow: hidden;">\n                      \n                      <!-- Accent bar at top -->\n                      <tr>\n                        <td style="height: 4px; background: linear-gradient(90deg, '.concat(accentColor, ", ").concat(accentColor, '88);"></td>\n                      </tr>\n                      \n                      <!-- Content area -->\n                      <tr>\n                        <td style="padding: 40px;">\n                          \n                          <!-- Type badge -->\n                          <div style="margin-bottom: 24px;">\n                            <span style="display: inline-block; padding: 8px 16px; background: ').concat(accentColor, "15; border: 1px solid ").concat(accentColor, "40; border-radius: 20px; font-size: 11px; font-weight: 700; color: ").concat(accentColor, '; letter-spacing: 1.5px; text-transform: uppercase;">\n                              ').concat(getTypeLabel(data.type), '\n                            </span>\n                          </div>\n\n                          <!-- Room name -->\n                          <h1 style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1.2;">\n                            ').concat(data.roomName, '\n                          </h1>\n\n                          <!-- Message -->\n                          <p style="margin: 0; font-size: 16px; line-height: 1.7; color: rgba(255,255,255,0.7);">\n                            ').concat(data.message, "\n                          </p>\n\n                          <!-- Details table -->\n                          ").concat(detailsHtml, '\n\n                        </td>\n                      </tr>\n                    </table>\n                  </td>\n                </tr>\n\n                <!-- Footer -->\n                <tr>\n                  <td style="padding: 32px 0 0 0; text-align: center;">\n                    <p style="margin: 0 0 8px 0; font-size: 12px; color: rgba(255,255,255,0.3);">\n                      Automatic notification from Operating Room Management System\n                    </p>\n                    <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.2);">\n                      ').concat(data.timestamp || new Date().toLocaleString('cs-CZ'), "\n                    </p>\n                  </td>\n                </tr>\n\n              </table>\n            </td>\n          </tr>\n        </table>\n      </body>\n    </html>\n  ");
}
/**
 * Encode subject for email headers (handles Czech and other special characters)
 */ function encodeEmailSubject(subject) {
    // Replace Czech characters with ASCII equivalents for subject line
    const asciiMap = {
        'á': 'a',
        'č': 'c',
        'ď': 'd',
        'é': 'e',
        'ě': 'e',
        'í': 'i',
        'ň': 'n',
        'ó': 'o',
        'ř': 'r',
        'š': 's',
        'ť': 't',
        'ú': 'u',
        'ů': 'u',
        'ý': 'y',
        'ž': 'z',
        'Á': 'A',
        'Č': 'C',
        'Ď': 'D',
        'É': 'E',
        'Ě': 'E',
        'Í': 'I',
        'Ň': 'N',
        'Ó': 'O',
        'Ř': 'R',
        'Š': 'S',
        'Ť': 'T',
        'Ú': 'U',
        'Ů': 'U',
        'Ý': 'Y',
        'Ž': 'Z'
    };
    return subject.replace(/[áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/g, (char)=>asciiMap[char] || char);
}
async function sendBatchEmailNotifications(recipients, data) {
    const html = generateEmailTemplate(data);
    const errors = [];
    let sent = 0;
    let failed = 0;
    for (const recipient of recipients){
        const rawSubject = "[".concat(data.type.toUpperCase(), "] ").concat(data.roomName, " - ").concat(data.message.substring(0, 30), "...");
        const result = await sendEmailNotification({
            to: recipient,
            subject: encodeEmailSubject(rawSubject),
            html
        });
        if (result.success) {
            sent++;
        } else {
            failed++;
            if (result.error) errors.push("".concat(recipient, ": ").concat(result.error));
        }
        // Rate limiting - wait 100ms between sends
        await new Promise((resolve)=>setTimeout(resolve, 100));
    }
    return {
        sent,
        failed,
        errors
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/contexts/AuthContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.14_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.14_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function AuthProvider(param) {
    let { children } = param;
    _s();
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [modules, setModules] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    // Check for existing session on mount
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthProvider.useEffect": ()=>{
            const storedUser = localStorage.getItem('app_user');
            if (storedUser) {
                try {
                    const parsed = JSON.parse(storedUser);
                    setUser(parsed);
                } catch (e) {
                    localStorage.removeItem('app_user');
                }
            }
            setIsLoading(false);
            refreshModules();
        }
    }["AuthProvider.useEffect"], []);
    const refreshModules = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[refreshModules]": async ()=>{
            if (!__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isSupabaseConfigured"] || !__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"]) {
                // Default modules if no Supabase
                setModules([
                    {
                        id: 'dashboard',
                        name: 'Dashboard',
                        description: 'Operating rooms overview',
                        is_enabled: true,
                        icon: 'LayoutGrid',
                        accent_color: '#00D8C1',
                        sort_order: 1
                    },
                    {
                        id: 'timeline',
                        name: 'Timeline',
                        description: 'Operations timeline',
                        is_enabled: true,
                        icon: 'Calendar',
                        accent_color: '#A855F7',
                        sort_order: 2
                    },
                    {
                        id: 'statistics',
                        name: 'Statistics',
                        description: 'Statistics and analytics',
                        is_enabled: true,
                        icon: 'BarChart3',
                        accent_color: '#06B6D4',
                        sort_order: 3
                    },
                    {
                        id: 'staff',
                        name: 'Staff',
                        description: 'Staff management',
                        is_enabled: true,
                        icon: 'Users',
                        accent_color: '#10B981',
                        sort_order: 4
                    },
                    {
                        id: 'alerts',
                        name: 'Alerts',
                        description: 'Alert system',
                        is_enabled: true,
                        icon: 'Bell',
                        accent_color: '#EC4899',
                        sort_order: 5
                    },
                    {
                        id: 'settings',
                        name: 'Settings',
                        description: 'System configuration',
                        is_enabled: true,
                        icon: 'Settings',
                        accent_color: '#64748B',
                        sort_order: 6
                    }
                ]);
                return;
            }
            try {
                const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('app_modules').select('*').order('sort_order', {
                    ascending: true
                });
                if (error) throw error;
                if (data) setModules(data);
            } catch (error) {
                console.error('[Auth] Failed to fetch modules:', error);
            }
        }
    }["AuthProvider.useCallback[refreshModules]"], []);
    const login = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[login]": async (email, password)=>{
            // For demo purposes, allow simple password check
            // In production, use proper bcrypt comparison on server side
            if (!__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isSupabaseConfigured"] || !__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"]) {
                // Demo mode - allow admin/user login
                if (email === 'admin@nemocnice.cz' && password === 'admin123') {
                    const demoUser = {
                        id: '1',
                        email,
                        name: 'Administrator',
                        role: 'admin',
                        is_active: true
                    };
                    setUser(demoUser);
                    localStorage.setItem('app_user', JSON.stringify(demoUser));
                    return {
                        success: true
                    };
                }
                if (email === 'user@nemocnice.cz' && password === 'user123') {
                    const demoUser = {
                        id: '2',
                        email,
                        name: 'User',
                        role: 'user',
                        is_active: true
                    };
                    setUser(demoUser);
                    localStorage.setItem('app_user', JSON.stringify(demoUser));
                    return {
                        success: true
                    };
                }
                return {
                    success: false,
                    error: 'Invalid credentials'
                };
            }
            try {
                // Fetch user from database
                const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('app_users').select('*').eq('email', email).eq('is_active', true).single();
                if (error || !data) {
                    return {
                        success: false,
                        error: 'Invalid credentials'
                    };
                }
                // For demo, accept any password that matches the simple check
                // In production, implement proper bcrypt comparison
                if (password === 'admin123' || password === 'user123') {
                    const loggedInUser = {
                        id: data.id,
                        email: data.email,
                        name: data.name,
                        role: data.role,
                        is_active: data.is_active
                    };
                    setUser(loggedInUser);
                    localStorage.setItem('app_user', JSON.stringify(loggedInUser));
                    await refreshModules();
                    return {
                        success: true
                    };
                }
                return {
                    success: false,
                    error: 'Invalid credentials'
                };
            } catch (error) {
                console.error('[Auth] Login error:', error);
                return {
                    success: false,
                    error: 'Login error'
                };
            }
        }
    }["AuthProvider.useCallback[login]"], [
        refreshModules
    ]);
    const logout = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[logout]": ()=>{
            setUser(null);
            localStorage.removeItem('app_user');
        }
    }["AuthProvider.useCallback[logout]"], []);
    const toggleModule = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[toggleModule]": async (moduleId, enabled)=>{
            if (!__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isSupabaseConfigured"] || !__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"]) {
                // Demo mode - update local state
                setModules({
                    "AuthProvider.useCallback[toggleModule]": (prev)=>prev.map({
                            "AuthProvider.useCallback[toggleModule]": (m)=>m.id === moduleId ? {
                                    ...m,
                                    is_enabled: enabled
                                } : m
                        }["AuthProvider.useCallback[toggleModule]"])
                }["AuthProvider.useCallback[toggleModule]"]);
                return true;
            }
            try {
                const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('app_modules').update({
                    is_enabled: enabled,
                    updated_at: new Date().toISOString()
                }).eq('id', moduleId);
                if (error) throw error;
                await refreshModules();
                return true;
            } catch (error) {
                console.error('[Auth] Failed to toggle module:', error);
                return false;
            }
        }
    }["AuthProvider.useCallback[toggleModule]"], [
        refreshModules
    ]);
    // Memoize context value to prevent unnecessary re-renders
    const contextValue = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "AuthProvider.useMemo[contextValue]": ()=>({
                user,
                isLoading,
                isAuthenticated: !!user,
                isAdmin: (user === null || user === void 0 ? void 0 : user.role) === 'admin',
                modules,
                login,
                logout,
                refreshModules,
                toggleModule
            })
    }["AuthProvider.useMemo[contextValue]"], [
        user,
        isLoading,
        modules,
        login,
        logout,
        refreshModules,
        toggleModule
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: contextValue,
        children: children
    }, void 0, false, {
        fileName: "[project]/contexts/AuthContext.tsx",
        lineNumber: 181,
        columnNumber: 5
    }, this);
}
_s(AuthProvider, "nbtPy5LOjc60xcKsj5KHQKF7mhE=");
_c = AuthProvider;
function useAuth() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
_s1(useAuth, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "AuthProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/contexts/WorkflowStatusesContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "WorkflowStatusesProvider",
    ()=>WorkflowStatusesProvider,
    "default",
    ()=>__TURBOPACK__default__export__,
    "useWorkflowStatusesContext",
    ()=>useWorkflowStatusesContext
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.14_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.14_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
const WorkflowStatusesContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
const mapDBToStatus = (db)=>({
        id: db.id,
        name: db.name,
        title: db.name,
        description: db.description,
        // sort_order in DB starts from 0, same as currentStepIndex
        order_index: db.sort_order,
        sort_order: db.sort_order,
        color: db.accent_color,
        accent_color: db.accent_color,
        is_active: db.is_active,
        count_in_statistics: db.include_in_statistics,
        include_in_statistics: db.include_in_statistics,
        default_duration: db.default_duration_minutes,
        default_duration_minutes: db.default_duration_minutes,
        show_in_timeline: db.show_in_timeline,
        show_in_room_detail: db.show_in_room_detail,
        is_special: db.is_special,
        special_type: db.special_type,
        organizer: db.name,
        status: db.is_active ? 'Active' : 'Inactive'
    });
const WorkflowStatusesProvider = (param)=>{
    let { children } = param;
    _s();
    const [statuses, setStatuses] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const fetchStatuses = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "WorkflowStatusesProvider.useCallback[fetchStatuses]": async ()=>{
            try {
                setLoading(true);
                const { data, error: fetchError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('workflow_statuses').select('*').order('sort_order', {
                    ascending: true
                });
                if (fetchError) throw fetchError;
                const mappedStatuses = (data || []).map(mapDBToStatus);
                setStatuses(mappedStatuses);
                setError(null);
            } catch (err) {
                console.error('[v0] Error fetching workflow statuses:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally{
                setLoading(false);
            }
        }
    }["WorkflowStatusesProvider.useCallback[fetchStatuses]"], []);
    const updateStatus = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "WorkflowStatusesProvider.useCallback[updateStatus]": async (id, updates)=>{
            // IMMEDIATELY update local state for responsive UI
            setStatuses({
                "WorkflowStatusesProvider.useCallback[updateStatus]": (prev)=>prev.map({
                        "WorkflowStatusesProvider.useCallback[updateStatus]": (s)=>s.id === id ? {
                                ...s,
                                ...updates
                            } : s
                    }["WorkflowStatusesProvider.useCallback[updateStatus]"])
            }["WorkflowStatusesProvider.useCallback[updateStatus]"]);
            try {
                const dbUpdates = {};
                if (updates.color !== undefined) dbUpdates.accent_color = updates.color;
                if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
                if (updates.count_in_statistics !== undefined) dbUpdates.include_in_statistics = updates.count_in_statistics;
                if (updates.default_duration !== undefined) dbUpdates.default_duration_minutes = updates.default_duration;
                if (updates.show_in_timeline !== undefined) dbUpdates.show_in_timeline = updates.show_in_timeline;
                if (updates.show_in_room_detail !== undefined) dbUpdates.show_in_room_detail = updates.show_in_room_detail;
                if (updates.name !== undefined) dbUpdates.name = updates.name;
                if (updates.description !== undefined) dbUpdates.description = updates.description;
                const { error: updateError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('workflow_statuses').update(dbUpdates).eq('id', id).select();
                if (updateError) throw updateError;
            } catch (err) {
                console.error('[v0] Error updating workflow status:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                // Revert on error
                await fetchStatuses();
            }
        }
    }["WorkflowStatusesProvider.useCallback[updateStatus]"], [
        fetchStatuses
    ]);
    const getActiveStatuses = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "WorkflowStatusesProvider.useCallback[getActiveStatuses]": ()=>{
            return statuses.filter({
                "WorkflowStatusesProvider.useCallback[getActiveStatuses]": (s)=>s.is_active
            }["WorkflowStatusesProvider.useCallback[getActiveStatuses]"]).sort({
                "WorkflowStatusesProvider.useCallback[getActiveStatuses]": (a, b)=>a.order_index - b.order_index
            }["WorkflowStatusesProvider.useCallback[getActiveStatuses]"]);
        }
    }["WorkflowStatusesProvider.useCallback[getActiveStatuses]"], [
        statuses
    ]);
    // Workflow statuses are only main ones (without special) for circular progress
    const getWorkflowStatuses = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "WorkflowStatusesProvider.useCallback[getWorkflowStatuses]": ()=>{
            return statuses.filter({
                "WorkflowStatusesProvider.useCallback[getWorkflowStatuses]": (s)=>s.is_active && !s.is_special
            }["WorkflowStatusesProvider.useCallback[getWorkflowStatuses]"]).sort({
                "WorkflowStatusesProvider.useCallback[getWorkflowStatuses]": (a, b)=>a.order_index - b.order_index
            }["WorkflowStatusesProvider.useCallback[getWorkflowStatuses]"]);
        }
    }["WorkflowStatusesProvider.useCallback[getWorkflowStatuses]"], [
        statuses
    ]);
    const getStatisticsStatuses = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "WorkflowStatusesProvider.useCallback[getStatisticsStatuses]": ()=>{
            return statuses.filter({
                "WorkflowStatusesProvider.useCallback[getStatisticsStatuses]": (s)=>s.is_active && s.count_in_statistics
            }["WorkflowStatusesProvider.useCallback[getStatisticsStatuses]"]);
        }
    }["WorkflowStatusesProvider.useCallback[getStatisticsStatuses]"], [
        statuses
    ]);
    const getStatusByIndex = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "WorkflowStatusesProvider.useCallback[getStatusByIndex]": (index)=>{
            // Find status by order_index matching the step index
            // sort_order in DB starts from 0, same as currentStepIndex
            const status = statuses.find({
                "WorkflowStatusesProvider.useCallback[getStatusByIndex].status": (s)=>s.order_index === index
            }["WorkflowStatusesProvider.useCallback[getStatusByIndex].status"]);
            if (!status && statuses.length > 0) {
                // Fallback: try to get by position in array
                return statuses[index];
            }
            return status;
        }
    }["WorkflowStatusesProvider.useCallback[getStatusByIndex]"], [
        statuses
    ]);
    const getStatusColor = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "WorkflowStatusesProvider.useCallback[getStatusColor]": (index)=>{
            const status = getStatusByIndex(index);
            return (status === null || status === void 0 ? void 0 : status.color) || '#6B7280';
        }
    }["WorkflowStatusesProvider.useCallback[getStatusColor]"], [
        getStatusByIndex
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "WorkflowStatusesProvider.useEffect": ()=>{
            fetchStatuses();
            // Subscribe na realtime změny
            const channel = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].channel('workflow_statuses_changes').on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'workflow_statuses'
            }, {
                "WorkflowStatusesProvider.useEffect.channel": ()=>fetchStatuses()
            }["WorkflowStatusesProvider.useEffect.channel"]).subscribe();
            return ({
                "WorkflowStatusesProvider.useEffect": ()=>{
                    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].removeChannel(channel);
                }
            })["WorkflowStatusesProvider.useEffect"];
        }
    }["WorkflowStatusesProvider.useEffect"], [
        fetchStatuses
    ]);
    // Memoize computed values
    const activeStatuses = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "WorkflowStatusesProvider.useMemo[activeStatuses]": ()=>getActiveStatuses()
    }["WorkflowStatusesProvider.useMemo[activeStatuses]"], [
        getActiveStatuses
    ]);
    const workflowStatuses = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "WorkflowStatusesProvider.useMemo[workflowStatuses]": ()=>getWorkflowStatuses()
    }["WorkflowStatusesProvider.useMemo[workflowStatuses]"], [
        getWorkflowStatuses
    ]);
    const statisticsStatuses = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "WorkflowStatusesProvider.useMemo[statisticsStatuses]": ()=>getStatisticsStatuses()
    }["WorkflowStatusesProvider.useMemo[statisticsStatuses]"], [
        getStatisticsStatuses
    ]);
    // Memoize context value to prevent unnecessary re-renders
    const value = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "WorkflowStatusesProvider.useMemo[value]": ()=>({
                statuses,
                activeStatuses,
                workflowStatuses,
                statisticsStatuses,
                loading,
                error,
                updateStatus,
                getStatusByIndex,
                getStatusColor,
                refreshStatuses: fetchStatuses
            })
    }["WorkflowStatusesProvider.useMemo[value]"], [
        statuses,
        activeStatuses,
        workflowStatuses,
        statisticsStatuses,
        loading,
        error,
        updateStatus,
        getStatusByIndex,
        getStatusColor,
        fetchStatuses
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(WorkflowStatusesContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/contexts/WorkflowStatusesContext.tsx",
        lineNumber: 205,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(WorkflowStatusesProvider, "dnESUr4Gvi9iDo1/Fc01fkpgueU=");
_c = WorkflowStatusesProvider;
const useWorkflowStatusesContext = ()=>{
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(WorkflowStatusesContext);
    if (context === undefined) {
        throw new Error('useWorkflowStatusesContext must be used within a WorkflowStatusesProvider');
    }
    return context;
};
_s1(useWorkflowStatusesContext, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
const __TURBOPACK__default__export__ = WorkflowStatusesContext;
var _c;
__turbopack_context__.k.register(_c, "WorkflowStatusesProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/hooks/useEmergencyAlert.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useEmergencyAlert",
    ()=>useEmergencyAlert
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.14_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
// Shared AudioContext - created once and reused
let sharedAudioContext = null;
let isAudioUnlocked = false;
// Unlock audio on mobile devices - must be called from user interaction
function unlockAudio() {
    if (isAudioUnlocked) return;
    try {
        if (!sharedAudioContext) {
            sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (sharedAudioContext.state === 'suspended') {
            sharedAudioContext.resume();
        }
        // Play a silent sound to unlock audio on iOS/mobile
        const buffer = sharedAudioContext.createBuffer(1, 1, 22050);
        const source = sharedAudioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(sharedAudioContext.destination);
        source.start(0);
        isAudioUnlocked = true;
        console.log('[EmergencyAlert] Audio unlocked for mobile');
    } catch (e) {
        console.error('[EmergencyAlert] Failed to unlock audio:', e);
    }
}
// Setup global unlock listeners
if ("TURBOPACK compile-time truthy", 1) {
    const unlockEvents = [
        'touchstart',
        'touchend',
        'mousedown',
        'keydown',
        'click'
    ];
    const handleUnlock = ()=>{
        unlockAudio();
        // Remove listeners after unlock
        unlockEvents.forEach((event)=>{
            document.removeEventListener(event, handleUnlock, true);
        });
    };
    unlockEvents.forEach((event)=>{
        document.addEventListener(event, handleUnlock, true);
    });
}
// Play emergency alert sound
function playEmergencyAlert() {
    try {
        // Create AudioContext if not exists
        if (!sharedAudioContext) {
            sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Resume if suspended (mobile browsers)
        if (sharedAudioContext.state === 'suspended') {
            sharedAudioContext.resume();
        }
        const audioContext = sharedAudioContext;
        // Create a more urgent alarm sound pattern
        const playTone = (startTime, frequency, duration)=>{
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(frequency, startTime);
            // Quick attack, sustain, quick release
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
            gainNode.gain.setValueAtTime(0.4, startTime + duration - 0.02);
            gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };
        const now = audioContext.currentTime;
        // Play alternating high-low emergency pattern (5 cycles for more urgency)
        for(let i = 0; i < 5; i++){
            const cycleStart = now + i * 0.35;
            playTone(cycleStart, 880, 0.12); // High tone (A5)
            playTone(cycleStart + 0.17, 440, 0.12); // Low tone (A4)
        }
        console.log('[EmergencyAlert] Sound played');
    } catch (error) {
        console.error('[EmergencyAlert] Failed to play sound:', error);
    }
}
function useEmergencyAlert(rooms, selectedRoomId) {
    _s();
    const previousEmergencyStates = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(new Map());
    const isInitialized = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    const checkForNewEmergency = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useEmergencyAlert.useCallback[checkForNewEmergency]": (updatedRooms)=>{
            // Skip first render to avoid playing sound on page load for existing emergencies
            if (!isInitialized.current) {
                // Initialize previous states without playing sound
                for (const room of updatedRooms){
                    previousEmergencyStates.current.set(room.id, room.isEmergency || false);
                }
                isInitialized.current = true;
                return;
            }
            for (const room of updatedRooms){
                const wasEmergency = previousEmergencyStates.current.get(room.id) || false;
                const isNowEmergency = room.isEmergency || false;
                // If emergency was just activated (changed from false to true)
                if (!wasEmergency && isNowEmergency) {
                    console.log('[EmergencyAlert] Emergency activated for room:', room.name);
                    // Play sound on all devices where this room is visible
                    playEmergencyAlert();
                }
                // Update stored state
                previousEmergencyStates.current.set(room.id, isNowEmergency);
            }
        }
    }["useEmergencyAlert.useCallback[checkForNewEmergency]"], []);
    // Check for emergency changes whenever rooms update
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useEmergencyAlert.useEffect": ()=>{
            checkForNewEmergency(rooms);
        }
    }["useEmergencyAlert.useEffect"], [
        rooms,
        checkForNewEmergency
    ]);
    // Return function to manually trigger alert if needed
    return {
        playEmergencyAlert
    };
}
_s(useEmergencyAlert, "Pv8Gc/7KrHsrAuReN7InHav5/iE=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/App.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.14_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.14_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/Sidebar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$MobileNav$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/MobileNav.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$RoomCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/RoomCard.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$RoomDetail$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/RoomDetail.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TimelineModule$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/TimelineModule.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$StatisticsModule$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/StatisticsModule.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$StaffManager$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/StaffManager.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$SettingsPage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/SettingsPage.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$AdminModule$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/AdminModule.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$PlaceholderView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/PlaceholderView.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$AnimatedCounter$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/AnimatedCounter.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ErrorBoundary$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ErrorBoundary.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/constants.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.454.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/activity.js [app-client] (ecmascript) <export default as Activity>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$grid$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutGrid$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.454.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/layout-grid.js [app-client] (ecmascript) <export default as LayoutGrid>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.454.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/shield.js [app-client] (ecmascript) <export default as Shield>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/contexts/AuthContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$contexts$2f$WorkflowStatusesContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/contexts/WorkflowStatusesContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$LoginPage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/LoginPage.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$useEmergencyAlert$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/hooks/useEmergencyAlert.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
// Main App Content - Operating Rooms Management System
const DEFAULT_BG_SETTINGS = {
    type: 'linear',
    colors: [
        {
            color: '#0a0a12',
            position: 0
        },
        {
            color: '#1a1a2e',
            position: 100
        }
    ],
    direction: 'to bottom',
    opacity: 100,
    imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=2000',
    imageOpacity: 15,
    imageBlur: 0
};
const AppContent = ()=>{
    _s();
    const { isAuthenticated, isAdmin, modules } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const [rooms, setRooms] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MOCK_ROOMS"]);
    const [selectedRoomId, setSelectedRoomId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [currentView, setCurrentView] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('dashboard');
    const [settingsResetTrigger, setSettingsResetTrigger] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [isDbConnected, setIsDbConnected] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [bgSettings, setBgSettings] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(DEFAULT_BG_SETTINGS);
    // Load background settings from database
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AppContent.useEffect": ()=>{
            const loadBgSettings = {
                "AppContent.useEffect.loadBgSettings": async ()=>{
                    const dbSettings = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetchBackgroundSettings"])();
                    if (dbSettings) {
                        setBgSettings(dbSettings);
                    }
                }
            }["AppContent.useEffect.loadBgSettings"];
            loadBgSettings();
        }
    }["AppContent.useEffect"], []);
    // Listen for background settings changes
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AppContent.useEffect": ()=>{
            const handleBgChange = {
                "AppContent.useEffect.handleBgChange": (e)=>{
                    setBgSettings(e.detail);
                }
            }["AppContent.useEffect.handleBgChange"];
            window.addEventListener('backgroundSettingsChanged', handleBgChange);
            return ({
                "AppContent.useEffect": ()=>window.removeEventListener('backgroundSettingsChanged', handleBgChange)
            })["AppContent.useEffect"];
        }
    }["AppContent.useEffect"], []);
    // Generate CSS gradient from settings - memoized
    const backgroundStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "AppContent.useMemo[backgroundStyle]": ()=>{
            const colors = bgSettings.colors || [];
            if (bgSettings.type === 'solid' || colors.length <= 1) {
                var _colors_;
                return ((_colors_ = colors[0]) === null || _colors_ === void 0 ? void 0 : _colors_.color) || '#0a0a12';
            }
            const sortedColors = [
                ...colors
            ].sort({
                "AppContent.useMemo[backgroundStyle].sortedColors": (a, b)=>a.position - b.position
            }["AppContent.useMemo[backgroundStyle].sortedColors"]);
            const colorStops = sortedColors.map({
                "AppContent.useMemo[backgroundStyle].colorStops": (c)=>"".concat(c.color, " ").concat(c.position, "%")
            }["AppContent.useMemo[backgroundStyle].colorStops"]).join(', ');
            if (bgSettings.type === 'radial') {
                return "radial-gradient(circle at center, ".concat(colorStops, ")");
            }
            return "linear-gradient(".concat(bgSettings.direction || 'to bottom', ", ").concat(colorStops, ")");
        }
    }["AppContent.useMemo[backgroundStyle]"], [
        bgSettings
    ]);
    // Emergency alert sound - plays when any room's emergency status is activated
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$useEmergencyAlert$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEmergencyAlert"])(rooms, selectedRoomId);
    // Load rooms from database on mount, fallback to MOCK_ROOMS
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AppContent.useEffect": ()=>{
            const loadRooms = {
                "AppContent.useEffect.loadRooms": async ()=>{
                    const dbRooms = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetchOperatingRooms"])();
                    if (dbRooms && dbRooms.length > 0) {
                        setRooms(dbRooms);
                        setIsDbConnected(true);
                        // Load completed operations for today for each room
                        const today = new Date();
                        const updatedRooms = await Promise.all(dbRooms.map({
                            "AppContent.useEffect.loadRooms": async (room)=>{
                                const completedOps = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetchCompletedOperationsForDay"])(room.id, today);
                                return {
                                    ...room,
                                    completedOperations: completedOps || []
                                };
                            }
                        }["AppContent.useEffect.loadRooms"]));
                        setRooms(updatedRooms);
                    }
                }
            }["AppContent.useEffect.loadRooms"];
            loadRooms();
        }
    }["AppContent.useEffect"], []);
    // Subscribe to real-time updates with granular room updates
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AppContent.useEffect": ()=>{
            const unsubscribe = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["subscribeToOperatingRooms"])({
                "AppContent.useEffect.unsubscribe": // Full refresh callback (for INSERT/DELETE)
                async ()=>{
                    const dbRooms = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetchOperatingRooms"])();
                    if (dbRooms && dbRooms.length > 0) {
                        setRooms(dbRooms);
                    }
                }
            }["AppContent.useEffect.unsubscribe"], {
                "AppContent.useEffect.unsubscribe": // Granular update callback (for UPDATE - instant sync)
                (roomId, dbChanges)=>{
                    const appChanges = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["transformSingleRoom"])(dbChanges);
                    setRooms({
                        "AppContent.useEffect.unsubscribe": (prev)=>prev.map({
                                "AppContent.useEffect.unsubscribe": (room)=>room.id === roomId ? {
                                        ...room,
                                        ...appChanges
                                    } : room
                            }["AppContent.useEffect.unsubscribe"])
                    }["AppContent.useEffect.unsubscribe"]);
                }
            }["AppContent.useEffect.unsubscribe"]);
            return ({
                "AppContent.useEffect": ()=>{
                    if (unsubscribe) unsubscribe();
                }
            })["AppContent.useEffect"];
        }
    }["AppContent.useEffect"], []);
    const selectedRoom = rooms.find((r)=>r.id === selectedRoomId) || null;
    // Check if module is enabled (admins always have access, users check module settings)
    const isModuleEnabled = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppContent.useCallback[isModuleEnabled]": (moduleId)=>{
            if (isAdmin) return true; // Admin má vždy přístup ke všem modulům
            if (moduleId === 'dashboard') return true; // Dashboard je vždy přístupný
            const module = modules.find({
                "AppContent.useCallback[isModuleEnabled].module": (m)=>m.id === moduleId
            }["AppContent.useCallback[isModuleEnabled].module"]);
            return (module === null || module === void 0 ? void 0 : module.is_enabled) !== false;
        }
    }["AppContent.useCallback[isModuleEnabled]"], [
        isAdmin,
        modules
    ]);
    // Guard: If current view is not enabled, redirect to dashboard
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AppContent.useEffect": ()=>{
            if (currentView !== 'dashboard' && !isModuleEnabled(currentView)) {
                setCurrentView('dashboard');
            }
        }
    }["AppContent.useEffect"], [
        currentView,
        isModuleEnabled
    ]);
    const updateRoomStep = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppContent.useCallback[updateRoomStep]": async (roomId, newStepIndex, stepColor)=>{
            const now = new Date().toISOString();
            // Check if operation is being completed (transitioning to "Sál připraven po úklidu" - index 7, or back to index 0)
            // Operation is complete when: resetting to 0, or moving to index 7 (after cleanup)
            const isOperationComplete = {
                "AppContent.useCallback[updateRoomStep].isOperationComplete": (currentIndex, nextIndex)=>{
                    // Reset to ready state
                    if (nextIndex === 0) return true;
                    // Moving to "Sál připraven po úklidu" (index 7) after úklid sálu (index 6)
                    if (nextIndex === 7 && currentIndex >= 1) return true;
                    return false;
                }
            }["AppContent.useCallback[updateRoomStep].isOperationComplete"];
            setRooms({
                "AppContent.useCallback[updateRoomStep]": (prev)=>prev.map({
                        "AppContent.useCallback[updateRoomStep]": (room)=>{
                            if (room.id !== roomId) return room;
                            // Save completed operation when transitioning to ready state
                            let updatedCompletedOps = room.completedOperations || [];
                            const shouldSaveOperation = isOperationComplete(room.currentStepIndex, newStepIndex) && room.operationStartedAt && room.statusHistory && room.statusHistory.length > 0;
                            if (shouldSaveOperation) {
                                console.log("[v0] Saving completed operation for room:", room.name);
                                updatedCompletedOps = [
                                    ...updatedCompletedOps,
                                    {
                                        startedAt: room.operationStartedAt,
                                        endedAt: now,
                                        statusHistory: [
                                            ...room.statusHistory
                                        ]
                                    }
                                ];
                            }
                            // Build status history - reset when going back to ready state
                            const shouldResetHistory = newStepIndex === 0 || newStepIndex === 7;
                            const currentHistory = room.statusHistory || [];
                            const newHistory = shouldResetHistory ? [] : [
                                ...currentHistory,
                                {
                                    stepIndex: newStepIndex,
                                    startedAt: now,
                                    color: stepColor || '#6B7280'
                                }
                            ];
                            // Set operationStartedAt when transitioning to first active status (index 1)
                            const operationStartedAt = newStepIndex === 1 && (room.currentStepIndex === 0 || room.currentStepIndex === 7) ? now : shouldResetHistory ? null : room.operationStartedAt;
                            return {
                                ...room,
                                currentStepIndex: newStepIndex,
                                phaseStartedAt: now,
                                operationStartedAt,
                                statusHistory: newHistory,
                                completedOperations: updatedCompletedOps
                            };
                        }
                    }["AppContent.useCallback[updateRoomStep]"])
            }["AppContent.useCallback[updateRoomStep]"]);
            if (isDbConnected) {
                const room = rooms.find({
                    "AppContent.useCallback[updateRoomStep].room": (r)=>r.id === roomId
                }["AppContent.useCallback[updateRoomStep].room"]);
                // Save completed operation
                let updatedCompletedOps = (room === null || room === void 0 ? void 0 : room.completedOperations) || [];
                const shouldSaveOperation = isOperationComplete((room === null || room === void 0 ? void 0 : room.currentStepIndex) || 0, newStepIndex) && (room === null || room === void 0 ? void 0 : room.operationStartedAt) && (room === null || room === void 0 ? void 0 : room.statusHistory) && room.statusHistory.length > 0;
                if (shouldSaveOperation) {
                    updatedCompletedOps = [
                        ...updatedCompletedOps,
                        {
                            startedAt: room.operationStartedAt,
                            endedAt: now,
                            statusHistory: [
                                ...room.statusHistory
                            ]
                        }
                    ];
                }
                const shouldResetHistory = newStepIndex === 0 || newStepIndex === 7;
                const currentHistory = (room === null || room === void 0 ? void 0 : room.statusHistory) || [];
                const newHistory = shouldResetHistory ? [] : [
                    ...currentHistory,
                    {
                        stepIndex: newStepIndex,
                        startedAt: now,
                        color: stepColor || '#6B7280'
                    }
                ];
                const operationStartedAt = newStepIndex === 1 && ((room === null || room === void 0 ? void 0 : room.currentStepIndex) === 0 || (room === null || room === void 0 ? void 0 : room.currentStepIndex) === 7) ? now : shouldResetHistory ? null : room === null || room === void 0 ? void 0 : room.operationStartedAt;
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateOperatingRoom"])(roomId, {
                    current_step_index: newStepIndex,
                    phase_started_at: now,
                    operation_started_at: operationStartedAt,
                    status_history: newHistory,
                    completed_operations: updatedCompletedOps
                });
            }
        }
    }["AppContent.useCallback[updateRoomStep]"], [
        isDbConnected,
        rooms
    ]);
    const toggleEmergency = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppContent.useCallback[toggleEmergency]": async (roomId)=>{
            const room = rooms.find({
                "AppContent.useCallback[toggleEmergency].room": (r)=>r.id === roomId
            }["AppContent.useCallback[toggleEmergency].room"]);
            const newValue = !(room === null || room === void 0 ? void 0 : room.isEmergency);
            setRooms({
                "AppContent.useCallback[toggleEmergency]": (prev)=>prev.map({
                        "AppContent.useCallback[toggleEmergency]": (r)=>r.id === roomId ? {
                                ...r,
                                isEmergency: newValue
                            } : r
                    }["AppContent.useCallback[toggleEmergency]"])
            }["AppContent.useCallback[toggleEmergency]"]);
            if (isDbConnected) {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateOperatingRoom"])(roomId, {
                    is_emergency: newValue
                });
            }
        }
    }["AppContent.useCallback[toggleEmergency]"], [
        rooms,
        isDbConnected
    ]);
    const toggleLock = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppContent.useCallback[toggleLock]": async (roomId)=>{
            const room = rooms.find({
                "AppContent.useCallback[toggleLock].room": (r)=>r.id === roomId
            }["AppContent.useCallback[toggleLock].room"]);
            const newValue = !(room === null || room === void 0 ? void 0 : room.isLocked);
            setRooms({
                "AppContent.useCallback[toggleLock]": (prev)=>prev.map({
                        "AppContent.useCallback[toggleLock]": (r)=>r.id === roomId ? {
                                ...r,
                                isLocked: newValue
                            } : r
                    }["AppContent.useCallback[toggleLock]"])
            }["AppContent.useCallback[toggleLock]"]);
            if (isDbConnected) {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateOperatingRoom"])(roomId, {
                    is_locked: newValue
                });
            }
        }
    }["AppContent.useCallback[toggleLock]"], [
        rooms,
        isDbConnected
    ]);
    const handleUpdateRoomEndTime = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppContent.useCallback[handleUpdateRoomEndTime]": async (roomId, newTime)=>{
            setRooms({
                "AppContent.useCallback[handleUpdateRoomEndTime]": (prev)=>prev.map({
                        "AppContent.useCallback[handleUpdateRoomEndTime]": (room)=>room.id === roomId ? {
                                ...room,
                                estimatedEndTime: newTime ? newTime.toISOString() : undefined
                            } : room
                    }["AppContent.useCallback[handleUpdateRoomEndTime]"])
            }["AppContent.useCallback[handleUpdateRoomEndTime]"]);
            if (isDbConnected) {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateOperatingRoom"])(roomId, {
                    estimated_end_time: newTime ? newTime.toISOString() : null
                });
            }
        }
    }["AppContent.useCallback[handleUpdateRoomEndTime]"], [
        isDbConnected
    ]);
    const handleEnhancedHygieneToggle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppContent.useCallback[handleEnhancedHygieneToggle]": async (roomId, enabled)=>{
            setRooms({
                "AppContent.useCallback[handleEnhancedHygieneToggle]": (prev)=>prev.map({
                        "AppContent.useCallback[handleEnhancedHygieneToggle]": (room)=>room.id === roomId ? {
                                ...room,
                                isEnhancedHygiene: enabled
                            } : room
                    }["AppContent.useCallback[handleEnhancedHygieneToggle]"])
            }["AppContent.useCallback[handleEnhancedHygieneToggle]"]);
            if (isDbConnected) {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateOperatingRoom"])(roomId, {
                    is_enhanced_hygiene: enabled
                });
            }
        }
    }["AppContent.useCallback[handleEnhancedHygieneToggle]"], [
        isDbConnected
    ]);
    const handleUpdateWeeklySchedule = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppContent.useCallback[handleUpdateWeeklySchedule]": async (roomId, schedule)=>{
            setRooms({
                "AppContent.useCallback[handleUpdateWeeklySchedule]": (prev)=>prev.map({
                        "AppContent.useCallback[handleUpdateWeeklySchedule]": (room)=>room.id === roomId ? {
                                ...room,
                                weeklySchedule: schedule
                            } : room
                    }["AppContent.useCallback[handleUpdateWeeklySchedule]"])
            }["AppContent.useCallback[handleUpdateWeeklySchedule]"]);
            if (isDbConnected) {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateOperatingRoom"])(roomId, {
                    weekly_schedule: schedule
                });
            }
        }
    }["AppContent.useCallback[handleUpdateWeeklySchedule]"], [
        isDbConnected
    ]);
    const handleStaffChange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppContent.useCallback[handleStaffChange]": async (roomId, role, staffId, staffName)=>{
            // Update local state
            setRooms({
                "AppContent.useCallback[handleStaffChange]": (prev)=>prev.map({
                        "AppContent.useCallback[handleStaffChange]": (room)=>{
                            if (room.id !== roomId) return room;
                            const updatedStaff = {
                                ...room.staff
                            };
                            if (role === 'doctor') {
                                updatedStaff.doctor = {
                                    name: staffName,
                                    role: 'DOCTOR'
                                };
                            } else if (role === 'nurse') {
                                updatedStaff.nurse = {
                                    name: staffName,
                                    role: 'NURSE'
                                };
                            } else if (role === 'anesthesiologist') {
                                updatedStaff.anesthesiologist = {
                                    name: staffName,
                                    role: 'ANESTHESIOLOGIST'
                                };
                            }
                            return {
                                ...room,
                                staff: updatedStaff
                            };
                        }
                    }["AppContent.useCallback[handleStaffChange]"])
            }["AppContent.useCallback[handleStaffChange]"]);
            // Update database
            if (isDbConnected) {
                const dbField = role === 'doctor' ? 'doctor_id' : role === 'nurse' ? 'nurse_id' : 'anesthesiologist_id';
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateOperatingRoom"])(roomId, {
                    [dbField]: staffId
                });
            }
        }
    }["AppContent.useCallback[handleStaffChange]"], [
        isDbConnected
    ]);
    const handlePatientStatusChange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppContent.useCallback[handlePatientStatusChange]": (roomId, calledAt, arrivedAt)=>{
            setRooms({
                "AppContent.useCallback[handlePatientStatusChange]": (prev)=>prev.map({
                        "AppContent.useCallback[handlePatientStatusChange]": (room)=>room.id === roomId ? {
                                ...room,
                                patientCalledAt: calledAt,
                                patientArrivedAt: arrivedAt
                            } : room
                    }["AppContent.useCallback[handlePatientStatusChange]"])
            }["AppContent.useCallback[handlePatientStatusChange]"]);
        }
    }["AppContent.useCallback[handlePatientStatusChange]"], []);
    // Show login if not authenticated - must be after all hooks
    if (!isAuthenticated) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$LoginPage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
            fileName: "[project]/App.tsx",
            lineNumber: 336,
            columnNumber: 12
        }, ("TURBOPACK compile-time value", void 0));
    }
    var _bgSettings_opacity;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ErrorBoundary$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ErrorBoundary"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex h-screen w-full font-sans overflow-hidden bg-black text-white",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "fixed inset-0 z-0 overflow-hidden pointer-events-none",
                    children: [
                        bgSettings.imageUrl && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                            src: bgSettings.imageUrl,
                            alt: "",
                            loading: "lazy",
                            decoding: "async",
                            className: "w-full h-full object-cover grayscale scale-105 transition-opacity duration-500",
                            style: {
                                opacity: bgSettings.imageOpacity / 100,
                                filter: bgSettings.imageBlur > 0 ? "blur(".concat(bgSettings.imageBlur, "px)") : undefined
                            }
                        }, void 0, false, {
                            fileName: "[project]/App.tsx",
                            lineNumber: 346,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "absolute inset-0 transition-all duration-500",
                            style: {
                                background: backgroundStyle,
                                opacity: ((_bgSettings_opacity = bgSettings.opacity) !== null && _bgSettings_opacity !== void 0 ? _bgSettings_opacity : 100) / 100
                            }
                        }, void 0, false, {
                            fileName: "[project]/App.tsx",
                            lineNumber: 360,
                            columnNumber: 9
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/App.tsx",
                    lineNumber: 343,
                    columnNumber: 7
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    currentView: currentView,
                    onNavigate: (view)=>{
                        if (currentView === 'settings' && view === 'settings') {
                            // Reset settings module when clicking settings again
                            setSettingsResetTrigger((prev)=>prev + 1);
                        } else {
                            setCurrentView(view);
                            setSelectedRoomId(null);
                        }
                    }
                }, void 0, false, {
                    fileName: "[project]/App.tsx",
                    lineNumber: 370,
                    columnNumber: 1
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$MobileNav$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    currentView: currentView,
                    onNavigate: (view)=>{
                        if (currentView === 'settings' && view === 'settings') {
                            // Reset settings module when clicking settings again
                            setSettingsResetTrigger((prev)=>prev + 1);
                        } else {
                            setCurrentView(view);
                            setSelectedRoomId(null);
                        }
                    }
                }, void 0, false, {
                    fileName: "[project]/App.tsx",
                    lineNumber: 379,
                    columnNumber: 7
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex-1 flex flex-col relative z-20 w-full overflow-hidden",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                        className: "flex-1 overflow-hidden relative pb-20 md:pb-0",
                        children: [
                            currentView === 'dashboard' && selectedRoom && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute inset-0 z-50",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$RoomDetail$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    room: selectedRoom,
                                    onClose: ()=>setSelectedRoomId(null),
                                    onStepChange: (index, stepColor)=>updateRoomStep(selectedRoom.id, index, stepColor),
                                    onEndTimeChange: (newTime)=>handleUpdateRoomEndTime(selectedRoom.id, newTime),
                                    onEnhancedHygieneToggle: (enabled)=>handleEnhancedHygieneToggle(selectedRoom.id, enabled),
                                    onStaffChange: (role, staffId, staffName)=>handleStaffChange(selectedRoom.id, role, staffId, staffName),
                                    onPatientStatusChange: (calledAt, arrivedAt)=>handlePatientStatusChange(selectedRoom.id, calledAt, arrivedAt)
                                }, void 0, false, {
                                    fileName: "[project]/App.tsx",
                                    lineNumber: 398,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/App.tsx",
                                lineNumber: 397,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0)),
                            currentView === 'dashboard' && !selectedRoom && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-full h-full overflow-y-auto hide-scrollbar px-8 md:pl-32 md:pr-10 py-10",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "max-w-[2400px] mx-auto w-full",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                                            className: "flex flex-col lg:flex-row items-center lg:items-end justify-between gap-6 mb-16 flex-shrink-0",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-center lg:text-left",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"], {
                                                                    className: "w-4 h-4 text-[#00D8C1]"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/App.tsx",
                                                                    lineNumber: 417,
                                                                    columnNumber: 25
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase",
                                                                    children: "OPERATINGROOM CONTROL"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/App.tsx",
                                                                    lineNumber: 418,
                                                                    columnNumber: 25
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/App.tsx",
                                                            lineNumber: 416,
                                                            columnNumber: 23
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                                            className: "text-7xl font-black tracking-tighter uppercase leading-none",
                                                            children: [
                                                                "OPERATING ",
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-white/20",
                                                                    children: "ROOM"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/App.tsx",
                                                                    lineNumber: 421,
                                                                    columnNumber: 35
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/App.tsx",
                                                            lineNumber: 420,
                                                            columnNumber: 23
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/App.tsx",
                                                    lineNumber: 415,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex gap-4 p-2 bg-white/[0.04] border border-white/10 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl relative overflow-hidden",
                                                    children: (()=>{
                                                        // Check if room is in "ready" status (step index 0 or 7)
                                                        const isRoomReady = (room)=>{
                                                            return room.currentStepIndex === 0 || room.currentStepIndex === 7;
                                                        };
                                                        const readyRooms = rooms.filter(isRoomReady);
                                                        const activeRooms = rooms.filter((r)=>!isRoomReady(r));
                                                        return [
                                                            {
                                                                label: 'AKTIVNI',
                                                                value: activeRooms.length,
                                                                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"],
                                                                color: 'text-red-500'
                                                            },
                                                            {
                                                                label: 'PRIPRAVENO',
                                                                value: readyRooms.length,
                                                                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$454$2e$0_react$40$18$2e$3$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$grid$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutGrid$3e$__["LayoutGrid"],
                                                                color: 'text-[#00D8C1]'
                                                            }
                                                        ];
                                                    })().map((stat)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex flex-col items-center justify-center px-10 py-4 rounded-3xl hover:bg-white/5 transition-all min-w-[150px] z-10",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex items-center gap-2.5 mb-2 opacity-40",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(stat.icon, {
                                                                            className: "w-4 h-4 ".concat(stat.color)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/App.tsx",
                                                                            lineNumber: 441,
                                                                            columnNumber: 29
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-[9px] font-black uppercase tracking-[0.2em]",
                                                                            children: stat.label
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/App.tsx",
                                                                            lineNumber: 442,
                                                                            columnNumber: 29
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/App.tsx",
                                                                    lineNumber: 440,
                                                                    columnNumber: 27
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$AnimatedCounter$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                    to: stat.value
                                                                }, void 0, false, {
                                                                    fileName: "[project]/App.tsx",
                                                                    lineNumber: 444,
                                                                    columnNumber: 27
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, stat.label, true, {
                                                            fileName: "[project]/App.tsx",
                                                            lineNumber: 439,
                                                            columnNumber: 25
                                                        }, ("TURBOPACK compile-time value", void 0)))
                                                }, void 0, false, {
                                                    fileName: "[project]/App.tsx",
                                                    lineNumber: 424,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/App.tsx",
                                            lineNumber: 414,
                                            columnNumber: 19
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pb-20 px-2",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-x-8 gap-y-12",
                                                children: rooms.map((room)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$RoomCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                        room: room,
                                                        onClick: ()=>setSelectedRoomId(room.id),
                                                        onEmergency: ()=>toggleEmergency(room.id),
                                                        onLock: ()=>toggleLock(room.id)
                                                    }, room.id, false, {
                                                        fileName: "[project]/App.tsx",
                                                        lineNumber: 452,
                                                        columnNumber: 25
                                                    }, ("TURBOPACK compile-time value", void 0)))
                                            }, void 0, false, {
                                                fileName: "[project]/App.tsx",
                                                lineNumber: 450,
                                                columnNumber: 21
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/App.tsx",
                                            lineNumber: 449,
                                            columnNumber: 19
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/App.tsx",
                                    lineNumber: 413,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/App.tsx",
                                lineNumber: 412,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0)),
                            currentView === 'timeline' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-full h-full overflow-hidden",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TimelineModule$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    rooms: rooms
                                }, void 0, false, {
                                    fileName: "[project]/App.tsx",
                                    lineNumber: 469,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/App.tsx",
                                lineNumber: 468,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0)),
                            currentView === 'statistics' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-full h-full overflow-y-auto hide-scrollbar",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "w-full px-8 md:pl-32 md:pr-10 py-10",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$StatisticsModule$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        rooms: rooms
                                    }, void 0, false, {
                                        fileName: "[project]/App.tsx",
                                        lineNumber: 477,
                                        columnNumber: 19
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/App.tsx",
                                    lineNumber: 476,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/App.tsx",
                                lineNumber: 475,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0)),
                            currentView === 'staff' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-full h-full overflow-y-auto hide-scrollbar",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "w-full px-8 md:pl-32 md:pr-10 py-10",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$StaffManager$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                        fileName: "[project]/App.tsx",
                                        lineNumber: 486,
                                        columnNumber: 19
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/App.tsx",
                                    lineNumber: 485,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/App.tsx",
                                lineNumber: 484,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0)),
                            currentView === 'alerts' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-full h-full",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$PlaceholderView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    title: "Upozornění",
                                    description: "Centrální upozornění a notifikace z operačních sálů budou zobrazeny zde."
                                }, void 0, false, {
                                    fileName: "[project]/App.tsx",
                                    lineNumber: 494,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/App.tsx",
                                lineNumber: 493,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0)),
                            currentView === 'settings' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-full h-full overflow-y-auto hide-scrollbar",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$SettingsPage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    rooms: rooms,
                                    onRoomsChange: setRooms,
                                    onScheduleUpdate: handleUpdateWeeklySchedule,
                                    resetTrigger: settingsResetTrigger
                                }, void 0, false, {
                                    fileName: "[project]/App.tsx",
                                    lineNumber: 504,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/App.tsx",
                                lineNumber: 503,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0)),
                            currentView === 'admin' && isAdmin && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-full h-full overflow-y-auto hide-scrollbar",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$AdminModule$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    onClose: ()=>setCurrentView('dashboard')
                                }, void 0, false, {
                                    fileName: "[project]/App.tsx",
                                    lineNumber: 516,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/App.tsx",
                                lineNumber: 515,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/App.tsx",
                        lineNumber: 393,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/App.tsx",
                    lineNumber: 389,
                    columnNumber: 7
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/App.tsx",
            lineNumber: 341,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/App.tsx",
        lineNumber: 340,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(AppContent, "6ciVTymbbGskjJ1mfJxeL+XFrzU=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"],
        __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$useEmergencyAlert$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEmergencyAlert"]
    ];
});
_c = AppContent;
// Wrap with AuthProvider and WorkflowStatusesProvider
const App = ()=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AuthProvider"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$contexts$2f$WorkflowStatusesContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["WorkflowStatusesProvider"], {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AppContent, {}, void 0, false, {
                fileName: "[project]/App.tsx",
                lineNumber: 531,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/App.tsx",
            lineNumber: 530,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/App.tsx",
        lineNumber: 529,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c1 = App;
const __TURBOPACK__default__export__ = App;
var _c, _c1;
__turbopack_context__.k.register(_c, "AppContent");
__turbopack_context__.k.register(_c1, "App");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Page
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.14_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$App$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/App.tsx [app-client] (ecmascript)");
'use client';
;
;
function Page() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$14_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$App$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
        fileName: "[project]/app/page.tsx",
        lineNumber: 6,
        columnNumber: 10
    }, this);
}
_c = Page;
var _c;
__turbopack_context__.k.register(_c, "Page");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_112f4715._.js.map