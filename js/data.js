const FRAME_MS = 550;

const person = p => ({
  name: p.name,
  code: p.code,
  nick: p.nick,
  desc: p.desc || "",
  ms: p.ms || FRAME_MS,

  frames: [
    "img/" + p.id + "-1.png",
    "img/" + p.id + "-2.png"
  ],

  physical:[
    p.speed,
    p.strength,
    p.durability,
    p.height,
    p.stamina,
    p.precision
  ].map(v=>v||0),

  mental:[
    p.cognition,
    p.social,
    p.adaptability,
    p.creativity,
    p.composure,
    p.perception
  ].map(v=>v||0)
});

const FILES = [
  person({
    name:"Sample One",
    code:"S-01",
    nick:"The First",
    id:"sample-one",

    speed:10,
    strength:7,
    durability:8,
    height:10,
    stamina:8,
    precision:2,

    cognition:6,
    social:7,
    adaptability:8,
    creativity:10,
    composure:4,
    perception:9,

    desc:"The first. He has seen everything."
  }),

  person({
    name:"Sample Two",
    code:"S-02",
    nick:"The Second",
    id:"sample-two",

    speed:3,
    strength:8,
    durability:7,
    height:9,
    stamina:6,
    precision:2,

    cognition:9,
    social:4,
    adaptability:5,
    creativity:8,
    composure:7,
    perception:6,

    desc:"The Second. He aint really seen much."
  })
];
