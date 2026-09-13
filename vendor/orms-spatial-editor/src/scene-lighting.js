/**
 * Chladné studiové světlo podle referenčního dashboardu. Nízká ambientní
 * složka nechává neaktivní sály v tmavě modrošedém stínu, zatímco směrové
 * světlo čitelně vykreslí horní hrany, vybavení a spáry stěn.
 */
export const SCENE_LIGHTING={
 ambient:{color:0xaebde6,ground:0x20263e,intensity:0.2},
 key:{color:0xb8c9f5,intensity:3.7,position:[-16,30,12]},
 rim:{color:0x8fa6dd,intensity:0.6,position:[14,18,-20]},
 fill:{color:0xa3b5de,intensity:0.08,position:[-8,12,22]},
  selected:{color:0xffbe55,intensity:65,distance:7.2,decay:2},
 environmentIntensity:0.26,
 exposure:0.82,
  cpu:{ambient:0.44,diffuse:0.53,tint:[0.94,0.96,1.045],shadowStrength:0.34,shadowBias:0.0035,contactStrength:0.035}
};
