local t={} for _,c in workspace:GetChildren() do table.insert(t,c.ClassName..":"..c.Name) end local cam=workspace.CurrentCamera return table.concat(t,", ").." | vp="..tostring(cam.ViewportSize)

-- ======== next call ========
local out={} for _,n in {"Locker","Coffin","Bouquet"} do local m=workspace[n] local cf,sz=m:GetBoundingBox() local s=0 local scripts=0 for _,d in m:GetDescendants() do if d:IsA("BasePart") then s+=1 end if d:IsA("LuaSourceContainer") then scripts+=1 end end table.insert(out,n.." pos="..tostring(cf.Position).." size="..tostring(sz).." parts="..s.." scripts="..scripts) end return table.concat(out,"\n")

-- ======== next call ========
local set=Instance.new("Folder") set.Name="Set"
local function part(name,size,cf,color,mat)
 local p=Instance.new("Part") p.Name=name p.Anchored=true p.Size=size p.CFrame=cf p.Color=color p.Material=mat or Enum.Material.SmoothPlastic p.TopSurface=0 p.BottomSurface=0 p.Parent=set return p end
part("Floor",Vector3.new(90,1,26),CFrame.new(0,-0.4,3),Color3.fromRGB(150,155,165),Enum.Material.Marble)
part("WallBack",Vector3.new(90,18,1),CFrame.new(0,9,-6.6),Color3.fromRGB(235,230,215))
part("WallFront",Vector3.new(90,18,1),CFrame.new(0,9,12.6),Color3.fromRGB(235,230,215))
part("Ceiling",Vector3.new(90,1,20),CFrame.new(0,15.5,3),Color3.fromRGB(245,245,245))
for i=-3,3 do local l=part("Light",Vector3.new(6,0.3,2),CFrame.new(i*12,14.9,3),Color3.fromRGB(255,255,240),Enum.Material.Neon) local pl=Instance.new("PointLight") pl.Range=18 pl.Brightness=1.2 pl.Parent=l end
local L=workspace.Locker
local cf,sz=L:GetBoundingBox()
L.Parent=nil
for i=-3,3 do
 local a=L:Clone() a:PivotTo(CFrame.new(i*11.35, sz.Y/2, -5) * (L:GetPivot()-L:GetPivot().Position)) a.Parent=set
 local b=L:Clone() b:PivotTo(CFrame.new(i*11.35, sz.Y/2, 11) * CFrame.Angles(0,math.pi,0) * (L:GetPivot()-L:GetPivot().Position)) b.Parent=set
end
L:Destroy()
set.Parent=workspace
workspace.Baseplate.Transparency=1 workspace.Baseplate.CanCollide=true
local Lt=game:GetService("Lighting") Lt.ClockTime=13 Lt.Brightness=2 Lt.Ambient=Color3.fromRGB(120,120,120) Lt.OutdoorAmbient=Color3.fromRGB(150,150,150)
return "ok "..tostring(sz)

-- ======== next call ========
local set=workspace.Set
for _,c in set:GetChildren() do if c.Name=="Locker" then c:Destroy() end end
workspace.SpawnLocation.CFrame=CFrame.new(300,0.5,300) workspace.SpawnLocation.Transparency=1 for _,d in workspace.SpawnLocation:GetChildren() do if d:IsA("Decal") then d:Destroy() end end
local base=Instance.new("Part") base.Size=Vector3.new(30,1,30) base.Anchored=true base.CFrame=CFrame.new(300,0,300) base.Parent=workspace base.Name="SpawnPad"
local function p(parent,size,cf,col,mat) local x=Instance.new("Part") x.Anchored=true x.Size=size x.CFrame=cf x.Color=col x.Material=mat or Enum.Material.SmoothPlastic x.TopSurface=0 x.BottomSurface=0 x.Parent=parent return x end
local RED=Color3.fromRGB(190,30,35) local DARK=Color3.fromRGB(120,15,20)
local lk=Instance.new("Folder") lk.Name="Lockers" lk.Parent=set
local function row(z,face) -- face = +1 front towards +z
 for i=-20,20 do
  local x=i*2.25
  local m=Instance.new("Model") m.Name="Locker"
  local body=p(m,Vector3.new(2.2,8,2),CFrame.new(x,4,z),RED,Enum.Material.Metal)
  local fz=z+face*1.01
  for v=0,3 do p(m,Vector3.new(1.4,0.08,0.05),CFrame.new(x,7.2-v*0.25,fz),DARK) end
  for v=0,2 do p(m,Vector3.new(1.4,0.08,0.05),CFrame.new(x,1.2-v*0.25,fz),DARK) end
  p(m,Vector3.new(0.18,0.7,0.12),CFrame.new(x+0.75,4.2,fz),Color3.fromRGB(200,200,205),Enum.Material.Metal)
  p(m,Vector3.new(0.05,8,0.06),CFrame.new(x+1.1,4,fz),DARK)
  m.Parent=lk
 end
end
row(-5.5,1) row(11.5,-1)
return #lk:GetChildren()

-- ======== next call ========
local Players=game:GetService("Players")
local cast=workspace:FindFirstChild("Cast") or Instance.new("Folder") cast.Name="Cast" cast.Parent=workspace
cast:ClearAllChildren()
local function mk(name,skin,torso,legs,hair,pos)
 local d=Instance.new("HumanoidDescription")
 d.HeadColor=skin d.LeftArmColor=skin d.RightArmColor=skin d.TorsoColor=torso d.LeftLegColor=legs d.RightLegColor=legs
 if hair then d.HairAccessory=hair end
 local ok,m=pcall(function() return Players:CreateHumanoidModelFromDescription(d,Enum.HumanoidRigType.R15) end)
 if not ok then return "ERR "..tostring(m) end
 m.Name=name m.Parent=cast m:PivotTo(pos)
 m.HumanoidRootPart.Anchored=true
 return name..": "..#m:GetChildren().." acc="..#m.Humanoid:GetAccessories()
end
local skin=Color3.fromRGB(234,184,146)
local r1=mk("Guy",skin,Color3.fromRGB(40,160,70),Color3.fromRGB(45,45,50),nil,CFrame.new(-6,3,2)*CFrame.Angles(0,-math.pi/2,0))
local r2=mk("Girl",skin,Color3.fromRGB(60,100,50),Color3.fromRGB(30,30,35),"376548738",CFrame.new(6,3,2)*CFrame.Angles(0,math.pi/2,0))
return r1.." | "..r2

-- ======== next call ========
local f=workspace.Set.Floor f.Material=Enum.Material.SmoothPlastic f.Color=Color3.fromRGB(170,172,178)
-- tile lines
local tl=Instance.new("Folder") tl.Name="TileLines" tl.Parent=workspace.Set
for x=-44,44,4 do local p=Instance.new("Part") p.Anchored=true p.Size=Vector3.new(0.08,0.02,17) p.CFrame=CFrame.new(x,0.11,3) p.Color=Color3.fromRGB(140,142,150) p.Parent=tl end
for z=-4,10,4 do local p=Instance.new("Part") p.Anchored=true p.Size=Vector3.new(90,0.02,0.08) p.CFrame=CFrame.new(0,0.11,z) p.Color=Color3.fromRGB(140,142,150) p.Parent=tl end
local out={}
for _,id in {63690008, 451220849, 4875445470, 5891240236} do
 local ok,res=pcall(function() local d=Instance.new("HumanoidDescription") d.HairAccessory=tostring(id) local m=game.Players:CreateHumanoidModelFromDescription(d,Enum.HumanoidRigType.R15) local a=m.Humanoid:GetAccessories()[1] local n=a and a.Name or "none" m:Destroy() return n end)
 table.insert(out,id..":"..tostring(res))
end
return table.concat(out," | ")

-- ======== next call ========
local cast=workspace.Cast cast.Girl:Destroy()
local skin=Color3.fromRGB(234,184,146)
local d=Instance.new("HumanoidDescription") d.HeadColor=skin d.LeftArmColor=skin d.RightArmColor=skin d.TorsoColor=Color3.fromRGB(230,120,160) d.LeftLegColor=Color3.fromRGB(70,100,160) d.RightLegColor=Color3.fromRGB(70,100,160) d.HairAccessory="63690008"
local m=game.Players:CreateHumanoidModelFromDescription(d,Enum.HumanoidRigType.R15) m.Name="Girl" m.Parent=cast m:PivotTo(CFrame.new(6,3,2)*CFrame.Angles(0,math.pi/2,0)) m.HumanoidRootPart.Anchored=true
return "ok"

-- ======== next call ========
local g=workspace.Cast.Girl local acc=g.Humanoid:GetAccessories()[1] local h=acc.Handle
local info=h.ClassName
local BROWN=Color3.fromRGB(95,58,35)
if h:IsA("MeshPart") then h.TextureID="" h.Color=BROWN else local sm=h:FindFirstChildOfClass("SpecialMesh") if sm then sm.TextureId="" sm.VertexColor=Vector3.new(0.37,0.23,0.14) info=info.." sm" end h.Color=BROWN end
local head=g.Head
local back=Instance.new("Part") back.Name="BackHair" back.Size=Vector3.new(1.25,1.9,0.35) back.Color=BROWN back.Material=Enum.Material.SmoothPlastic back.CanCollide=false back.Massless=true
back.CFrame=head.CFrame*CFrame.new(0,-0.45,0.5) back.Parent=g
local w=Instance.new("WeldConstraint") w.Part0=head w.Part1=back w.Parent=back
-- bouquet bigger
local b=workspace.Bouquet b:ScaleTo(1.8) for _,p in b:GetDescendants() do if p:IsA("BasePart") then p.Anchored=true p.CanCollide=false end end
-- coffin location + extra flowers
local c=workspace.Coffin c:PivotTo(CFrame.new(-26,0,3)*CFrame.Angles(0,math.pi/2,0)) local cf,sz=c:GetBoundingBox() c:PivotTo(c:GetPivot()+Vector3.new(0,sz.Y/2-cf.Position.Y+0.1,0))
cf,sz=c:GetBoundingBox()
return info.." coffin "..tostring(cf.Position).." "..tostring(sz).." headDecals="..#head:GetChildren()

-- ======== next call ========
local url="https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/020dc38fa72f101172192151a1f042372eb9953d/video-assets/cine_gambar1_test.lua"
local ok,src=pcall(function() return game:GetService("HttpService"):GetAsync(url) end)
if not ok then return "HTTP ERR "..tostring(src) end
local sps=game.StarterPlayer.StarterPlayerScripts
local old=sps:FindFirstChild("Cinematic") if old then old:Destroy() end
local ls=Instance.new("LocalScript") ls.Name="Cinematic" ls.Source=src ls.Parent=sps
game.Players.CharacterAutoLoads=false
return "ok "..#src

-- ======== next call ========
workspace.StreamingEnabled=false
local s=game.StarterPlayer.StarterPlayerScripts.Cinematic
s.Source=s.Source:gsub('local guy=cast:WaitForChild%("Guy"%) local girl=cast:WaitForChild%("Girl"%)','local guy=cast:WaitForChild("Guy") local girl=cast:WaitForChild("Girl") guy:WaitForChild("Head") girl:WaitForChild("Head") task.wait(1)')
return workspace.StreamingEnabled

-- ======== next call ========
local RSt=game.ReplicatedStorage
local sc=RSt:FindFirstChild("Scene") or Instance.new("Folder") sc.Name="Scene" sc.Parent=RSt
for _,n in {"Cast","Bouquet","Coffin"} do local o=workspace:FindFirstChild(n) if o then o.Parent=sc end end
local s=game.StarterPlayer.StarterPlayerScripts.Cinematic
local src=s.Source
local a,b=src:find('local cast=workspace:WaitForChild%("Cast"%)',1)
local c,d=src:find('local coffin=workspace:WaitForChild%("Coffin"%)\n',1)
if not a or not c then return "pattern fail" end
local new=[[local sc=game.ReplicatedStorage:WaitForChild("Scene") task.wait(1)
local cast=sc.Cast:Clone() cast.Parent=workspace
local guy=cast.Guy local girl=cast.Girl
local bouquet=sc.Bouquet:Clone() bouquet.Parent=workspace
local coffin=sc.Coffin:Clone() coffin.Parent=workspace
for _,m in {guy,girl} do for _,p in m:GetDescendants() do if p:IsA("BasePart") then p.Anchored=(p.Name=="HumanoidRootPart") p.CanCollide=false end end local an=m.Humanoid:FindFirstChildOfClass("Animator") if an then an:Destroy() end end
]]
src=src:sub(1,a-1)..new..src:sub(d+1)
src=src:gsub('if c then dec.TextureContent=c end','if c then dec.TextureContent=c print("face set",dec:GetFullName(),name) else warn("no img",name) end')
s.Source=src
return "ok"

-- ======== next call ========
local url="https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/5989c5eef8ea87b4df22f99981f184db4404fac0/video-assets/cine_gambar1_test.lua"
local src=game:GetService("HttpService"):GetAsync(url)
game.StarterPlayer.StarterPlayerScripts.Cinematic.Source=src
return #src

-- ======== next call ========
local src=game:GetService("HttpService"):GetAsync("https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/19c04d7ef26f6d0fa504601bc25914021d666dda/video-assets/cine_gambar1_test.lua")
game.StarterPlayer.StarterPlayerScripts.Cinematic.Source=src return #src

-- ======== next call ========
local src=game:GetService("HttpService"):GetAsync("https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/77417eac6e80e986a79bc29ca5e6adce40c44f4d/video-assets/cine_gambar1_test.lua")
game.StarterPlayer.StarterPlayerScripts.Cinematic.Source=src return #src

-- ======== next call ========
local s=game.StarterPlayer.StarterPlayerScripts.Cinematic
local n s.Source,n=s.Source:gsub("T=T%%LOOP\n",'T=T%%LOOP local fz=workspace:GetAttribute("CineFreeze") if fz then T=fz end\n') return n

-- ======== next call ========
local src=game:GetService("HttpService"):GetAsync("https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/2e4fc3f57c7c8235171e629096562c5e8ba296fb/video-assets/cine_gambar1_test.lua")
game.StarterPlayer.StarterPlayerScripts.Cinematic.Source=src return #src

-- ======== next call ========
local src=game:GetService("HttpService"):GetAsync("https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/57bc72cc9ebcb4ce054a862fd1c0e5d98eaf0ae5/video-assets/cine_gambar1_test.lua")
game.StarterPlayer.StarterPlayerScripts.Cinematic.Source=src return #src

-- ======== next call ========
local src=game:GetService("HttpService"):GetAsync("https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/3b47e49c93460f309129a34d61fb539ae8f11695/video-assets/cine_gambar1_test.lua")
game.StarterPlayer.StarterPlayerScripts.Cinematic.Source=src return #src

-- ======== next call ========
local old=workspace.Set:FindFirstChild("Props") if old then old:Destroy() end
local F=Instance.new("Folder") F.Name="Props"
local function P(size,cf,col,mat,shape) local p=Instance.new("Part") p.Anchored=true p.Size=size p.CFrame=cf p.Color=col p.Material=mat or Enum.Material.SmoothPlastic p.TopSurface=0 p.BottomSurface=0 if shape then p.Shape=shape end p.Parent=F return p end
local C=Color3.fromRGB
local rnd=Random.new(7)
-- upper wall stripe + baseboard both sides
for _,z in {-6.05,12.05} do
 P(Vector3.new(90,0.6,0.1),CFrame.new(0,8.6,z),C(30,60,130))
 P(Vector3.new(90,0.4,0.1),CFrame.new(0,0.3,z+(z<0 and 0.55 or -0.55)),C(60,60,70))
end
-- posters & bulletin boards above lockers (back wall z=-6.1, front wall z=12.1)
local postCols={C(255,200,60),C(80,180,255),C(255,110,140),C(120,220,120),C(200,140,255),C(255,150,60)}
for i=-20,20,4 do
 local x=i*2.25+rnd:NextNumber(-1,1)
 if i%8==0 then
  P(Vector3.new(6,3,0.2),CFrame.new(x,11,-6.0),C(150,100,60),Enum.Material.Wood)
  P(Vector3.new(5.4,2.4,0.1),CFrame.new(x,11,-5.85),C(200,160,110),Enum.Material.Fabric)
  for k=1,4 do P(Vector3.new(1.1,1.4,0.05),CFrame.new(x-2+k*0.85+rnd:NextNumber(-0.2,0.2),11+rnd:NextNumber(-0.4,0.4),-5.78)*CFrame.Angles(0,0,math.rad(rnd:NextNumber(-8,8))),postCols[rnd:NextInteger(1,6)]) end
 else
  P(Vector3.new(2,2.6,0.05),CFrame.new(x,10.9,-6.0)*CFrame.Angles(0,0,math.rad(rnd:NextNumber(-5,5))),postCols[rnd:NextInteger(1,6)])
 end
 P(Vector3.new(2,2.6,0.05),CFrame.new(x+1,10.9,12.05)*CFrame.Angles(0,0,math.rad(rnd:NextNumber(-5,5))),postCols[rnd:NextInteger(1,6)])
end
-- wall clock
local clk=P(Vector3.new(0.2,2,2),CFrame.new(-2,12.5,-6.0)*CFrame.Angles(0,math.rad(90),0),C(250,250,250),nil,Enum.PartType.Cylinder)
P(Vector3.new(0.05,0.8,0.12),CFrame.new(-2,12.8,-5.85),C(20,20,20)) P(Vector3.new(0.6,0.12,0.05),CFrame.new(-1.75,12.5,-5.85),C(20,20,20))
-- banner across hallway
P(Vector3.new(14,1.6,0.15),CFrame.new(-8,13.6,3),C(255,215,0)) 
local sg=Instance.new("SurfaceGui") sg.Face=Enum.NormalId.Front sg.Parent=F:GetChildren()[#F:GetChildren()] local tl=Instance.new("TextLabel",sg) tl.Size=UDim2.fromScale(1,1) tl.BackgroundTransparency=1 tl.Text="SCHOOL DANCE FRIDAY ♥" tl.Font=Enum.Font.GothamBlack tl.TextScaled=true tl.TextColor3=C(200,30,60)
local sg2=sg:Clone() sg2.Face=Enum.NormalId.Back sg2.Parent=sg.Parent
-- trash cans, plants, benches, fountain, extinguisher, backpacks, books, wet floor sign
local function trash(x,z) P(Vector3.new(2.6,1.6,1.6),CFrame.new(x,1.3,z)*CFrame.Angles(0,0,math.rad(90)),C(40,110,60),Enum.Material.Metal,Enum.PartType.Cylinder) P(Vector3.new(0.3,1.7,1.7),CFrame.new(x,2.7,z)*CFrame.Angles(0,0,math.rad(90)),C(30,80,45),Enum.Material.Metal,Enum.PartType.Cylinder) end
trash(-12,-3.6) trash(14,9.6) trash(-30,9.6)
local function plant(x,z) P(Vector3.new(1.6,1.6,1.6),CFrame.new(x,0.9,z),C(180,90,50),Enum.Material.Slate) for k=1,6 do P(Vector3.new(0.4,2.6,0.4),CFrame.new(x,2.6,z)*CFrame.Angles(math.rad(rnd:NextNumber(-30,30)),math.rad(k*60),math.rad(rnd:NextNumber(-30,30))),C(50,150,60),Enum.Material.Grass) end P(Vector3.new(2.2,2.2,2.2),CFrame.new(x,3.6,z),C(60,170,70),Enum.Material.Grass,Enum.PartType.Ball) end
plant(9,-3.8) plant(-18,9.8) plant(24,-3.8)
local function bench(x,z) P(Vector3.new(6,0.4,1.4),CFrame.new(x,1.6,z),C(150,100,60),Enum.Material.Wood) for _,dx in {-2.6,2.6} do P(Vector3.new(0.3,1.5,1.2),CFrame.new(x+dx,0.75,z),C(60,60,65),Enum.Material.Metal) end end
bench(10,9.6) bench(-22,-3.4)
-- water fountain
P(Vector3.new(2,1.2,1.2),CFrame.new(18,3.2,-4.4),C(200,205,210),Enum.Material.Metal) P(Vector3.new(0.6,2.6,0.6),CFrame.new(18,1.3,-4.6),C(180,185,190),Enum.Material.Metal)
-- extinguisher
P(Vector3.new(0.7,1.6,0.7),CFrame.new(-8.3,3,11.5),C(220,20,20),Enum.Material.Metal,nil)
-- backpacks and books scattered
local packCols={C(40,90,200),C(230,120,30),C(150,40,160),C(30,30,30)}
for k,pos in {{-9,-4.2},{7,-4.3},{-15,10.2},{20,10.3}} do local bp=P(Vector3.new(1.4,1.8,0.8),CFrame.new(pos[1],1,pos[2])*CFrame.Angles(0,math.rad(rnd:NextNumber(-30,30)),math.rad(rnd:NextNumber(-10,10))),packCols[k],Enum.Material.Fabric) P(Vector3.new(1,0.7,0.3),bp.CFrame*CFrame.new(0,-0.3,0.5),packCols[k]:Lerp(C(0,0,0),0.3),Enum.Material.Fabric) end
for k=1,6 do P(Vector3.new(1,0.25,1.4),CFrame.new(rnd:NextNumber(-14,-6),0.25+k*0.02,rnd:NextNumber(5,9))*CFrame.Angles(0,math.rad(rnd:NextNumber(0,360)),0),postCols[rnd:NextInteger(1,6)]) end
-- wet floor sign
local s1=P(Vector3.new(1.6,2.4,0.1),CFrame.new(-1,1.2,7)*CFrame.Angles(math.rad(12),math.rad(30),0),C(255,210,0)) local s2=P(Vector3.new(1.6,2.4,0.1),CFrame.new(-1.1,1.2,7.5)*CFrame.Angles(math.rad(-12),math.rad(30),0),C(255,210,0))
for _,s in {s1,s2} do for _,face in {Enum.NormalId.Front,Enum.NormalId.Back} do local g=Instance.new("SurfaceGui",s) g.Face=face local t=Instance.new("TextLabel",g) t.Size=UDim2.fromScale(1,1) t.BackgroundTransparency=1 t.Text="⚠\nWET\nFLOOR" t.TextScaled=true t.Font=Enum.Font.GothamBlack t.TextColor3=C(20,20,20) end end
-- doors with windows at hallway ends of front wall
for _,x in {-30,30} do P(Vector3.new(4,8,0.3),CFrame.new(x,4,12.0),C(120,80,50),Enum.Material.Wood) P(Vector3.new(1.6,2,0.1),CFrame.new(x,5.6,11.8),C(170,210,240),Enum.Material.Glass) end
-- open locker door near crush
P(Vector3.new(0.15,7.6,2),CFrame.new(5.6,4,-3.5)*CFrame.Angles(0,math.rad(-60),0),C(190,30,35),Enum.Material.Metal)
F.Parent=workspace.Set
return #F:GetChildren()

-- ======== next call ========
local src=game:GetService("HttpService"):GetAsync("https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/07fc94198c0f3a308743eb424cc95bc5b1decc06/video-assets/cine_gambar1_test.lua")
game.StarterPlayer.StarterPlayerScripts.Cinematic.Source=src return #src

-- ======== next call ========
local src=game:GetService("HttpService"):GetAsync("https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/f6cfc48064c757c544a3c51050f2b80ac6ff24d5/video-assets/cine_gambar1_test.lua")
game.StarterPlayer.StarterPlayerScripts.Cinematic.Source=src return #src

-- ======== next call ========
local src=game:GetService("HttpService"):GetAsync("https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/d681818b9e73c231851c337970a1c6e29ce19d4e/video-assets/cine_gambar1_test.lua")
game.StarterPlayer.StarterPlayerScripts.Cinematic.Source=src return #src

-- ======== next call ========
local src=game:GetService("HttpService"):GetAsync("https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/b0e736cf27a713710badecb07c0cf205fe2a9599/video-assets/cine_gambar1_test.lua")
game.StarterPlayer.StarterPlayerScripts.Cinematic.Source=src return #src

-- ======== next call ========
local src=game:GetService("HttpService"):GetAsync("https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/dddc3b52d6936c3f6ac8c9e19cdea4781aa236f8/video-assets/cine_gambar1_test.lua")
local s=game.StarterPlayer.StarterPlayerScripts.Cinematic s.Source=src workspace:SetAttribute("CineFreeze",nil) return #src

-- ======== next call ========
local src=game:GetService("HttpService"):GetAsync("https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/88179c3344b046c42448decbe77226eb14dd13e9/video-assets/cine_gambar1_test.lua")
game.StarterPlayer.StarterPlayerScripts.Cinematic.Source=src workspace:SetAttribute("CineFreeze",nil) return #src

-- ======== next call ========
local src=game:GetService("HttpService"):GetAsync("https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/2f148e4b34b14f9845ec643e28d745187164fa54/video-assets/cine_gambar1_test.lua")
game.StarterPlayer.StarterPlayerScripts.Cinematic.Source=src workspace:SetAttribute("CineFreeze",nil) return #src

-- ======== next call ========
local src=game:GetService("HttpService"):GetAsync("https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/46992960f6b6fbbb1c1b315dd0e7a89df21115e5/video-assets/cine_gambar1_test.lua")
game.StarterPlayer.StarterPlayerScripts.Cinematic.Source=src workspace:SetAttribute("CineFreeze",nil) return #src

-- ======== next call ========
local w={} for _,c in workspace:GetChildren() do table.insert(w,c.Name) end local n=0 for _,s in game:GetDescendants() do if s:IsA("LuaSourceContainer") then pcall(function() if s.Parent and s.Parent.Parent==game.StarterPlayer then n+=1 end end) end end local sc={} for _,s in game.StarterPlayer.StarterPlayerScripts:GetChildren() do table.insert(sc,s.Name..":"..#s.Source) end return #workspace:GetDescendants()..' | '..table.concat(w,',')..' | '..table.concat(sc,',')