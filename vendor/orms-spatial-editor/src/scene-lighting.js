/**
 * Chladné studiové světlo podle referenčního dashboardu. Nízká ambientní
 * složka nechává neaktivní sály v tmavě modrošedém stínu, zatímco směrové
 * světlo čitelně vykreslí horní hrany, vybavení a spáry stěn.
 */
export const SCENE_LIGHTING={
 ambient:{color:0x7189c2,ground:0x121a35,intensity:0.12},
 key:{color:0xc1d0f4,intensity:0.78,position:[-14,28,-20]},
 rim:{color:0x5d79b3,intensity:0.12,position:[16,13,-12]},
 fill:{color:0x5871a6,intensity:0.045,position:[-8,12,22]},
  selected:{color:0xffb43a,intensity:360,distance:8.2,decay:2},
 environmentIntensity:0.56,
 exposure:0.8,
  cpu:{ambient:0.44,diffuse:0.53,tint:[0.94,0.96,1.045],shadowStrength:0.34,shadowBias:0.0035,contactStrength:0.035}
};
