/** Reference lighting: cool indigo ambient, broad overhead key, warm active-room light. */
export const SCENE_LIGHTING={
 ambient:{color:0x8197d0,ground:0x202e52,intensity:0.22},
 key:{color:0xcbd9fb,intensity:0.58,position:[-14,28,-20]},
 rim:{color:0x6f8cc8,intensity:0.16,position:[16,13,-12]},
 fill:{color:0x7089bd,intensity:0.09,position:[-8,12,22]},
 selected:{color:0xffb43a,intensity:360,distance:8.2,decay:2},
 exposure:0.78,
 cpu:{ambient:0.44,diffuse:0.53,tint:[0.94,0.96,1.045],shadowStrength:0.34,shadowBias:0.0035,contactStrength:0.035}
};
