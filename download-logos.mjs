import fs from 'fs';
import path from 'path';

const logos = {
  "total": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/TotalEnergies_logo.svg/512px-TotalEnergies_logo.svg.png",
  "leclerc": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Logo_E.Leclerc_2012.svg/512px-Logo_E.Leclerc_2012.svg.png",
  "carrefour": "https://upload.wikimedia.org/wikipedia/fr/thumb/3/3b/Logo_Carrefour.svg/512px-Logo_Carrefour.svg.png",
  "intermarche": "https://upload.wikimedia.org/wikipedia/fr/thumb/b/b3/Intermarch%C3%A9_logo.svg/512px-Intermarch%C3%A9_logo.svg.png",
  "systeme_u": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Logo_Syst%C3%A8me_U_%282009%29.svg/512px-Logo_Syst%C3%A8me_U_%282009%29.svg.png",
  "esso": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Esso_textlogo.svg/512px-Esso_textlogo.svg.png",
  "bp": "https://upload.wikimedia.org/wikipedia/en/thumb/d/d2/BP_Helios_logo.svg/512px-BP_Helios_logo.svg.png",
  "shell": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e8/Shell_logo.svg/512px-Shell_logo.svg.png",
  "auchan": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Auchan_logo.svg/512px-Auchan_logo.svg.png",
  "casino": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Logo_Groupe_Casino.svg/512px-Logo_Groupe_Casino.svg.png",
  "avia": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/AVIA_logo.svg/512px-AVIA_logo.svg.png",
  "cora": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Logo_Cora.svg/512px-Logo_Cora.svg.png",
  "eni": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Eni_SpA.svg/512px-Eni_SpA.svg.png"
};

const dir = path.join(process.cwd(), 'public', 'logos');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

async function run() {
  for (const [brand, url] of Object.entries(logos)) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(path.join(dir, `${brand}.png`), Buffer.from(buffer));
      console.log(`Downloaded ${brand}`);
    } catch (e) {
      console.log(`Failed ${brand}:`, e);
    }
  }
}

run();
