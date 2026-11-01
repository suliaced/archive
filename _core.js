/* ============ CHARACTER SYSTEM (don't edit unless you're changing how profiles work) ============

   HOW TO ADD A PERSON:
   1. Copy any file in this folder (e.g. sample-one.js) and rename it, e.g. my-character.js
   2. Change the values inside it. Stats go from 0 to 10.
   3. Add one line to index.html, above the <script src="script.js"> line:
        <script src="files/my-character.js"></script>

   FIELDS:
   id           = start of their drawing file names: img/<id>-1.png and img/<id>-2.png
   desc         = the description box (leave "" for an empty box)
   physicalDesc = text under the physical wheel
   mentalDesc   = text under the mental wheel
   ms           = optional flip speed for this person only (lower = faster)
   guide        = true makes it a text-only guide page (no wheels or drawings)
*/

const FRAME_MS = 550;  /* default drawing flip speed for everyone, in milliseconds */

const FILES = [];      /* every character file adds itself to this list */

const person = p => ({
  name:p.name, code:p.code, nick:p.nick, desc:p.desc||"",
  guide:!!p.guide,
  physicalDesc:p.physicalDesc||"", mentalDesc:p.mentalDesc||"",
  ms:p.ms||FRAME_MS,
  frames:["img/"+p.id+"-1.png","img/"+p.id+"-2.png"],
  physical:[p.speed,p.strength,p.durability,p.height,p.stamina,p.precision].map(v=>v||0),
  mental:[p.cognition,p.social,p.adaptability,p.creativity,p.composure,p.perception].map(v=>v||0)
});

const addFile = p => FILES.push(person(p));
