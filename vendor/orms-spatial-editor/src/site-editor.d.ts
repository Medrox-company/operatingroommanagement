import type {SiteProject} from './site-model.js';
export interface SiteEditorOptions { project?:SiteProject;onChange?:(project:SiteProject)=>void;initialSelectedId?:string|null }
export interface SiteEditorHandle { getProject():SiteProject;setProject(project:SiteProject):void;exportGLB():Promise<ArrayBuffer>;dispose():void }
export function mountSiteEditor(root:HTMLElement,options?:SiteEditorOptions):SiteEditorHandle;
