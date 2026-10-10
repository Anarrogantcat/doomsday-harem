git rm --cached _m.txt -q 2>$null
Remove-Item _m.txt,_cm.ps1,_rm.mjs,_rm2.mjs,_c2.mjs,_coll.mjs,_foldt.mjs,_dom.mjs,_chk.mjs,_ph.mjs,_bigmap.mjs,_t3.mjs,_tier.mjs,_cov.mjs,_def.mjs,_def2.mjs,_en.mjs,_tech.mjs,_tech2.mjs,_veh.mjs,_veh2.mjs,_veh3.mjs,_cmp.mjs,_m8.mjs,_pd.mjs,_pht.mjs,_airshot.mjs,_pshot.mjs,_maptest.mjs,_bmtest.mjs,_vehtest.mjs,_btntest.mjs,_dshot.mjs,_hshot.mjs,_h2.mjs,_rshot.mjs,_csschk.mjs,_full.mjs,_dyn.mjs,_irshot.mjs,_ir2.mjs,_s4.mjs,_solve.mjs,_solve2.mjs,_solve3.mjs,_anneal.mjs,_ann2.mjs,_ann3.mjs,_grid.mjs,_regions.mjs,_maps.mjs,_mchk.mjs,_chk2.mjs,_maptest.mjs,_v2.mjs,_ui4.mjs,_g.mjs,_v.ps1,_vv.ps1,_fold.ps1,_fold2.ps1,_fix.ps1,_bm.ps1,_bm.txt,_inject.txt,_newright.txt,_mdata.txt,_d.log,_srv.log,_uiserver.cjs -Force -ErrorAction SilentlyContinue
git add -A
git commit -q -m 'chore: 清理临时文件'
git log --oneline -3
Write-Host '--- 工作区 ---'
git status --short
Write-Host '(空=干净)'