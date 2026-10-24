import type {Floor} from './model.js';
export type SiteElementType='pavilion'|'heliport'|'parking'|'road'|'plaza'|'green';
/** Objekt areálu. U heliportu je `height` výška plošiny nad terénem, u pavilonu výška budovy. */
export interface SiteElement { id:string; floorId:string; name:string; type:SiteElementType; x:number; z:number; rotation:number; width:number; depth:number; height:number; doorWidth:number; externalId?:string }
export interface SiteProject { schemaVersion:1; kind:'site'; id:string; name:string; units:'m'; floors:[Floor]; rooms:SiteElement[]; items:[] }
export const SITE_KIND:'site';
export const SITE_TYPES:Record<SiteElementType,string>;
export const SITE_FLAT_TYPES:Set<SiteElementType>;
export const STOREY_HEIGHT:number;
export const ROOFTOP_CLEARANCE:number;
export const SITE_LIMITS:{size:[number,number];pavilionHeight:[number,number];heliportHeight:[number,number];heliportSize:[number,number];elements:number};
export function createSiteElement(floorId:string,type?:SiteElementType,x?:number,z?:number):SiteElement;
export function createDefaultSiteProject(hospitalId:string|null,hospitalName?:string|null):SiteProject;
export function validateSiteProject(value:unknown):SiteProject;
export function siteWarnings(project:SiteProject):string[];
export function siteSizeLimits(type:SiteElementType):[number,number];
export function siteHeightLimits(type:SiteElementType):[number,number];
export function clampSiteElement(element:SiteElement):SiteElement;
export function storeysForHeight(height:number):number;
export function pavilionUnder(project:SiteProject,heliport:SiteElement):SiteElement|null;
export function siteBounds(rooms:SiteElement[]):{minX:number;maxX:number;minZ:number;maxZ:number}|null;
export class SiteStore {value:SiteProject;past:SiteProject[];future:SiteProject[];constructor(project:SiteProject);commit(mutator:(p:SiteProject)=>void):SiteProject;replace(p:SiteProject):SiteProject;undo():boolean;redo():boolean}
export function metres(value:number):string;
