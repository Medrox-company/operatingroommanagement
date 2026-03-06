'use client';

import React, { useState } from 'react';
import { OperatingRoom } from '@/types';
import { MOCK_ROOMS } from '@/constants';

export default function Page() {
  return (
    <div className="w-full h-screen bg-[#020B17] text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Operating Room Management</h1>
        <p className="text-white/60">Initializing application...</p>
      </div>
    </div>
  );
}
