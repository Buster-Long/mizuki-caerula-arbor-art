// Reference-guided root system, authored offline for the existing TreeFBR / Proton pipeline.
import {BufferGeometry,Float32BufferAttribute,CatmullRomCurve3,Vector3} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export function buildDeepBlueRoots(){
  const meshes=[],parts=[];
  let seed=2401024;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  function root(name,points,radius,segments=36,sides=8,flatten=1){
    const curve=new CatmullRomCurve3(points.map(p=>new Vector3(...p))),frames=curve.computeFrenetFrames(segments,false);
    const pos=[],uv=[],index=[],phase=random()*6.28;
    for(let i=0;i<=segments;i++){
      const t=i/segments,p=curve.getPointAt(t),r=typeof radius==='function'?radius(t):radius*Math.pow(1-t,.85)+.002;
      for(let j=0;j<=sides;j++){
        const a=j/sides*Math.PI*2,groove=1+.095*Math.sin(a*5+t*7+phase)+.035*Math.cos(a*9-t*11);
        const v=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*r*groove).addScaledVector(frames.binormals[i],Math.sin(a)*r*flatten*groove);
        pos.push(v.x,v.y,v.z);uv.push(j/sides*.64+.10,t*.81+.06);
        if(i<segments&&j<sides){const k=i*(sides+1)+j;index.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}
      }
    }
    const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(pos,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();
    meshes.push(g);parts.push({name,triangles:index.length/3});return curve;
  }
  // A thick suspended root collar, wrapped by twisting bundles. No crown or leaves.
  root('suspended central root collar',[[.18,10.1,-.20],[-.22,8.5,-.12],[.25,6.4,.05],[0,4.65,.12],[.18,3.45,.02]],t=>.55+.18*Math.sin(t*3.14)-t*.27,70,14,.86);
  for(let i=0;i<7;i++){
    const phase=i/7*Math.PI*2,pts=[];
    for(let j=0;j<9;j++){
      const t=j/8,a=phase+t*3.5,r=.40+Math.sin(t*3.14)*.19;
      pts.push([Math.cos(a)*r+.12*Math.sin(t*6),10.5-t*6.5,Math.sin(a)*r-.10]);
    }
    root(`twisted axial bundle ${i+1}`,pts,t=>.12+.09*Math.sin(t*3.14)-.055*t,62,9,.72);
  }
  // Main buttress roots bend outward and down; deliberately asymmetric spacing.
  const main=[];
  for(let i=0;i<15;i++){
    const angle=i/15*Math.PI*2+.17,dx=Math.cos(angle),dz=Math.sin(angle),reach=6.2+random()*2.6;
    const crown=4.5+random()*1.0,front=dz*3.6;
    const pts=[[dx*.21,crown,dz*.21],[dx*.9,crown-.8,dz*.7],[dx*2.5,3.0+random()*1.3,dz*1.6],[dx*(reach*.66),1.5+random()*1.3,front*.78],[dx*reach,.23+random()*.60,front]];
    const curve=root(`radial buttress root ${i+1}`,pts,t=>(.30+randomFixed(i)*.12)*Math.pow(1-t,1.05)+.009,52,10,i%3===0?.60:.85);
    main.push(curve);
    for(let j=0;j<7;j++){
      const t=.24+j*.095,p=curve.getPointAt(t),tangent=curve.getTangentAt(t),side=(j%2?1:-1),span=1.0+random()*2.0;
      const end=[p.x+dx*span+dz*side*.9,Math.max(.17,p.y-1.1-random()*1.8),p.z+dz*span*.35-dx*side*.65];
      const b=root(`buttress branch ${i+1}.${j+1}`,[p.toArray(),[p.x+tangent.x*.7,p.y-.35,p.z+tangent.z*.7],[end[0]-.2*dx,end[1]+.45,end[2]+.16],end],.066*(1-t)+.012,24,6,.8);
      for(let k=0;k<2;k++){
        const pp=b.getPointAt(.47+k*.21),sign=k?1:-1;
        root(`fine lateral root ${i+1}.${j+1}.${k+1}`,[pp.toArray(),[pp.x+dx*.35+dz*sign*.25,pp.y-.38,pp.z+dz*.15],[pp.x+dx*.65+dz*sign*.65,Math.max(.12,pp.y-.95-random()*.65),pp.z+dz*.40-dx*sign*.33]],.015+random()*.012,15,5);
      }
    }
  }
  // Elevated lateral roots seen on both sides of the reference's central junction.
  for(const sign of [-1,1])for(let i=0;i<2;i++){
    const z=(i-.5)*1.15,rise=sign>0?1.0:-.4,reach=5.6+random()*1.5;
    const c=root(`raised lateral root ${sign}.${i}`,[[sign*.15,5.05,z*.2],[sign*1.6,4.15+i*.2,z],[sign*3.4,4.4+rise+i*.65,z-.5],[sign*(reach*.82),4.6+rise+i*.7,z+.2],[sign*reach,4.8+rise+i*.65,z+.6]],.27-i*.055,50,9,.77);
    for(let j=0;j<11;j++){
      const p=c.getPointAt(.22+random()*.71),up=random()>.52,spread=.55+random()*1.4,dz=(random()-.5)*1.4;
      root(`raised rootlets ${sign}.${i}.${j}`,[p.toArray(),[p.x+sign*.33,p.y+(up?.22:-.27),p.z+dz*.35],[p.x+sign*spread*.7,p.y+(up?.6:-.65),p.z+dz],[p.x+sign*spread,p.y+(up?1.05+random()*.5:-1.25-random()),p.z+dz*.8]],.025+random()*.022,22,6);
    }
  }
  // Fine central root curtains, separated strands rather than one solid cone.
  for(let i=0;i<86;i++){
    const a=random()*6.28,spread=.4+random()*2.2,startY=3.8+random()*1.5;
    const x=Math.cos(a)*(.35+random()*.6),z=Math.sin(a)*(.30+random()*.55),endX=x+Math.cos(a)*spread,endZ=z+Math.sin(a)*spread*.65;
    root(`hanging capillary root ${i+1}`,[[x,startY,z],[x*.95,startY-1.0,z+.08],[endX*.62,1.1,endZ*.7],[endX,.12+random()*.25,endZ]],.026+random()*.028,27,6,.80);
  }
  // Original distributor expects triangle soup; keep real surface normals and UVs.
  const indexed=mergeGeometries(meshes,false),merged=indexed.toNonIndexed();
  merged.scale(1.15,1,1.08);
  merged.computeBoundingBox();
  const data=Object.fromEntries(['position','normal','uv'].map(k=>[k,Array.from(merged.attributes[k].array,x=>Math.round(x*1e6)/1e6)]));
  const stats={referencePart:'exposed root system; no tree crown or foliage',vertices:data.position.length/3,triangles:data.position.length/9,parts:parts.length,bounds:{min:merged.boundingBox.min.toArray(),max:merged.boundingBox.max.toArray()},nativeMaterial:'TreeFBR',nativeParticles:'Proton 3D Shape + TreeParticleShader'};
  meshes.forEach(g=>g.dispose());indexed.dispose();merged.dispose();return{data,stats};
}
function randomFixed(i){return(.5+.5*Math.sin(i*12.9898+4.1));}
