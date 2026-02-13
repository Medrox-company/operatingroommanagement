"use client"

import type React from "react"
import { useMemo, useState, useEffect } from "react"
import type { OperatingRoom } from "../types"
import { useAppContext } from "../contexts/AppContext"
import { ACTION_STEPS, ANESTHESIOLOGIST_STATUS_MAP, STEP_COLORS } from "../constants"
import {
  Check,
  Clock,
  Stethoscope,
  User,
  Timer,
  Sparkles,
  PhoneCall,
  UserCheck,
  Syringe,
  Play,
  Square,
  X,
  Zap,
  Crown,
} from "lucide-react"
import { useClock } from "../hooks/useClock"
import StepProgressCards from "./StepProgressCards" // Declare the StepProgressCards variable

// --- HELPER FUNCTIONS ---
const formatTime = (timestamp: number | null) =>
  timestamp ? new Date(timestamp).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }) : "--:--"

const formatDuration = (ms: number | null): string => {
  if (ms === null || ms < 0) return ""
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

const STEP_ICONS = [PhoneCall, UserCheck, Syringe, Play, Square, Stethoscope, Sparkles]

const TeamMemberCard: React.FC<{
  type: "doctor" | "nurse"
  name: string | null
  status?: { label: string; icon: string; color: { bg: string; text: string } } | null
  isActive: boolean
  delay?: number
}> = ({ type, name, status, isActive, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const config = {
    doctor: {
      icon: Stethoscope,
      gradient: "from-sky-400 via-cyan-400 to-teal-400",
      glowColor: "rgba(56, 189, 248, 0.4)",
      label: "Anesteziolog",
      accentIcon: Crown,
    },
    nurse: {
      icon: User,
      gradient: "from-violet-400 via-purple-400 to-fuchsia-400",
      glowColor: "rgba(167, 139, 250, 0.4)",
      label: "Sestra",
      accentIcon: Zap,
    },
  }

  const { icon: Icon, gradient, glowColor, label, accentIcon: AccentIcon } = config[type]

  return (
    <div
      className={`relative group transition-all duration-700 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
    >
      <div
        className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
        style={{ background: glowColor }}
      />

      <div
        className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-xl transition-all duration-500 group-hover:border-white/20 group-hover:scale-[1.02]"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
        }}
      >
        <div className="relative p-3 flex items-center gap-3">
          {/* Avatar with animated ring */}
          <div className="relative flex-shrink-0">
            {isActive && (
              <div
                className="absolute inset-0 rounded-full animate-pulse"
                style={{
                  boxShadow: `0 0 20px ${glowColor}`,
                  transform: "scale(1.1)",
                }}
              />
            )}

            <div
              className={`relative w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br ${gradient} shadow-xl`}
              style={{
                boxShadow: `0 4px 20px ${glowColor}`,
              }}
            >
              <Icon size={22} className="text-white drop-shadow-lg" />
            </div>

            {isActive && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
                <Check size={8} className="text-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <AccentIcon size={10} className="text-slate-500" />
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">{label}</p>
            </div>
            {name ? (
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-white text-sm tracking-tight truncate">{name}</p>
                {status && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.color.bg} ${status.color.text}`}
                  >
                    {status.icon} {status.label}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-slate-500 italic text-sm">Nepřiřazeno</p>
            )}
          </div>

          {isActive && name && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const CircularProgress: React.FC<{
  progress: number
  size: number
  strokeWidth: number
  color: string
  children?: React.ReactNode
}> = ({ progress, size, strokeWidth, color, children }) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full blur-xl opacity-40" style={{ background: color }} />

      <svg className="transform -rotate-90 relative" width={size} height={size}>
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 8px ${color})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

const TimelineStep: React.FC<{
  step: string
  index: number
  isCompleted: boolean
  isActive: boolean
  timestamp: number | null
  duration: number | null
  stepColor: (typeof STEP_COLORS)[0]
  totalSteps: number
}> = ({ step, index, isCompleted, isActive, timestamp, duration, stepColor, totalSteps }) => {
  const [isVisible, setIsVisible] = useState(false)
  const StepIcon = STEP_ICONS[index] || Clock

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 50)
    return () => clearTimeout(timer)
  }, [index])

  return (
    <div
      className={`relative flex flex-col items-center transition-all duration-500 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
    >
      {/* Connector line */}
      {index < totalSteps - 1 && (
        <div
          className="absolute top-5 left-[calc(50%+20px)] w-[calc(100%-10px)] h-0.5 transition-all duration-700"
          style={{
            background: isCompleted
              ? `linear-gradient(90deg, ${stepColor.hex}, ${STEP_COLORS[index + 1]?.hex || stepColor.hex})`
              : "rgba(255,255,255,0.1)",
          }}
        />
      )}

      {/* Step indicator */}
      <div className="relative z-10 flex-shrink-0 group cursor-pointer">
        {isActive && (
          <>
            <div
              className="absolute inset-0 rounded-xl animate-ping"
              style={{
                background: stepColor.hex,
                opacity: 0.15,
              }}
            />
            <div
              className="absolute inset-0 rounded-xl"
              style={{
                boxShadow: `0 0 25px ${stepColor.hex}`,
              }}
            />
          </>
        )}
        <div
          className="relative w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-500 group-hover:scale-110"
          style={{
            borderColor: isActive || isCompleted ? stepColor.hex : "rgba(255,255,255,0.15)",
            background: isActive
              ? `linear-gradient(135deg, ${stepColor.hex}50, ${stepColor.hex}20)`
              : isCompleted
                ? `${stepColor.hex}30`
                : "rgba(15,23,42,0.8)",
            boxShadow: isActive ? `0 0 30px ${stepColor.hex}40` : "none",
          }}
        >
          {isCompleted ? (
            <Check size={18} style={{ color: stepColor.hex }} />
          ) : (
            <StepIcon
              size={18}
              style={{ color: isActive ? stepColor.hex : "rgba(148,163,184,0.4)" }}
              className={isActive ? "animate-pulse" : ""}
            />
          )}
        </div>
      </div>

      {/* Step info */}
      <div className="mt-2 text-center max-w-[90px]">
        <p
          className={`font-medium text-[10px] leading-tight transition-colors duration-300 ${isActive ? "text-white" : isCompleted ? "text-slate-300" : "text-slate-600"
            }`}
        >
          {step}
        </p>
        {(isCompleted || isActive) && timestamp && (
          <p
            className="text-[9px] font-mono mt-0.5"
            style={{ color: isActive || isCompleted ? stepColor.hex : "rgba(148,163,184,0.5)" }}
          >
            {formatTime(timestamp)}
          </p>
        )}
        {isCompleted && duration && (
          <p className="text-[9px] font-mono font-bold mt-0.5" style={{ color: stepColor.hex }}>
            {formatDuration(duration)}
          </p>
        )}
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/20">
          <div className="relative">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
            <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          </div>
          <span className="text-[8px] text-white font-semibold uppercase tracking-wider">Live</span>
        </div>
      )}
    </div>
  )
}

// --- MAIN COMPONENT ---
const RoomDetailModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  room: OperatingRoom | null
}> = ({ isOpen, onClose, room }) => {
  const { anesthesiaSchedule, anesthesiologists, anesthesiaNurses } = useAppContext()
  const clock = useClock()
  const [elapsedTime, setElapsedTime] = useState("00:00:00")
  const [isContentVisible, setIsContentVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsContentVisible(true), 100)
      return () => clearTimeout(timer)
    } else {
      setIsContentVisible(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!room?.operationStartTime) return
    const interval = setInterval(() => {
      const elapsed = Date.now() - room.operationStartTime!
      const hours = Math.floor(elapsed / 3600000)
      const minutes = Math.floor((elapsed % 3600000) / 60000)
      const seconds = Math.floor((elapsed % 60000) / 1000)
      setElapsedTime(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [room?.operationStartTime])

  const data = useMemo(() => {
    if (!room) return null

    const scheduleEntry = anesthesiaSchedule.find((s) => s.roomId === room.id)
    const anesthesiologist = anesthesiologists.find((a) => a.id === scheduleEntry?.anesthesiologistId)
    const nurse = anesthesiaNurses.find((n) => n.id === scheduleEntry?.anesthesiaNurseId)
    const statusInfo = anesthesiologist ? ANESTHESIOLOGIST_STATUS_MAP[anesthesiologist.status] : null

    const currentStepIndex = room.currentActionStep - 1
    const isFinished = room.currentActionStep > ACTION_STEPS.length
    const progress = Math.min(100, (currentStepIndex / ACTION_STEPS.length) * 100)

    const stepDurations = ACTION_STEPS.map((_, i) => {
      if (i > room.phaseTimestamps.length - 1 || !room.phaseTimestamps[i]) return null
      const prevTimestamp = i === 0 ? room.operationStartTime : room.phaseTimestamps[i - 1]
      if (!prevTimestamp) return null
      return room.phaseTimestamps[i]! - prevTimestamp
    })

    return { anesthesiologist, nurse, statusInfo, currentStepIndex, isFinished, stepDurations, progress }
  }, [room, anesthesiaSchedule, anesthesiologists, anesthesiaNurses])

  if (!isOpen || !room || !data) return null

  const { anesthesiologist, nurse, statusInfo, currentStepIndex, stepDurations, progress } = data
  const isInOperation = room.currentActionStep > 0 && room.currentActionStep <= ACTION_STEPS.length
  const currentColor = STEP_COLORS[currentStepIndex] || STEP_COLORS[0]

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 transition-all duration-500 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
    >
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl" onClick={onClose} />

      <div
        className={`relative w-full max-w-5xl rounded-2xl transition-all duration-700 transform ${isContentVisible ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-8 opacity-0"
          }`}
        style={{
          background: "linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(2,6,23,0.99) 100%)",
          border: `1px solid rgba(255,255,255,0.1)`,
          boxShadow: `0 0 100px ${currentColor.hex}15, 0 25px 80px -20px rgba(0,0,0,0.8)`,
        }}
      >
        {/* Top gradient accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
          style={{
            background: `linear-gradient(90deg, transparent, ${currentColor.hex}, transparent)`,
          }}
        />

        {/* Header - kompaktní */}
        <div className="relative border-b border-white/5 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Circular progress - menší */}
              <CircularProgress progress={progress} size={70} strokeWidth={5} color={currentColor.hex}>
                <div className="text-center">
                  <p className="font-mono text-lg font-black" style={{ color: currentColor.hex }}>
                    {Math.round(progress)}%
                  </p>
                </div>
              </CircularProgress>

              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-black text-white tracking-tight">{room.name}</h2>
                  {isInOperation && (
                    <span
                      className="px-3 py-1 rounded-lg text-xs font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${currentColor.hex}40, ${currentColor.hex}20)`,
                        color: currentColor.hex,
                        border: `1px solid ${currentColor.hex}50`,
                      }}
                    >
                      {ACTION_STEPS[currentStepIndex]}
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-sm">
                  {room.department || "Bez oddělení"}
                  <span className="mx-2 text-slate-600">•</span>
                  <span className="text-slate-500">
                    Krok {Math.max(1, currentStepIndex + 1)} z {ACTION_STEPS.length}
                  </span>
                </p>
              </div>
            </div>

            {/* Timer and close */}
            <div className="flex items-center gap-6">
              {isInOperation && (
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-0.5">
                    Doba operace
                  </p>
                  <p
                    className="font-mono text-2xl font-black tabular-nums tracking-tight"
                    style={{
                      color: currentColor.hex,
                      textShadow: `0 0 30px ${currentColor.hex}50`,
                    }}
                  >
                    {elapsedTime}
                  </p>
                </div>
              )}
              <button
                onClick={onClose}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 group"
              >
                <X size={20} className="text-slate-400 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="p-6">
          {/* Aktuální a následující krok */}
          {isInOperation && (
            <div className="mb-6">
              <StepProgressCards
                currentStepIndex={currentStepIndex}
                room={room}
                onNextStep={() => {
                  // Zde by byla logika pro přechod na další krok
                  console.log("[v0] Next step clicked")
                }}
              />
            </div>
          )}

          {/* Timeline - horizontální */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${currentColor.hex}30, ${currentColor.hex}10)`,
                  border: `1px solid ${currentColor.hex}30`,
                }}
              >
                <Timer size={16} style={{ color: currentColor.hex }} />
              </div>
              <h3 className="text-sm font-bold text-white">Průběh výkonu</h3>
            </div>

            {/* Horizontální timeline */}
            <div className="flex justify-between items-start px-2">
              {ACTION_STEPS.map((step, index) => {
                const isCompleted = index < currentStepIndex
                const isActive = index === currentStepIndex
                const timestamp = room.phaseTimestamps[index]
                const duration = stepDurations[index]
                const stepColor = STEP_COLORS[index]

                return (
                  <TimelineStep
                    key={index}
                    step={step}
                    index={index}
                    isCompleted={isCompleted}
                    isActive={isActive}
                    timestamp={timestamp}
                    duration={duration}
                    stepColor={stepColor}
                    totalSteps={ACTION_STEPS.length}
                  />
                )
              })}
            </div>
          </div>

          {/* Team a časy - vedle sebe */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Team cards */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${currentColor.hex}30, ${currentColor.hex}10)`,
                    border: `1px solid ${currentColor.hex}30`,
                  }}
                >
                  <User size={16} style={{ color: currentColor.hex }} />
                </div>
                <h3 className="text-sm font-bold text-white">Tým</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TeamMemberCard
                  type="doctor"
                  name={anesthesiologist?.name || null}
                  status={statusInfo}
                  isActive={isInOperation}
                  delay={100}
                />
                <TeamMemberCard type="nurse" name={nurse?.name || null} isActive={isInOperation} delay={200} />
              </div>
            </div>

            {/* Time info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${currentColor.hex}30, ${currentColor.hex}10)`,
                    border: `1px solid ${currentColor.hex}30`,
                  }}
                >
                  <Clock size={16} style={{ color: currentColor.hex }} />
                </div>
                <h3 className="text-sm font-bold text-white">Časy</h3>
              </div>
              <div
                className="rounded-xl p-4 border border-white/10"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                }}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-black/20 border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Začátek</p>
                    <p className="font-mono text-lg font-bold text-white">{formatTime(room.operationStartTime)}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-black/20 border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Odhad</p>
                    <p className="font-mono text-lg font-bold text-white">{formatTime(room.operationEndTime)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoomDetailModal
