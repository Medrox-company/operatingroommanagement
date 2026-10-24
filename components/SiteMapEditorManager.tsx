'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  FilePlus2,
  Map as MapIcon,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import ModulePageHeading from './ModulePageHeading';
import { useHospital } from '../contexts/HospitalContext';
import { useSiteProject } from '../hooks/useSiteProject';
import { useConfirm } from './ui/ConfirmDialog';
import { toast } from './ui/toast';
import {
  createDefaultSiteProject,
  type SiteProject,
} from '../vendor/orms-spatial-editor/src/site-model.js';
import {
  mountSiteEditor,
  type SiteEditorHandle,
} from '../vendor/orms-spatial-editor/src/site-editor.js';
import './spatial/spatial-editor-theme.css';
import './spatial/site-map-theme.css';

function SiteEditorCanvas({
  initialProject,
  onChange,
  onHandle,
}: {
  initialProject: SiteProject;
  onChange: (project: SiteProject) => void;
  onHandle: (handle: SiteEditorHandle | null) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const initialRef = useRef(initialProject);
  const onChangeRef = useRef(onChange);
  const onHandleRef = useRef(onHandle);
  onChangeRef.current = onChange;
  onHandleRef.current = onHandle;

  useEffect(() => {
    if (!rootRef.current) return;
    const handle = mountSiteEditor(rootRef.current, {
      project: initialRef.current,
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

/**
 * Mapa areálu ve stejném 3D editoru a vizuálním jazyce jako 3D dispozice sálů.
 * Pavilony, komunikace, parkoviště, zeleň a heliport s nastavitelnou výškou.
 */
export default function SiteMapEditorManager() {
  const { activeHospitalId, activeHospital } = useHospital();
  const { project, storedProject, revision, updatedAt, isLoading, error, save, remove, reload } = useSiteProject();
  const confirm = useConfirm();
  const [draft, setDraft] = useState<SiteProject | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const editorRef = useRef<SiteEditorHandle | null>(null);
  const editorKey = `${activeHospitalId || 'none'}:${revision}:${project.id}`;

  useEffect(() => {
    setDraft(project);
    setDirty(false);
    setMessage(null);
  }, [activeHospitalId, project, revision]);

  const hasProject = Boolean(storedProject) || dirty;

  const handleSave = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      await save(draft, revision);
      setDirty(false);
      setMessage('Mapa areálu byla bezpečně uložena do databáze.');
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : 'Mapu areálu se nepodařilo uložit.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const next = createDefaultSiteProject(activeHospitalId, activeHospital?.hospital_name);
    setDraft(next);
    setDirty(true);
    setMessage('Připraven výchozí návrh areálu. Upravte ho podle skutečnosti a uložte.');
    editorRef.current?.setProject(next);
  };

  const handleReload = async () => {
    await reload();
    setDirty(false);
    setMessage('Načtena poslední uložená verze.');
  };

  const handleDelete = async () => {
    if (saving || deleting || !hasProject) return;
    const accepted = await confirm({
      title: 'Odstranit mapu areálu?',
      description: 'Odstraní se celá 3D mapa areálu včetně pavilonů, komunikací a heliportu. 3D dispozice sálů ani provozní data se nezmění.',
      confirmLabel: 'Odstranit mapu',
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
      setMessage('Mapa areálu byla odstraněna.');
      toast.success('Mapa areálu byla odstraněna');
    } catch (deleteError) {
      const failure = deleteError instanceof Error ? deleteError.message : 'Mapu areálu se nepodařilo odstranit.';
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
          icon={MapIcon}
          kicker="SPATIAL CONTROL"
          title="MAPA"
          mutedTitle="AREÁLU"
        />
      </header>

      <section className="spatial-editor-commandbar" aria-label="Ovládání mapy areálu">
        <div className="spatial-editor-commandbar-copy">
          <h2>Editor areálu</h2>
          <p className="spatial-editor-status" data-state={error ? 'error' : dirty ? 'dirty' : 'saved'} role="status" aria-live="polite">
            {isLoading ? 'Načítám uloženou mapu areálu…' : message || error?.message || (dirty ? 'Mapa areálu obsahuje neuložené změny.' : hasProject ? 'Mapa areálu je uložena.' : 'Mapa areálu zatím není vytvořena.')}
          </p>
        </div>
        <div className="spatial-editor-icon-bar" role="group" aria-label="Akce mapy areálu">
          <button type="button" onClick={handleReset} disabled={isLoading || saving || deleting} className="spatial-editor-icon-action" aria-label="Nová mapa areálu" title="Nová mapa areálu">
            <FilePlus2 />
            <span>Nová mapa</span>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!hasProject || isLoading || saving || deleting}
            className="spatial-editor-icon-action is-danger"
            aria-label={deleting ? 'Odstraňuji mapu areálu' : 'Odstranit mapu areálu'}
            title="Odstranit mapu areálu"
          >
            {deleting ? <RefreshCw className="animate-spin" /> : <Trash2 />}
            <span>{deleting ? 'Odstraňuji…' : 'Odstranit mapu'}</span>
          </button>
          <button type="button" onClick={handleReload} disabled={isLoading || saving || deleting} className="spatial-editor-icon-action" aria-label="Načíst uloženou mapu areálu" title="Načíst uloženou mapu areálu">
            <RefreshCw className={isLoading ? 'animate-spin' : ''} />
            <span>Načíst uloženou</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving || deleting || isLoading}
            className={`spatial-editor-icon-action ${dirty ? 'is-active' : hasProject ? 'is-saved' : ''}`}
            aria-label={saving ? 'Ukládám mapu areálu' : dirty ? 'Uložit mapu areálu' : hasProject ? 'Mapa areálu je uložena' : 'Mapa areálu není vytvořena'}
            title={saving ? 'Ukládám mapu areálu' : dirty ? 'Uložit mapu areálu' : hasProject && updatedAt ? `Uloženo ${new Date(updatedAt).toLocaleString('cs-CZ')}` : hasProject ? 'Mapa areálu je uložena' : 'Mapa areálu není vytvořena'}
          >
            {saving ? <RefreshCw className="animate-spin" /> : dirty || !hasProject ? <Save /> : <Check />}
            <span>{saving ? 'Ukládám…' : dirty || !hasProject ? 'Uložit' : 'Uloženo'}</span>
          </button>
        </div>
      </section>

      <section className="spatial-editor-frame" aria-label="Prostorový editor areálu" aria-busy={isLoading}>
        {isLoading ? (
          <div className="spatial-editor-loading"><RefreshCw className="animate-spin" aria-hidden="true" /><span>Načítám mapu areálu…</span></div>
        ) : hasProject ? (
          <SiteEditorCanvas
            key={editorKey}
            initialProject={draft ?? project}
            onChange={(next) => {
              setDraft(next);
              setDirty(true);
              setMessage(null);
            }}
            onHandle={(handle) => { editorRef.current = handle; }}
          />
        ) : (
          <div className="spatial-editor-empty-state">
            <span><MapIcon /></span>
            <h2>Mapa areálu není vytvořena</h2>
            <p>Založte 3D mapu areálu. Připraví se výchozí návrh s pavilony, komunikacemi a heliportem, který upravíte podle skutečného areálu — včetně výšky heliportu.</p>
            <button type="button" onClick={handleReset}>
              <FilePlus2 />
              Vytvořit mapu areálu
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
