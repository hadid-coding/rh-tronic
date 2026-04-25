const SHEET_ID = "1HvAds6q85NL2qTKeae9MCz46AODdNcdqWPJKpvI0aXI";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let ws = ss.getSheetByName("Données");
    if (!ws) ws = ss.insertSheet("Données");
    ws.clearContents();
    ws.getRange(1,1,1,10).setValues([["ID","Date","Note","Type","Qty DPF","Gain DPF (DA)","Revenu Flex","Versé","Brut","Net"]]);
    if (data.ops && data.ops.length > 0) {
      const rows = data.ops.map(op => {
        const dpfRate = op.dpfRate || 2500;
        const brut = (op.hasDpf ? dpfRate*(op.qty||1) : 0) + (op.hasFlex ? Math.round((op.revenue||0)*0.25) : 0);
        return [op.id, op.date, op.note||"", op.hasDpf&&op.hasFlex?"Combo":op.hasDpf?"DPF":"Flex", op.qty||0, dpfRate, op.revenue||0, op.versé?"Oui":"Non", brut, Math.round(brut*0.95)];
      });
      ws.getRange(2,1,rows.length,10).setValues(rows);
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
  const ws = ss.getSheetByName("Données");
  if (!ws || ws.getLastRow() < 2) return ContentService.createTextOutput(JSON.stringify({ops:[]})).setMimeType(ContentService.MimeType.JSON);
  const rows = ws.getRange(2,1,ws.getLastRow()-1,10).getValues();
  const ops = rows.filter(r=>r[0]).map(r=>({
    id:r[0], date:r[1], note:r[2],
    hasDpf:r[3]==="DPF"||r[3]==="Combo",
    hasFlex:r[3]==="Flex"||r[3]==="Combo",
    qty:r[4], dpfRate:r[5]||2500, revenue:r[6],
    versé:r[7]==="Oui"
  }));
  return ContentService.createTextOutput(JSON.stringify({ops})).setMimeType(ContentService.MimeType.JSON);
}
