-- BREAK THE WORLD test scene (Ansaro). Everything is built client-side, deterministic from time T.
local Players=game:GetService("Players")
local RS=game:GetService("RunService")
local Lighting=game:GetService("Lighting")
local SG=game:GetService("StarterGui")
pcall(function() SG:SetCoreGuiEnabled(Enum.CoreGuiType.All,false) end)
pcall(function() SG:SetCore("TopbarEnabled",false) end)
local cam=workspace.CurrentCamera
local V=Vector3.new
local function C3(r,g,b) return Color3.fromRGB(r,g,b) end
local function A(x,y,z) return CFrame.Angles(math.rad(x or 0),math.rad(y or 0),math.rad(z or 0)) end
local function lerp(a,b,t) return a+(b-a)*math.clamp(t,0,1) end
local function ease(t) t=math.clamp(t,0,1) return t*t*(3-2*t) end
local function clamp01(t) return math.clamp(t,0,1) end
local M=Enum.Material
local W=Instance.new("Folder") W.Name="BTW" W.Parent=workspace
local function P(name,size,cf,col,mat,parent,shape)
  local p=Instance.new("Part") p.Name=name p.Size=size p.CFrame=cf or CFrame.new() p.Color=col p.Material=mat or M.SmoothPlastic
  p.Anchored=true p.CanCollide=false p.CanQuery=false p.CanTouch=false p.TopSurface=0 p.BottomSurface=0
  if shape then p.Shape=shape end p.Parent=parent or W return p
end
for _,d in workspace:GetDescendants() do if d:IsA("SpawnLocation") then d.Transparency=1 for _,c in d:GetChildren() do if c:IsA("Decal") then c.Transparency=1 end end end end

-- look
Lighting.ClockTime=14.2 Lighting.Brightness=3 Lighting.OutdoorAmbient=C3(150,150,165) Lighting.GeographicLatitude=30
pcall(function() Lighting.EnvironmentDiffuseScale=1 Lighting.EnvironmentSpecularScale=0.6 end)
local cc=Instance.new("ColorCorrectionEffect") cc.Saturation=0.28 cc.Contrast=0.1 cc.Brightness=0 cc.Parent=Lighting
local atm=Lighting:FindFirstChildOfClass("Atmosphere") if atm then atm.Density=0.25 atm.Haze=0.6 end

-- ===== world =====
local GRASS=C3(96,205,72)
P("Grass",V(1200,1,1200),CFrame.new(0,-0.48,0),GRASS,M.Grass)
-- dirt path
do local a=V(-26,0.04,40) local b=V(0,0.04,19) local n=8
  for i=0,n-1 do local p0=a:Lerp(b,i/n) local p1=a:Lerp(b,(i+1)/n) local m=(p0+p1)/2
    P("Path",V(5+math.sin(i)*0.6,0.08,(p1-p0).Magnitude+1.2),CFrame.lookAt(m,p1)*A(0,math.sin(i*1.7)*6,0),C3(200,165,105),M.Ground) end
  P("PathEnd",V(14,0.08,8),CFrame.new(0,0.04,19),C3(200,165,105),M.Ground)
end
-- trees, bushes, rocks, flowers, hills, clouds
local rng=Random.new(7)
local function tree(x,z,s)
  s=s or 1
  P("Trunk",V(1.2*s,5*s,1.2*s),CFrame.new(x,2.5*s,z),C3(120,78,45),M.Wood)
  P("Leaves",V(6*s,6*s,6*s),CFrame.new(x,6.5*s,z),C3(60,170,60),M.Grass,nil,Enum.PartType.Ball)
  P("Leaves",V(4.5*s,4.5*s,4.5*s),CFrame.new(x+1.6*s,5.6*s,z+1*s),C3(75,185,65),M.Grass,nil,Enum.PartType.Ball)
end
for _,t in {{-30,8,1.2},{-36,-12,1.4},{-24,-26,1.1},{30,20,1.3},{36,-4,1.5},{26,-28,1.2},{-44,26,1.3},{44,34,1.1},{12,-40,1.4},{-10,-44,1.3},{20,46,1.0},{-40,52,1.2}} do tree(t[1],t[2],t[3]) end
for i=1,26 do local x,z=rng:NextNumber(-60,60),rng:NextNumber(-50,60)
  if math.abs(x)>18 or math.abs(z)>22 then if not (z>12 and math.abs(x-(-13+ (z-19)*-0.6))<5) then
    local s=rng:NextNumber(1.6,3) P("Bush",V(s*1.4,s,s*1.4),CFrame.new(x,s*0.35,z),C3(50,150+rng:NextInteger(0,40),55),M.Grass,nil,Enum.PartType.Ball) end end end
for i=1,14 do local x,z=rng:NextNumber(-55,55),rng:NextNumber(-45,55)
  if math.abs(x)>17 or math.abs(z)>20 then local s=rng:NextNumber(1,2.4) P("Rock",V(s*1.5,s,s*1.2),CFrame.new(x,s*0.3,z)*A(0,rng:NextNumber(0,180),0),C3(140,140,145),M.Slate,nil,Enum.PartType.Ball) end end
local FC={C3(255,90,110),C3(255,220,60),C3(255,255,255),C3(170,110,255)}
for i=1,90 do local x,z=rng:NextNumber(-50,50),rng:NextNumber(-40,55)
  if math.abs(x)>16 or math.abs(z)>17 then if math.abs(x)>9 or z<14 or z>30 then
    P("Flower",V(0.5,0.5,0.5),CFrame.new(x,0.25,z),FC[rng:NextInteger(1,4)],M.SmoothPlastic,nil,Enum.PartType.Ball) end end end
for _,h in {{-120,-160,90},{-20,-190,110},{90,-170,100},{180,-120,90},{-190,-90,80}} do
  local hl=P("Hill",V(h[3]*1.6,h[3],h[3]*1.2),CFrame.new(h[1],-h[3]*0.22,h[2]-60),C3(120,205,95),M.SmoothPlastic,nil,Enum.PartType.Ball) hl.CastShadow=false end
for _,c in {{-40,60,-120},{30,70,-140},{90,55,-90},{-100,65,-60}} do
  for k=0,3 do P("Cloud",V(14-k,9-k,12-k),CFrame.new(c[1]+k*7,c[2]+(k%2)*2,c[3]+k),C3(255,255,255),M.SmoothPlastic,nil,Enum.PartType.Ball) end end

-- ===== castle =====
local STONE=C3(158,158,165) local STONE_D=C3(125,125,135) local ROOF=C3(200,60,55)
local FRONT=13 local WH=8
local function stone(size,cf,col) return P("Stone",size,cf,col or STONE,M.Cobblestone) end
stone(V(9.5,WH,2),CFrame.new(-8.25,WH/2,FRONT))
stone(V(9.5,WH,2),CFrame.new(8.25,WH/2,FRONT))
stone(V(7,WH-6.5,2),CFrame.new(0,6.5+(WH-6.5)/2,FRONT))
stone(V(26,WH,2),CFrame.new(0,WH/2,-FRONT))
stone(V(2,WH,26),CFrame.new(-FRONT,WH/2,0))
stone(V(2,WH,26),CFrame.new(FRONT,WH/2,0))
P("Courtyard",V(24,0.1,24),CFrame.new(0,0.05,0),C3(150,128,95),M.Sand)
for i=-3,3 do
  for _,s in {{V(i*3,WH+0.75,FRONT),V(1.6,1.5,2.2)},{V(i*3,WH+0.75,-FRONT),V(1.6,1.5,2.2)},{V(FRONT,WH+0.75,i*3),V(2.2,1.5,1.6)},{V(-FRONT,WH+0.75,i*3),V(2.2,1.5,1.6)}} do
    stone(s[2],CFrame.new(s[1])) end end
for _,sx in {-1,1} do for _,sz in {-1,1} do
  local x,z=sx*FRONT,sz*FRONT
  stone(V(6,12,6),CFrame.new(x,6,z),STONE_D)
  for k=0,3 do local w=7-k*1.6 P("Roof",V(w,1.3,w),CFrame.new(x,12.65+k*1.3,z),ROOF,M.SmoothPlastic) end
  P("Pole",V(0.2,3,0.2),CFrame.new(x,18.6,z),C3(90,70,50),M.Wood)
  P("Flag",V(0.08,1.2,1.8),CFrame.new(x,19.4,z+0.95),C3(255,210,40),M.Fabric)
  P("Window",V(1,1.6,0.1),CFrame.new(x,8,z+3.02*sz),C3(30,30,40))
end end
-- inner decor: barrels, torches, banners
for _,b in {{-9,-9},{-10.5,-7.6},{9,-9.5}} do P("Barrel",V(2,1.6,1.6),CFrame.new(b[1],1,b[2])*A(0,0,90),C3(140,95,55),M.Wood,nil,Enum.PartType.Cylinder) end
for _,x in {-6,6} do P("Banner",V(2,4,0.1),CFrame.new(x,5,-11.95),C3(40,80,200),M.Fabric) P("BannerMark",V(0.8,0.8,0.12),CFrame.new(x,5.4,-11.9),C3(255,210,40),M.SmoothPlastic) end
for _,x in {-4.6,4.6} do P("Torch",V(0.3,1.2,0.3),CFrame.new(x,5,14.15),C3(90,60,40),M.Wood)
  local f=P("Fire",V(0.6,0.8,0.6),CFrame.new(x,5.9,14.15),C3(255,150,30),M.Neon,nil,Enum.PartType.Ball) local l=Instance.new("PointLight") l.Color=C3(255,170,60) l.Range=8 l.Brightness=1.5 l.Parent=f end

-- wooden door (5 planks) in the gate
local WOOD=C3(150,95,50) local WOOD_D=C3(115,70,38)
local planks={}
for i=0,4 do local x=-2.8+i*1.4
  local p=P("Plank",V(1.36,6.5,0.5),CFrame.new(x,3.25,12.6),(i%2==0) and WOOD or C3(160,104,58),M.WoodPlanks)
  local b1=P("Batten",V(1.4,0.5,0.2),CFrame.new(x,1.5,12.9),WOOD_D,M.Wood) local b2=P("Batten",V(1.4,0.5,0.2),CFrame.new(x,5,12.9),WOOD_D,M.Wood)
  table.insert(planks,{p=p,b={b1,b2},cf=p.CFrame,rel={p.CFrame:Inverse()*b1.CFrame,p.CFrame:Inverse()*b2.CFrame}})
end
-- stone pillars + metal grate in front of the gate
local PZ=14.9
local pillarL=stone(V(1.8,7.2,1.8),CFrame.new(-4.8,3.6,PZ),STONE_D)
local pillarR=stone(V(1.8,7.2,1.8),CFrame.new(4.8,3.6,PZ),STONE_D)
local cracks={}
do local segs={{V(0.92,5.2,0.2),V(0.92,4.5,-0.1),A(0,0,25)},{V(0.92,4.5,-0.1),V(0.92,3.6,0.25),A(0,0,-30)},{V(0.92,3.6,0.25),V(0.92,2.6,-0.15),A(0,0,20)},
  {V(0.92,4.3,0.1),V(0.92,4.0,0.6),A(0,0,0)},{V(0.6,4.4,0.92),V(0.1,3.6,0.92),A(0,0,0)},{V(0.1,3.6,0.92),V(-0.4,3.0,0.92),A(0,0,0)}}
  for _,s in segs do local a=pillarR.CFrame*CFrame.new(s[1]-V(0,3.6,0)) local b=pillarR.CFrame*CFrame.new(s[2]-V(0,3.6,0))
    local m=(a.Position+b.Position)/2 local c=P("Crack",V(0.22,0.22,(a.Position-b.Position).Magnitude+0.1),CFrame.lookAt(m,b.Position),C3(35,35,40),M.SmoothPlastic)
    c.Transparency=1 table.insert(cracks,c) end
end
local METAL=C3(70,72,80)
local grate={} local HINGE=CFrame.new(0,0,PZ-0.2)
local function gpart(size,cf,col,mat) local p=P("Grate",size,cf,col or METAL,mat or M.DiamondPlate) table.insert(grate,{p=p,rel=HINGE:Inverse()*cf}) return p end
for i=0,5 do gpart(V(0.35,7.2,0.35),CFrame.new(-3+i*1.2,3.6,PZ-0.2)) end
for j=0,4 do gpart(V(6.6,0.3,0.3),CFrame.new(0,0.9+j*1.45,PZ-0.2)) end
gpart(V(11.4,0.8,0.9),CFrame.new(0,7.6,PZ),C3(55,57,64),M.Metal)
for i=0,5 do local s=gpart(V(0.5,0.5,0.5),CFrame.new(-3+i*1.2,0.1,PZ-0.2)*A(45,0,45),C3(90,92,100),M.Metal) end
for _,x in {-1.5,1.5} do gpart(V(0.2,0.9,0.2),CFrame.new(x,8.4,PZ),C3(40,40,45),M.Metal) end

-- chest
local CHZ=-7.5
P("ChestBody",V(7,3,4),CFrame.new(0,1.5,CHZ),C3(135,80,40),M.WoodPlanks)
for _,x in {-3.45,3.45} do P("ChestTrim",V(0.3,3.05,4.05),CFrame.new(x,1.5,CHZ),C3(240,190,40),M.Metal) end
P("ChestBand",V(7.05,0.3,4.05),CFrame.new(0,0.3,CHZ),C3(240,190,40),M.Metal)
local goldPile={}
table.insert(goldPile,P("GoldPile",V(6.4,0.5,3.4),CFrame.new(0,2.85,CHZ),C3(255,205,40),M.SmoothPlastic))
for i=1,9 do table.insert(goldPile,P("GoldBump",V(1.4,0.9,1.4),CFrame.new(-2.6+((i-1)%5)*1.3,3.05,CHZ-0.9+math.floor((i-1)/5)*1.6),C3(255,215,60),M.SmoothPlastic,nil,Enum.PartType.Ball)) end
for _,g in goldPile do g.Reflectance=0.03 g.Color=C3(240,185,30) end
local chestLight=Instance.new("PointLight") chestLight.Color=C3(255,210,80) chestLight.Range=14 chestLight.Brightness=0 chestLight.Parent=goldPile[1]
local LHINGE=CFrame.new(0,3,CHZ-2)
local lid={}
local function lpart(size,rel,col,mat) local p=P("Lid",size,LHINGE*rel,col,mat) table.insert(lid,{p=p,rel=rel}) end
lpart(V(7.2,1.2,4.2),CFrame.new(0,0.6,2.05),C3(145,88,45),M.WoodPlanks)
lpart(V(7.25,0.3,4.25),CFrame.new(0,0.9,2.05),C3(240,190,40),M.Metal)
lpart(V(1,1,0.3),CFrame.new(0,0.1,4.2),C3(240,190,40),M.Metal)
lpart(V(0.4,0.4,0.32),CFrame.new(0,0.05,4.3),C3(40,30,20),M.SmoothPlastic)

-- ===== rigs =====
local function rig(o)
  local m=Instance.new("Model") m.Name=o.name m.Parent=W
  local r={m=m,ex={}}
  r.T=P("Torso",V(1.8,1.6,1.1),nil,o.torso,o.tmat,m)
  r.H=P("Head",V(1.9,1.8,1.8),nil,o.head,o.hmat,m)
  r.LA=P("LArm",V(0.65,1.5,0.65),nil,o.arm,o.amat,m) r.RA=P("RArm",V(0.65,1.5,0.65),nil,o.arm,o.amat,m)
  r.LL=P("LLeg",V(0.75,1.2,0.75),nil,o.leg,o.lmat,m) r.RL=P("RLeg",V(0.75,1.2,0.75),nil,o.leg,o.lmat,m)
  return r
end
local function ex(r,bone,size,rel,col,mat,shape) local p=P("X",size,nil,col,mat,r.m,shape) table.insert(r.ex,{p=p,bone=bone,rel=rel}) return p end
local function pose(r,root,q)
  q=q or {}
  local function g(k) local v=q[k] if not v then return CFrame.identity end return A(v[1],v[2],v[3]) end
  local F={}
  F.T=root
  F.H=root*CFrame.new(0,0.8,0)*g("neck")*CFrame.new(0,0.9,0)
  F.LA=root*CFrame.new(-1.23,0.55,0)*g("la") F.RA=root*CFrame.new(1.23,0.55,0)*g("ra")
  F.LL=root*CFrame.new(-0.42,-0.8,0)*g("ll") F.RL=root*CFrame.new(0.42,-0.8,0)*g("rl")
  r.T.CFrame=F.T r.H.CFrame=F.H
  r.LA.CFrame=F.LA*CFrame.new(0,-0.65,0) r.RA.CFrame=F.RA*CFrame.new(0,-0.65,0)
  r.LL.CFrame=F.LL*CFrame.new(0,-0.6,0) r.RL.CFrame=F.RL*CFrame.new(0,-0.6,0)
  for _,e in r.ex do e.p.CFrame=F[e.bone]*e.rel end
  r.F=F
end
local function setVis(parts,v) for _,p in parts do p.Transparency=v and 0 or 1 end end
-- thief
local SKIN=C3(245,200,160) local HOOD=C3(85,55,125)
local thief=rig({name="Thief",torso=HOOD,head=SKIN,arm=HOOD,leg=C3(45,45,60)})
ex(thief,"H",V(1.96,0.55,1.86),CFrame.new(0,0.12,0),C3(40,30,55))                -- mask band
for _,sx in {-1,1} do ex(thief,"H",V(0.42,0.32,0.06),CFrame.new(sx*0.42,0.13,-0.94),C3(255,255,255)) end
local pupils={} for _,sx in {-1,1} do table.insert(pupils,ex(thief,"H",V(0.16,0.22,0.06),CFrame.new(sx*0.36,0.11,-0.98),C3(20,20,20))) end
for _,sx in {-1,1} do ex(thief,"H",V(0.55,0.13,0.06),CFrame.new(sx*0.42,0.52,-0.93)*A(0,0,sx*18),C3(40,30,30)) end
local grin={ex(thief,"H",V(0.8,0.14,0.06),CFrame.new(0.05,-0.45,-0.92)*A(0,0,-6),C3(40,20,20)),ex(thief,"H",V(0.5,0.12,0.07),CFrame.new(0.05,-0.36,-0.925),C3(255,255,255))}
local mouthO={ex(thief,"H",V(0.4,0.42,0.06),CFrame.new(0,-0.45,-0.92),C3(60,20,20))}
ex(thief,"H",V(2.0,0.55,1.95),CFrame.new(0,0.92,0),C3(40,30,55))                -- beanie
ex(thief,"H",V(0.6,0.6,0.6),CFrame.new(0,1.35,0.2),C3(240,240,240),nil,Enum.PartType.Ball)
ex(thief,"T",V(1.85,0.3,1.15),CFrame.new(0,-0.55,0),C3(110,70,40))              -- belt
ex(thief,"T",V(0.4,0.35,0.1),CFrame.new(0,-0.55,-0.6),C3(240,190,40),M.Metal)
for _,b in {"LA","RA"} do ex(thief,b,V(0.62,0.5,0.62),CFrame.new(0,-1.45,0),SKIN) end
local HAM={ex(thief,"RA",V(0.28,2.7,0.28),CFrame.new(0,-2.4,0),C3(125,80,45),M.Wood),
  ex(thief,"RA",V(1.2,1.2,1.9),CFrame.new(0,-3.9,0),C3(85,88,98),M.Metal),
  ex(thief,"RA",V(1.25,1.25,0.25),CFrame.new(0,-3.9,-0.5),C3(240,190,40),M.Metal),
  ex(thief,"RA",V(1.25,1.25,0.25),CFrame.new(0,-3.9,0.5),C3(240,190,40),M.Metal)}
local sack={ex(thief,"LA",V(2,2,2),CFrame.new(0,-2.3,0),C3(170,125,70),M.Fabric,Enum.PartType.Ball),
  ex(thief,"LA",V(0.6,0.5,0.6),CFrame.new(0,-1.25,0),C3(120,85,45),M.Fabric),
  ex(thief,"LA",V(0.9,0.9,0.9),CFrame.new(0.35,-1.6,-0.6),C3(255,210,50),M.SmoothPlastic,Enum.PartType.Ball),
  ex(thief,"LA",V(0.7,0.12,0.7),CFrame.new(-0.2,-2.3,-1.0)*A(90,0,0),C3(30,30,30))}
-- knights
local function knight(name,plume)
  local k=rig({name=name,torso=C3(185,190,200),tmat=M.Metal,head=C3(170,175,185),hmat=M.Metal,arm=C3(175,180,190),amat=M.Metal,leg=C3(80,80,90),lmat=M.Metal})
  ex(k,"H",V(1.4,0.22,0.06),CFrame.new(0,0.12,-0.93),C3(20,20,25))
  ex(k,"H",V(0.18,0.6,0.06),CFrame.new(0,-0.25,-0.93),C3(20,20,25))
  ex(k,"H",V(0.35,0.9,1.5),CFrame.new(0,1.25,0.1),plume,M.Fabric)
  ex(k,"T",V(1.85,0.6,0.1),CFrame.new(0,0.2,-0.58),plume,M.Fabric)
  ex(k,"RA",V(0.3,0.7,0.3),CFrame.new(0,-1.6,0),C3(100,60,30),M.Wood)
  ex(k,"RA",V(1.1,0.22,0.35),CFrame.new(0,-1.95,0),C3(220,180,50),M.Metal)
  ex(k,"RA",V(0.18,2.8,0.45),CFrame.new(0,-3.45,0),C3(220,225,235),M.Metal)
  ex(k,"LA",V(1.7,2,0.25),CFrame.new(0,-0.9,-0.48),C3(50,90,200),M.SmoothPlastic)
  ex(k,"LA",V(0.35,1.6,0.27),CFrame.new(0,-0.9,-0.5),C3(255,210,40),M.SmoothPlastic)
  ex(k,"LA",V(1.3,0.35,0.27),CFrame.new(0,-0.6,-0.5),C3(255,210,40),M.SmoothPlastic)
  return k
end
local K1=knight("Knight1",C3(220,40,40)) local K2=knight("Knight2",C3(40,170,220))

-- ===== FX (deterministic ballistic debris) =====
local FX={}
local function fx(e) e.g=e.g or 70 e.half=e.half or 0.3 e.p.Transparency=1 table.insert(FX,e) return e end
local function updFX(T)
  for _,e in FX do local d=T-e.t0
    if d<0 or (e.life and d>e.life) then e.p.Transparency=1 else
      local pos=e.p0+e.v*d+V(0,-0.5*e.g*d*d,0) local rot=e.w*d
      if e.ground and pos.Y<e.half then
        local a=-0.5*e.g local b=e.v.Y local c=e.p0.Y-e.half local disc=math.max(0,b*b-4*a*c)
        local tl=(-b-math.sqrt(disc))/(2*a) local lp=e.p0+e.v*tl+V(0,-0.5*e.g*tl*tl,0)
        local s=(1-math.exp(-(d-tl)*5))/5*0.35
        pos=V(lp.X+e.v.X*s,e.half,lp.Z+e.v.Z*s) rot=e.w*tl+e.w*s*0.3
      end
      local cf=CFrame.new(pos)*A(rot.X,rot.Y,rot.Z)*(e.r0 or CFrame.identity)
      e.p.CFrame=cf
      local tr=e.tr or 0 if e.life and e.fade then tr=lerp(tr,1,d/e.life) end e.p.Transparency=tr
      if e.grow then e.p.Size=e.size*(1+d*e.grow) end
    end end
end
local frng=Random.new(11)
local function sparks(t0,pos,n,col)
  for i=1,n do local p=P("Spark",V(0.25,0.25,0.25),nil,col or C3(255,230,80),M.Neon)
    fx({p=p,t0=t0,life=0.35,fade=true,p0=pos,v=V(frng:NextNumber(-14,14),frng:NextNumber(4,16),frng:NextNumber(-2,12)),w=V(0,0,0),g=40}) end
end
local function dust(t0,pos,n,spread,size)
  for i=1,n do local s=size or 2.2 local p=P("Dust",V(s,s,s),nil,C3(215,205,185),M.SmoothPlastic,nil,Enum.PartType.Ball) p.CastShadow=false
    fx({p=p,t0=t0,life=0.75,fade=true,tr=0.45,p0=pos+V(frng:NextNumber(-spread,spread),frng:NextNumber(0,1),frng:NextNumber(-spread,spread)),v=V(frng:NextNumber(-5,5),frng:NextNumber(1,4),frng:NextNumber(-5,5)),w=V(0,0,0),g=0,grow=0.9,size=V(s,s,s)}) end
end
-- timeline (seconds, after hit-stop remap)
local T_GRATE=2.55 local T_CRACK=5.0 local T_BREAK=6.2 local T_LAND=6.78 local T_DOOR=8.6 local T_K1=11.0 local T_K2=12.5 local T_OPEN=14.0 local T_GOLD=14.45
sparks(T_GRATE,V(0,3.2,PZ+0.3),16)
sparks(T_CRACK,V(5.7,3.4,PZ),8,C3(230,230,230)) dust(T_CRACK,V(5.8,3.4,PZ),3,0.4,1.2)
for i=1,14 do local sz=frng:NextNumber(0.6,1.2) local p=P("Chunk",V(sz,sz*0.8,sz),nil,STONE_D,M.Cobblestone)
  fx({p=p,t0=T_BREAK,ground=true,half=sz*0.4,p0=V(4.8+frng:NextNumber(-0.6,0.6),frng:NextNumber(0.6,6.8),PZ+frng:NextNumber(-0.6,0.6)),v=V(frng:NextNumber(-12,-2),frng:NextNumber(6,18),frng:NextNumber(-3,9)),w=V(frng:NextNumber(-500,500),frng:NextNumber(-500,500),frng:NextNumber(-500,500))}) end
dust(T_BREAK,V(4.8,3,PZ),5,1.0,1.5)
dust(T_LAND,V(0,0.4,PZ+4),9,4.5,1.4)
for i,pl in planks do local pr=fx({p=pl.p,t0=T_DOOR,ground=true,half=0.25,p0=pl.cf.Position,v=V((i-3)*3+frng:NextNumber(-2,2),frng:NextNumber(6,12),-frng:NextNumber(14,22)),w=V(frng:NextNumber(-400,-150),frng:NextNumber(-200,200),frng:NextNumber(-90,90)),r0=CFrame.identity})
  pl.fx=pr end
dust(T_DOOR,V(0,2.5,12.6),6,2,2)
local coins={}
for i=1,46 do local p=P("Coin",V(0.18,0.9,0.9),nil,C3(255,205,40),M.SmoothPlastic,nil,Enum.PartType.Cylinder) p.Reflectance=0.2
  fx({p=p,t0=T_GOLD+frng:NextNumber(0,0.5),ground=true,half=0.09,p0=V(frng:NextNumber(-2.5,2.5),3.3,CHZ+frng:NextNumber(-1,1)),v=V(frng:NextNumber(-9,9),frng:NextNumber(18,30),frng:NextNumber(-4,12)),w=V(frng:NextNumber(-700,700),frng:NextNumber(-700,700),0),g=60}) end
for i=1,12 do local p=P("Glint",V(0.3,0.3,0.3),nil,C3(255,250,180),M.Neon) fx({p=p,t0=T_GOLD+i*0.12,life=0.6,fade=true,p0=V(frng:NextNumber(-3,3),3.5,CHZ+frng:NextNumber(-1.5,1.5)),v=V(0,frng:NextNumber(3,6),0),w=V(0,0,0),g=0}) end

-- ===== GUI =====
local pg=Players.LocalPlayer:WaitForChild("PlayerGui")
local gui=Instance.new("ScreenGui") gui.Name="BTWGui" gui.IgnoreGuiInset=true gui.ResetOnSpawn=false gui.Parent=pg
local black=Instance.new("Frame") black.Size=UDim2.fromScale(1,1) black.BackgroundColor3=Color3.new(0,0,0) black.BorderSizePixel=0 black.Parent=gui
local flash=Instance.new("Frame") flash.Size=UDim2.fromScale(1,1) flash.BackgroundColor3=Color3.new(1,1,1) flash.BorderSizePixel=0 flash.BackgroundTransparency=1 flash.Parent=gui
if workspace:GetAttribute("CineVertical") then
  for _,ax in {0,1} do local sb=Instance.new("Frame") sb.BackgroundColor3=Color3.new(0,0,0) sb.BorderSizePixel=0 sb.AnchorPoint=Vector2.new(ax,0) sb.Position=UDim2.fromScale(ax,0) sb.ZIndex=5 sb.Parent=gui
    local function fit() local v=cam.ViewportSize sb.Size=UDim2.fromOffset(math.max(0,(v.X-v.Y*9/16)/2),v.Y) end fit() cam:GetPropertyChangedSignal("ViewportSize"):Connect(fit) end
end
local function mk(font,col,stroke,pos,sizeY)
  local l=Instance.new("TextLabel") l.BackgroundTransparency=1 l.AnchorPoint=Vector2.new(0.5,0.5) l.Position=pos l.Size=UDim2.fromScale(0.6,sizeY) l.Font=font l.TextScaled=true l.TextColor3=col l.Text="" l.ZIndex=3 l.Parent=gui
  local s=Instance.new("UIStroke") s.Thickness=stroke s.Color=Color3.new(0,0,0) s.Parent=l return l
end
local bang=mk(Enum.Font.LuckiestGuy,C3(255,225,60),4,UDim2.fromScale(0.5,0.22),0.16)
local cap=mk(Enum.Font.GothamBlack,Color3.new(1,1,1),3,UDim2.fromScale(0.5,0.86),0.065)
local title=mk(Enum.Font.LuckiestGuy,C3(255,215,50),6,UDim2.fromScale(0.5,0.17),0.2)
local BANGS={{T_GRATE,"CLANG!",C3(200,220,255)},{T_CRACK,"CRACK!",C3(255,225,60)},{T_BREAK,"BOOM!",C3(255,140,50)},{T_LAND,"CRASH!",C3(255,90,70)},{T_DOOR,"SMASH!",C3(255,180,60)},{T_K1,"BONK!",C3(255,225,60)},{T_K2,"BONK!",C3(120,230,255)},{T_GOLD,"GOLD!",C3(255,215,50)}}
local CAPS={{2.6,4.4,"METAL = UNBREAKABLE"},{4.5,5.0,"FIND THE WEAK POINT..."},{5.0,6.15,"STONE CRACKS..."},{6.2,7.6,"STONE BREAKS!"},{8.6,9.8,"WOOD BREAKS TOO!"}}
local HITS={T_GRATE,T_CRACK,T_BREAK,T_LAND,T_DOOR,T_K1,T_K2}
local function remap(t) local acc=0 for _,h in HITS do local rh=h+acc if t>rh then if t<rh+0.07 then return h end acc+=0.07 end end return t-acc end

-- ===== animation =====
local function swing(T,th,base,impact,recoil)
  local d=T-th
  if d<-0.42 then return base end
  if d<-0.12 then return lerp(base,215,ease((d+0.42)/0.3)) end
  if d<0 then return lerp(215,impact,(d+0.12)/0.12) end
  if recoil then if d<0.18 then return lerp(impact,175,math.sin(d/0.18*math.pi/2)) end if d<0.6 then return lerp(175,base,ease((d-0.18)/0.42)) end return base end
  if d<0.22 then return impact end
  if d<0.55 then return lerp(impact,base,ease((d-0.22)/0.33)) end
  return base
end
local function swingLean(T,th) local d=T-th if d<-0.42 or d>0.55 then return 0 end if d<-0.12 then return lerp(0,10,(d+0.42)/0.3) end if d<0.22 then return -18 end return lerp(-18,0,(d-0.22)/0.33) end
local function at(pos,dir) return CFrame.lookAt(pos,pos+V(dir.X,0,dir.Z)) end
local RUNPH=0
local function runQ(ph,amp,ra) local s=math.sin(ph)*amp return {la={s*0.9,0,-5},ra={ra or 150,0,8},ll={-s,0,0},rl={s,0,0},neck={-6,0,0}} end
local function path(T,t0,t1,a,b) local u=clamp01((T-t0)/(t1-t0)) return a:Lerp(b,u),(b-a).Unit end
local function onGrate(p,T) if T>T_LAND and math.abs(p.X)<5.8 and p.Z>PZ and p.Z<PZ+7.8 then return 0.45 end return 0 end
local function thiefUpdate(T)
  local pos,dir,q,lean,bob=V(-22,0,34),V(0.74,0,-0.67),nil,0,0
  local face="grin"
  if T<2.3 then pos,dir=path(T,0,2.3,V(-22,0,34),V(-1.2,0,18.6)) q=runQ(T*15,45) bob=math.abs(math.sin(T*15))*0.35 lean=-10
  elseif T<3.4 then pos=V(-1.2,0,18.6) dir=V(0,0,-1)
    local d=T-T_GRATE local back=d>0 and math.sin(clamp01(d/0.5)*math.pi/2)*0.8 or 0 pos=pos+V(0,0,back)
    q={la={swing(T,T_GRATE,20,90,true)*0.6,0,-10},ra={swing(T,T_GRATE,150,90,true),0,6},neck={0,d>0.15 and math.sin(d*25)*10*math.max(0,1-d) or 0,0}}
    lean=swingLean(T,T_GRATE) if d>0 and d<0.9 then lean=8*(1-d/0.9) face="o" end
  elseif T<4.5 then local a,b=V(-1.2,0,19.4),V(10.3,0,16)
    pos,dir=path(T,3.4,4.3,a,b) q=runQ(T*15,40) bob=math.abs(math.sin(T*15))*0.3 lean=-8 if T>4.3 then dir=V(-1,0,0) q={la={10,0,-5},ra={150,0,8}} bob=0 lean=0 end
  elseif T<7.0 then pos=V(10.3,0,16) dir=V(-1,0,0)
    q={la={swing(T,T_CRACK,20,95)*0.5+swing(T,T_BREAK,20,95)*0.5-10,0,-10},ra={math.min(swing(T,T_CRACK,150,95),swing(T,T_BREAK,150,95)),0,6},neck={0,0,0}}
    lean=swingLean(T,T_CRACK)+swingLean(T,T_BREAK) if T>T_LAND-0.2 and T<T_LAND+0.5 then face="o" end
  elseif T<8.2 then pos,dir=path(T,7.0,8.0,V(10.3,0,16),V(-1.2,0,16.5)) if T>8.0 then dir=V(0,0,-1) end q=runQ(T*13,35) bob=math.abs(math.sin(T*13))*0.25
    if T>8.0 then q={la={10,0,-5},ra={150,0,8}} bob=0 end
  elseif T<9.0 then pos=V(-1.2,0,16.5) dir=V(0,0,-1) q={la={20,0,-10},ra={swing(T,T_DOOR,150,92),0,6}} lean=swingLean(T,T_DOOR)
  elseif T<10.0 then pos,dir=path(T,9.0,9.9,V(-1.2,0,16.5),V(0,0,3.5)) q=runQ(T*15,42) bob=math.abs(math.sin(T*15))*0.3 lean=-8 if T>9.9 then dir=V(0,0,-1) q={la={10,0,-5},ra={150,0,8}} bob=0 lean=0 end
  elseif T<12.95 then pos=V(0,0,3.5) dir=V(0,0,-1)
    q={la={25,0,-12},ra={math.min(swing(T,T_K1,150,88),swing(T,T_K2,150,88)),0,6},neck={0,0,0}} lean=swingLean(T,T_K1)+swingLean(T,T_K2)
    if T<10.6 then q.neck={0,math.sin(T*6)*20,0} end
  elseif T<13.8 then pos,dir=path(T,12.95,13.75,V(0,0,3.5),V(0,0,-3.6)) q=runQ(T*15,42) bob=math.abs(math.sin(T*15))*0.3 lean=-8 dir=V(0,0,-1)
  elseif T<14.6 then pos=V(0,0,-3.6) dir=V(0,0,-1) local u=clamp01((T-13.8)/0.35) q={la={lerp(10,120,u),0,-10},ra={150,0,8},neck={-10*u,0,0}} if T>T_GOLD then face="o" q.neck={20,0,0} end
  else pos=V(0,0,-3.6) local u=clamp01((T-14.6)/0.5) dir=V(math.sin(u*2.2),0,-math.cos(u*2.2))
    local j=math.max(0,math.sin((T-14.6)*7))  bob=j*1.6
    q={la={175,0,-8+math.sin(T*7)*6},ra={170,0,10},ll={-20*j,0,0},rl={20*j,0,0},neck={-8,0,math.sin(T*3.5)*8}} lean=0
  end
  pos=pos+V(0,onGrate(pos,T),0)
  pose(thief,at(pos+V(0,2+bob,0),dir)*A(lean,0,0),q)
  setVis(grin,face=="grin") setVis(mouthO,face=="o")
  for _,p in pupils do p.Size=(face=="o") and V(0.1,0.12,0.06) or V(0.16,0.22,0.06) end
  setVis(sack,T>14.75)
end
local function knightUpdate(k,T,home,hit,runFrom,runTo,flyV,spinSign,seed)
  local t0=hit-1.1
  if T<t0 then local look=(T>9.6) and (V(0,0,3.5)-home) or V(0,0,1)
    pose(k,at(home+V(0,2,0),look),{la={30,0,-8},ra={55+math.sin(T*2+seed)*6,0,8},neck={0,math.sin(T*1.5+seed)*12,0}})
  elseif T<hit then local u=clamp01((T-t0)/0.95) local p=home:Lerp(runTo,u) local s=math.sin(T*15)*40
    pose(k,at(p+V(0,2+math.abs(math.sin(T*15))*0.3,0),runTo-home)*A(-10,0,0),{la={40,0,-8},ra={lerp(60,160,u),0,8},ll={-s,0,0},rl={s,0,0}})
  else local d=T-hit local g=60 local p0=runTo+V(0,2,0)
    local p=p0+flyV*d+V(0,-0.5*g*d*d,0)
    local tl=(flyV.Y+math.sqrt(flyV.Y^2+2*g*(p0.Y-0.7)))/g
    local rot
    if d<tl then rot=A(-d*720,0,spinSign*d*360)
      pose(k,CFrame.new(p)*rot,{la={150+math.sin(d*30)*30,0,-40},ra={150-math.sin(d*30)*30,0,40},ll={math.sin(d*25)*40,0,0},rl={-math.sin(d*25)*40,0,0}})
    else local lp=p0+flyV*tl+V(0,-0.5*g*tl*tl,0) pose(k,CFrame.new(lp.X,0.7,lp.Z)*A(-90,0,0),{la={160,0,-30},ra={160,0,30}}) end
  end
end
local function shakeAmt(T) local s=0 for _,h in {{T_GRATE,0.5},{T_CRACK,0.4},{T_BREAK,1},{T_LAND,1.4},{T_DOOR,0.8},{T_K1,0.7},{T_K2,0.7},{T_GOLD,0.4}} do local d=T-h[1] if d>0 and d<0.6 then s+=h[2]*math.exp(-d*8) end end return s end
local function look(p,t) return CFrame.lookAt(p,t) end

local LOOP=20.2 local END=19.2
local t0=os.clock()+2
RS:BindToRenderStep("BTW",Enum.RenderPriority.Camera.Value+1,function()
  cam.CameraType=Enum.CameraType.Scriptable
  local raw=os.clock()-t0
  if raw<0 then black.Visible=true return end
  raw=raw%LOOP
  local T=remap(raw) local fz=workspace:GetAttribute("CineFreeze") if fz then T=fz end
  if T>END then black.Visible=true bang.Text="" cap.Text="" title.Text="" return end
  black.Visible=T<0.08
  -- world state
  for _,c in cracks do c.Transparency=(T>=T_CRACK and T<T_BREAK) and 0 or 1 end
  pillarR.Transparency=T<T_BREAK and 0 or 1
  local th=0 if T>T_BREAK+0.05 then local d=T-(T_BREAK+0.05) th=math.min(90,90*(d/0.53)^2) if d>0.53 then local b=d-0.53 th=90-math.abs(math.sin(b*14))*6*math.exp(-b*6) end end
  local tilt=(T>T_BREAK) and math.min(1,(T-T_BREAK)/0.15)*6 or 0
  for _,g in grate do g.p.CFrame=HINGE*A(th,0,-tilt*(1-th/90))*g.rel end
  for _,pl in planks do if T<T_DOOR then pl.p.CFrame=pl.cf pl.p.Transparency=0 end for k,b in pl.b do b.CFrame=pl.p.CFrame*pl.rel[k] b.Transparency=0 end end
  updFX(T)
  for _,pl in planks do if T<T_DOOR then pl.p.CFrame=pl.cf pl.p.Transparency=0 end for k,b in pl.b do b.CFrame=pl.p.CFrame*pl.rel[k] end end
  local la=0 if T>T_OPEN then la=-lerp(0,118,ease((T-T_OPEN)/0.45)) if T>T_OPEN+0.45 then la=-118+math.sin((T-T_OPEN-0.45)*12)*4*math.exp(-(T-T_OPEN-0.45)*4) end end
  for _,l in lid do l.p.CFrame=LHINGE*A(la,0,0)*l.rel end
  chestLight.Brightness=T>T_OPEN and lerp(0,1.5,(T-T_OPEN)/0.4) or 0
  thiefUpdate(T)
  knightUpdate(K1,T,V(-5,0,2),T_K1,nil,V(1.25,0,-0.3),V(-16,38,-4),1,1)
  knightUpdate(K2,T,V(5,0,-1),T_K2,nil,V(1.25,0,-0.3),V(16,40,-4),-1,2)
  -- text
  local bt,bw,bc=-9,"",nil for _,b in BANGS do if T>=b[1] then bt,bw,bc=b[1],b[2],b[3] end end
  local bd=T-bt if bd<0.75 then bang.Text=bw bang.TextColor3=bc local s=1+0.45*math.max(0,1-bd/0.12) bang.Size=UDim2.fromScale(0.6*s,0.16*s) bang.Rotation=math.sin(bt*7)*8 bang.TextTransparency=bd>0.6 and (bd-0.6)/0.15 or 0 else bang.Text="" end
  local ct="" for _,c in CAPS do if T>=c[1] and T<c[2] then ct=c[3] end end cap.Text=ct
  if T>16.9 then local d=T-16.9 title.Text="BREAK THE WORLD" local s=1+0.5*math.max(0,1-d/0.18) title.Size=UDim2.fromScale(0.7*s,0.2*s) title.Rotation=-3 else title.Text="" end
  local fl=1 for _,h in {T_BREAK,T_LAND,T_GOLD} do local d=T-h if d>=0 and d<0.12 then fl=math.min(fl,0.55+d/0.12*0.45) end end flash.BackgroundTransparency=fl
  -- camera
  local cf local fov=55
  if T<2.3 then local u=T/2.3 cf=look(V(-26,30,58):Lerp(V(-14,21,44),ease(u)),V(-8,2,16):Lerp(V(0,3,9),ease(u)))
  elseif T<3.6 then local u=(T-2.3)/1.3 cf=look(V(8,9,28):Lerp(V(6.5,8,26),u),V(0,3.4,15)) fov=lerp(55,48,u)
  elseif T<7.6 then local u=(T-3.6)/4 local k=ease((T-T_BREAK)/0.6) cf=look(V(-3,10,30):Lerp(V(-1,9,29),u):Lerp(V(-2,14,34),k),V(5,3,16):Lerp(V(3,2.5,17),u):Lerp(V(2,1.2,18),k)) fov=lerp(58,52,u)
  elseif T<9.6 then local u=(T-7.6)/2 cf=look(V(6,7.5,26):Lerp(V(4.5,7,24),u),V(0,3,13)) fov=55
  elseif T<13.0 then local u=(T-9.6)/3.4 cf=look(V(lerp(-6,6,u),30,21),V(0,1,-1)) fov=58
  elseif T<16.8 then local u=(T-13)/3.8 cf=look(V(7,10,5):Lerp(V(5.8,8.6,2.6),ease(u)),V(0,2.6,-6)) fov=55
  else local u=(T-16.8)/2.4 cf=look(V(6,9,3):Lerp(V(-5,42,28),ease(u)),V(0,2.5,-5):Lerp(V(0,1,-3),ease(u))) fov=lerp(55,60,u) end
  local sa=shakeAmt(T) cf=cf*CFrame.Angles(math.rad(sa*math.noise(T*30,1)*3),math.rad(sa*math.noise(T*30,2)*3),math.rad(sa*math.noise(T*30,3)*2))
  cam.CFrame=cf cam.FieldOfView=fov
end)
