'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Cuboid,
  FilePlus2,
  RefreshCw,
  Save,
  WandSparkles,
} from 'lucide-react';
import type { OperatingRoom } from '../types';
import ModulePageHeading from './ModulePageHeading';
import { useHospital } from '../contexts/HospitalContext';
import { useSpatialProject } from '../hooks/useSpatialProject';
import {
  autoLinkSpatialRooms,
  createDefaultSpatialProject,
  type BuildingProject,
} from '../lib/spatial-project';
import {
  mountEditor,
  type EditorHandle,
} from '../vendor/orms-spatial-editor/src/editor.js';

function EditorCanvas({
  initialProject,
  externalRooms,
  onChange,
  onHandle,
}: {
  initialProject: BuildingProject;
  externalRooms: Array<{ id: string; name: string }>;
  onChange: (project: BuildingProject) => void;
  onHandle: (handle: EditorHandle | null) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const initialRef = useRef(initialProject);
  const onChangeRef = useRef(onChange);
  const onHandleRef = useRef(onHandle);
  onChangeRef.current = onChange;
  onHandleRef.current = onHandle;

  useEffect(() => {
    if (!rootRef.current) return;
    const handle = mountEditor(rootRef.current, {
      project: initialRef.current,
      externalRooms,
      storageKey: null,
      onChange: (project) => onChangeRef.current(project),
    });
    onHandleRef.current(handle);
    return () => {
      onHandleRef.current(null);
      handle.dispose();
    };
  }, []);

  return <div ref={rootRef} className="spatial-editor-host h-full w-full" />;
}

export default function SpatialEditorManager({ rooms }: { rooms: OperatingRoom[] }) {
  const { activeHospitalId, activeHospital } = useHospital();
  const { project, revision, updatedAt, isLoading, error, save, reload } = useSpatialProject(rooms);
  const [draft, setDraft] = useState<BuildingProject | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const editorRef = useRef<EditorHandle | null>(null);
  const externalRooms = useMemo(() => rooms.map(({ id, name }) => ({ id, name })), [rooms]);
  const externalRoomsKey = JSON.stringify(externalRooms);
  const editorKey = `${activeHospitalId || 'none'}:${revision}:${project.id}:${externalRoomsKey}`;

  useEffect(() => {
    setDraft(project);
    setDirty(false);
    setMessage(null);
  }, [activeHospitalId, project, revision]);

  const current = draft ?? project;

  const replaceProject = (next: BuildingProject, notice: string) => {
    setDraft(next);
    setDirty(true);
    setMessage(notice);
    editorRef.current?.setProject(next);
  };

  const handleSave = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      await save(draft, revision);
      setDirty(false);
      setMessage('Dispozice byla bezpečně uložena do databáze.');
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : 'Dispozici se nepodařilo uložit.');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoLink = () => replaceProject(
    autoLinkSpatialRooms(current, rooms),
    'Vazby byly doplněny. Zkontrolujte je a dispozici uložte.',
  );

  const handleReset = () => replaceProject(
    createDefaultSpatialProject(rooms, activeHospitalId, activeHospital?.hospital_name),
    'Byla připravena nová výchozí dispozice. Změna zatím není uložená.',
  );

  const handleReload = async () => {
    await reload();
    setDirty(false);
    setMessage('Načtena poslední uložená verze.');
  };

  return (
    <div className="spatial-settings-module min-h-full w-full pb-8 font-sans">
      <header className="mb-5 flex min-w-0 items-end justify-between gap-4">
        <ModulePageHeading
          icon={Cuboid}
          kicker="SPATIAL CONTROL"
          title="3D"
          mutedTitle="DISPOZICE"
          titleClassName="truncate"
        />
        <div className="spatial-editor-icon-bar" aria-label="Akce 3D dispozice">
          <button type="button" onClick={handleAutoLink} disabled={rooms.length === 0 || isLoading || saving} className="spatial-editor-icon-action" aria-label="Doplnit vazby" title="Doplnit vazby">
            <WandSparkles />
          </button>
          <button type="button" onClick={handleReset} disabled={isLoading || saving} className="spatial-editor-icon-action" aria-label="Nová dispozice" title="Nová dispozice">
            <FilePlus2 />
          </button>
          <button type="button" onClick={handleReload} disabled={isLoading || saving} className="spatial-editor-icon-action" aria-label="Načíst uloženou dispozici" title="Načíst uloženou dispozici">
            <RefreshCw className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving || isLoading}
            className={`spatial-editor-icon-action ${dirty ? 'is-active' : 'is-saved'}`}
            aria-label={saving ? 'Ukládám dispozici' : dirty ? 'Uložit dispozici' : 'Dispozice je uložena'}
            title={saving ? 'Ukládám dispozici' : dirty ? 'Uložit dispozici' : updatedAt ? `Uloženo ${new Date(updatedAt).toLocaleString('cs-CZ')}` : 'Dispozice je uložena'}
          >
            {saving ? <RefreshCw className="animate-spin" /> : dirty ? <Save /> : <Check />}
          </button>
        </div>
      </header>

      <p className="sr-only" role="status" aria-live="polite">
        {message || error?.message || (dirty ? 'Dispozice obsahuje neuložené změny.' : 'Dispozice je uložena.')}
      </p>

      <section className="spatial-editor-frame h-[max(680px,calc(100dvh-185px))] min-h-[680px] overflow-hidden rounded-xl border border-white/[0.07]">
        {isLoading ? (
          <div className="grid h-full place-items-center text-sm text-white/42">Načítám prostorový editor…</div>
        ) : (
          <EditorCanvas
            key={editorKey}
            initialProject={project}
            externalRooms={externalRooms}
            onChange={(next) => {
              setDraft(next);
              setDirty(true);
              setMessage(null);
            }}
            onHandle={(handle) => { editorRef.current = handle; }}
          />
        )}
      </section>
    </div>
  );
}
