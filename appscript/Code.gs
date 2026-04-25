const SHEET_ID = "1HvAds6q85NL2qTKeae9MCz46AODdNcdqWPJKpvI0aXI";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SHEET_ID);

    // --- Feuille Opérations ---
    let ws = ss.getSheetByName("Données");
    if (!ws) ws = ss.insertSheet("Données");
    ws.clearContents();
    ws.getRange(1,1,1,11).setValues([["ID","Date","Note","Type","Qty DPF","Gain DPF (DA)","Revenu Flex","Don","Don Versé","Versé","Net"]]);
    if (data.ops && data.ops.length > 0) {
      const rows = data.ops.map(op => {
        const dpfRate = op.dpfRate || 2500;
        const brut = (op.hasDpf ? dpfRate*(op.qty||1) : 0) + (op.hasFlex ? Math.round((op.revenue||0)*0.25) : 0);
        const don = op.donMontant != null ? op.donMontant : Math.round(brut*0.05);
        return [op.id, op.date, op.note||"", op.hasDpf&&op.hasFlex?"Combo":op.hasDpf?"DPF":"Flex", op.qty||0, dpfRate, op.revenue||0, don, op.donVersé?"Oui":"Non", op.versé?"Oui":"Non", brut-don];
      });
      ws.getRange(2,1,rows.length,11).setValues(rows);
    }

    // --- Feuille Versements ---
    let wv = ss.getSheetByName("Versements");
    if (!wv) wv = ss.insertSheet("Versements");
    wv.clearContents();
    wv.getRange(1,1,1,5).setValues([["ID","Date","Note","Montant","Confirmé Ahmed"]]);
    if (data.versements && data.versements.length > 0) {
      const vrows = data.versements.map(v => [v.id, v.date, v.note||"", v.montant, v.confirméAhmed?"Oui":"Non"]);
      wv.getRange(2,1,vrows.length,5).setValues(vrows);
    }

    return ContentService.createTextOutput(JSON.stringify({status:"ok"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status:"error",message:err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // --- Opérations ---
  const ws = ss.getSheetByName("Données");
  let ops = [];
  if (ws && ws.getLastRow() >= 2) {
    const rows = ws.getRange(2,1,ws.getLastRow()-1,11).getValues();
    ops = rows.filter(r=>r[0]).map(r=>({
      id:r[0], date:r[1], note:r[2],
      hasDpf:r[3]==="DPF"||r[3]==="Combo",
      hasFlex:r[3]==="Flex"||r[3]==="Combo",
      qty:r[4], dpfRate:r[5]||2500, revenue:r[6],
      donMontant:r[7]!==Math.round(((r[4]||0)*(r[5]||2500)+(r[6]||0)*0.25)*0.05)?r[7]:null,
      donVersé:r[8]==="Oui",
      versé:r[9]==="Oui"
    }));
  }

  // --- Versements ---
  const wv = ss.getSheetByName("Versements");
  let versements = [];
  if (wv && wv.getLastRow() >= 2) {
    const vrows = wv.getRange(2,1,wv.getLastRow()-1,5).getValues();
    versements = vrows.filter(r=>r[0]).map(r=>({
      id:r[0], date:r[1], note:r[2], montant:r[3], confirméAhmed:r[4]==="Oui"
    }));
  }

  return ContentService.createTextOutput(JSON.stringify({ops, versements}))
    .setMimeType(ContentService.MimeType.JSON);
}
