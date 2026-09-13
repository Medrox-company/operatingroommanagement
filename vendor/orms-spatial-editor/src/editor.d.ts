import type {BuildingProject} from './model.js';
export interface ExternalRoomOption { id:string;name:string }
export interface EditorOptions { project?:BuildingProject;onChange?:(project:BuildingProject)=>void;storageKey?:string|null;initialFloorId?:string|null;initialSelectedId?:string|null;externalRooms?:ExternalRoomOption[] }
export interface EditorHandle { getProject():BuildingProject;setProject(project:BuildingProject):void;exportGLB(allFloors?:boolean):Promise<ArrayBuffer>;dispose():void }
export function mountEditor(root:HTMLElement,options?:EditorOptions):EditorHandle;
export function downloadBlob(blob:Blob,name:string):void;
