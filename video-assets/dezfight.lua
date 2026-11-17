-- deZFight: finds visible same-facing coplanar overlapping faces of block parts (z-fighting = flickering textures)
-- and grows the smaller part slightly along that axis so one face clearly wins. Returns number of fixes.
-- opts.skip(part)->bool excludes parts; opts.pairSkip(a,b)->bool excludes pairs; opts.dry=true only reports.
local function deZFight(root,opts)
  opts=opts or {}
  local EPS,GROW=0.04,0.1
  local parts={}
  for _,d in root:GetDescendants() do
    if d:IsA("Part") and d.Shape==Enum.PartType.Block and d.Transparency<0.95 and d.Size.Magnitude<300 and not (opts.skip and opts.skip(d)) then table.insert(parts,d) end
  end
  local function axes(p) local c=p.CFrame return {c.RightVector,c.UpVector,c.LookVector},{p.Size.X/2,p.Size.Y/2,p.Size.Z/2} end
  local report={} local fixes=0
  for pass=1,8 do
    local changed=0
    for i=1,#parts do local a=parts[i] local ra=a.Size.Magnitude/2
      for j=i+1,#parts do local b=parts[j]
        if (a.Position-b.Position).Magnitude<ra+b.Size.Magnitude/2 and not (opts.pairSkip and opts.pairSkip(a,b)) then
          local A_,ha=axes(a) local B_,hb=axes(b) local done=false
          for ka=1,3 do if done then break end for kb=1,3 do if done then break end
            local d=A_[ka]:Dot(B_[kb])
            if math.abs(d)>0.999 then
              for _,sa in {1,-1} do if done then break end
                local n=A_[ka]*sa
                if n.Y>-0.9 then
                  local sb=(d>0) and sa or -sa
                  local fa=a.Position+n*ha[ka] local fb=b.Position+B_[kb]*sb*hb[kb]
                  local off=(fb-fa):Dot(n)
                  if math.abs(off)<EPS then
                    -- in-plane overlap of the two face rectangles
                    local u1,v1=A_[ka%3+1],A_[(ka+1)%3+1] local hu,hv=ha[ka%3+1],ha[(ka+1)%3+1]
                    local bu,bv=B_[kb%3+1],B_[(kb+1)%3+1] local hbu,hbv=hb[kb%3+1],hb[(kb+1)%3+1]
                    local dd=fb-fa local mu,Mu,mv,Mv=math.huge,-math.huge,math.huge,-math.huge
                    for _,s in {{1,1},{1,-1},{-1,1},{-1,-1}} do local p=dd+bu*hbu*s[1]+bv*hbv*s[2] local x,y=p:Dot(u1),p:Dot(v1)
                      mu=math.min(mu,x) Mu=math.max(Mu,x) mv=math.min(mv,y) Mv=math.max(Mv,y) end
                    local ox=math.min(Mu,hu)-math.max(mu,-hu) local oy=math.min(Mv,hv)-math.max(mv,-hv)
                    if ox>0.03 and oy>0.03 then
                      -- grow the smaller part on the conflicting axis
                      local va=a.Size.X*a.Size.Y*a.Size.Z local vb=b.Size.X*b.Size.Y*b.Size.Z
                      local g,k=b,kb if va<vb then g,k=a,ka end
                      if opts.lock and opts.lock(g) then if g==a then g,k=b,kb else g,k=a,ka end end
                      if not (opts.lock and opts.lock(g)) then
                        if not opts.dry then local s=g.Size g.Size=s+(k==1 and Vector3.new(GROW,0,0) or k==2 and Vector3.new(0,GROW,0) or Vector3.new(0,0,GROW)) end
                        table.insert(report,a:GetFullName().."|"..b:GetFullName()) changed+=1 fixes+=1 done=true
                      end
                    end
                  end
                end
              end
            end
          end end
        end
      end
    end
    if changed==0 or opts.dry then break end
  end
  return fixes,report
end
