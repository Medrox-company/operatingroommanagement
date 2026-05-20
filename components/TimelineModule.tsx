import React from 'react';
import TimelineModuleHorizontal from './TimelineModuleHorizontal';
import { OperatingRoom } from '../types';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

/**
 * Timeline Module - Displays operating rooms on a horizontal 24h timeline
 * Wraps TimelineModuleHorizontal component for horizontal layout with:
 * - Left sidebar showing room labels, specializations, and status
 * - Horizontal time markers (07:00 - 07:00 next day)
 * - Color-coded operation bars without operation names
 * - LIVE indicator for active operations
 * - Current time indicator as vertical line
 */
export default function TimelineModule({ rooms }: TimelineModuleProps) {
  return <TimelineModuleHorizontal rooms={rooms} />;
}
