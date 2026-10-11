'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Cuboid,
  FilePlus2,
  RefreshCw,
  Save,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import type { OperatingRoom } from '../types';
import ModulePageHeading from './ModulePageHeading';
import { useHospital } from '../contexts/HospitalContext';
import { useSpatialProject } from '../hooks/useSpatialProject';
import { useConfirm } from './ui/ConfirmDialog';
import { toast } from './ui/toast';
import {
  autoLinkSpatialRooms,
  createDefaultSpatialProject,
  type BuildingProject,
} from '../lib/spatial-project';
import {
  mountEditor,
  type EditorHandle,
} from '../vendor/orms-spatial-editor/src/editor.js';
import './spatial/spatial-editor-theme.css';

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
  const { project, storedProject, revision, updatedAt, isLoading, error, save, remove, reload } = useSpatialProject(rooms);
  const confirm = useConfirm();
  const [draft, setDraft] = useState<BuildingProject | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
  const hasProject = Boolean(storedProject) || dirty;

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

  const handleDelete = async () => {
    if (saving || deleting || !hasProject) return;
    const accepted = await confirm({
      title: 'Odstranit operační blok?',
      description: 'Odstraní se celá 3D dispozice včetně pater, místností, stěn a vybavení. Provozní data sálů ani výkony se nezmění.',
      confirmLabel: 'Odstranit blok',
      cancelLabel: 'Ponechat',
      danger: true,
    });
    if (!accepted) return;

    setDeleting(true);
    setMessage(null);
    try {
      if (storedProject) await remove(revision);
      setDraft(project);
      setDirty(false);
      setMessage('Operační blok byl odstraněn. Provozní data sálů zůstala zachována.');
      toast.success('Operační blok byl odstraněn');
    } catch (deleteError) {
      const failure = deleteError instanceof Error ? deleteError.message : 'Operační blok se nepodařilo odstranit.';
      setMessage(failure);
      toast.error(failure);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="spatial-settings-module min-h-full w-full pb-8 font-sans">
      <header className="mb-7">
        <ModulePageHeading
          icon={Cuboid}
          kicker="SPATIAL CONTROL"
          title="3D"
          mutedTitle="DISPOZICE"
        />
      </header>

      <section className="spatial-editor-commandbar" aria-label="Ovládání 3D dispozice">
        <div className="spatial-editor-commandbar-copy">
          <h2>Editor dispozice</h2>
          <p className="spatial-editor-status" data-state={error ? 'error' : dirty ? 'dirty' : 'saved'} role="status" aria-live="polite">
            {isLoading ? 'Načítám uloženou dispozici…' : message || error?.message || (dirty ? 'Dispozice obsahuje neuložené změny.' : hasProject ? 'Dispozice je uložena.' : 'Operační blok není vytvořen.')}
          </p>
        </div>
        <div className="spatial-editor-icon-bar" role="group" aria-label="Akce 3D dispozice">
          <button type="button" onClick={handleAutoLink} disabled={!hasProject || rooms.length === 0 || isLoading || saving || deleting} className="spatial-editor-icon-action" aria-label="Doplnit vazby" title="Doplnit vazby">
            <WandSparkles />
            <span>Doplnit vazby</span>
          </button>
          <button type="button" onClick={handleReset} disabled={isLoading || saving || deleting} className="spatial-editor-icon-action" aria-label="Nová dispozice" title="Nová dispozice">
            <FilePlus2 />
            <span>Nová dispozice</span>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!hasProject || isLoading || saving || deleting}
            className="spatial-editor-icon-action is-danger"
            aria-label={deleting ? 'Odstraňuji operační blok' : 'Odstranit operační blok'}
            title="Odstranit operační blok"
          >
            {deleting ? <RefreshCw className="animate-spin" /> : <Trash2 />}
            <span>{deleting ? 'Odstraňuji…' : 'Odstranit blok'}</span>
          </button>
          <button type="button" onClick={handleReload} disabled={isLoading || saving || deleting} className="spatial-editor-icon-action" aria-label="Načíst uloženou dispozici" title="Načíst uloženou dispozici">
            <RefreshCw className={isLoading ? 'animate-spin' : ''} />
            <span>Načíst uloženou</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving || deleting || isLoading}
            className={`spatial-editor-icon-action ${dirty ? 'is-active' : hasProject ? 'is-saved' : ''}`}
            aria-label={saving ? 'Ukládám dispozici' : dirty ? 'Uložit dispozici' : hasProject ? 'Dispozice je uložena' : 'Operační blok není vytvořen'}
            title={saving ? 'Ukládám dispozici' : dirty ? 'Uložit dispozici' : hasProject && updatedAt ? `Uloženo ${new Date(updatedAt).toLocaleString('cs-CZ')}` : hasProject ? 'Dispozice je uložena' : 'Operační blok není vytvořen'}
          >
            {saving ? <RefreshCw className="animate-spin" /> : dirty || !hasProject ? <Save /> : <Check />}
            <span>{saving ? 'Ukládám…' : dirty || !hasProject ? 'Uložit' : 'Uloženo'}</span>
          </button>
        </div>
      </section>

      <section className="spatial-editor-frame" aria-label="Prostorový editor" aria-busy={isLoading}>
        {isLoading ? (
          <div className="spatial-editor-loading"><RefreshCw className="animate-spin" aria-hidden="true" /><span>Načítám prostorový editor…</span></div>
        ) : hasProject ? (
          <EditorCanvas
            key={editorKey}
            initialProject={current}
            externalRooms={externalRooms}
            onChange={(next) => {
              setDraft(next);
              setDirty(true);
              setMessage(null);
            }}
            onHandle={(handle) => { editorRef.current = handle; }}
          />
        ) : (
          <div className="spatial-editor-empty-state">
            <span><Cuboid /></span>
            <h2>Operační blok není vytvořen</h2>
            <p>Založte novou 3D dispozici. Sály se připraví z aktuálního zařízení a následně je můžete prostorově upravit.</p>
            <button type="button" onClick={handleReset}>
              <FilePlus2 />
              Vytvořit operační blok
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
