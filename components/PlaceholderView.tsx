"use client"

import React from 'react'
import { LucideIcon, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import PageLayout from './PageLayout'

interface PlaceholderViewProps {
  icon?: LucideIcon
  title: string
  description: string
}

const PlaceholderView: React.FC<PlaceholderViewProps> = ({
  icon: Icon = AlertCircle,
  title,
  description,
}) => (
  <PageLayout
    title={title}
    icon={Icon}
    description={description}
  >
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full flex items-center justify-center py-12 md:py-24"
    >
      <div className="max-w-md w-full text-center">
        <div
          className="inline-flex p-8 rounded-3xl border mb-6 backdrop-blur-md"
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <Icon className="w-16 h-16 text-white/40" strokeWidth={1.5} />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white/90 mb-3">
          {title}
        </h2>
        <p className="text-white/50 text-sm leading-relaxed max-w-sm mx-auto">
          {description}
        </p>
      </div>
    </motion.div>
  </PageLayout>
)

export default PlaceholderView
