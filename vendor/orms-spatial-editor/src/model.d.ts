export type RoomType='operating'|'preparation'|'storage'|'recovery'|'corridor'|'staff';
export type AssetKind='table'|'light'|'anesthesia'|'monitor'|'cabinet'|'trolley'|'wallScreen'|'tablet'|'sink'|'bed'|'stool'|'pendant';
export interface Floor { id:string; name:string; elevation:number; perimeterWalls?:boolean; perimeterWallHeight?:number; perimeterWallThickness?:number; knlBoundaryEnabled?:boolean; knlBoundaryOffsetMode?:'corridor'|'manual'; knlBoundaryOffset?:number; knlBoundaryPreset?:'facade'|'bridge'|'solid' }
export interface Room { id:string; floorId:string; name:string; type:RoomType; x:number; z:number; rotation:number; width:number; depth:number; height:number; doorWidth:number; externalId?:string }
export interface Equipment { id:string; floorId:string; roomId:string|null; kind:AssetKind; name:string; x:number; y:number; z:number; rotation:number; scale:number }
export interface BuildingProject { schemaVersion:1; id:string; name:string; units:'m'; floors:Floor[]; rooms:Room[]; items:Equipment[] }
export const VERSION:1;
export const ROOM_TYPES:Record<RoomType,string>;
export const CATALOG:Record<AssetKind,{name:string;size:[number,number,number]}>;
export function demoProject():BuildingProject;
export function validateProject(value:unknown):BuildingProject;
export function createRoom(floorId:string,type?:RoomType,x?:number,z?:number):Room;
export function createItem(floorId:string,roomId:string|null,kind:AssetKind,x?:number,z?:number):Equipment;
export function boundaryOffsetForFloor(floor:Floor,rooms:Room[]):number;
export function furnish(room:Room):Equipment[];
export function transferRoom(project:BuildingProject,roomId:string,floorId:string):void;
export function duplicateRoom(project:BuildingProject,roomId:string):Room;
export function deleteRoom(project:BuildingProject,id:string):void;
export function deleteFloor(project:BuildingProject,id:string):void;
export function warnings(project:BuildingProject):string[];
export function roomsOverlap(a:Room,b:Room):boolean;
export function clone<T>(value:T):T;
export function uid(prefix:string):string;
export function normalizeAngle(degrees:number):number;
export interface RoomSnapResult {x:number;z:number;snappedX:boolean;snappedZ:boolean;guideX:number|null;guideZ:number|null;targetXId:string|null;targetZId:string|null}
export function snapRoomPlacement(room:Room,rooms:Room[],threshold?:number):RoomSnapResult;
export class ProjectStore {value:BuildingProject;past:BuildingProject[];future:BuildingProject[];constructor(project:BuildingProject);commit(mutator:(p:BuildingProject)=>void):BuildingProject;replace(p:BuildingProject):BuildingProject;undo():boolean;redo():boolean}
