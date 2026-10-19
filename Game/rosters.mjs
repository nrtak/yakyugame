export const TEAMS = [
  { id:'coral',name:'Coral Club',short:'CORAL',color:'#dc685d',trim:'#ffe4d4',motto:'Find your swing. Back your team.',
    players:[
      {id:'c1',name:'Maya',number:1,position:'CF',gender:'woman',hair:'pony',skin:'#efbf9d',hairColor:'#4d342e',contact:82,power:73,speed:83,captain:true},
      {id:'c2',name:'Ren',number:6,position:'SS',gender:'man',hair:'short',skin:'#dba77e',hairColor:'#292a2c',contact:83,power:60,speed:88},
      {id:'c3',name:'Emi',number:3,position:'2B',gender:'woman',hair:'bob',skin:'#f0c5a8',hairColor:'#644031',contact:88,power:57,speed:77},
      {id:'c4',name:'Theo',number:24,position:'1B',gender:'man',hair:'curly',skin:'#8b583e',hairColor:'#31271f',contact:70,power:91,speed:51},
      {id:'c5',name:'Hana',number:7,position:'RF',gender:'woman',hair:'short',skin:'#ddb28c',hairColor:'#302923',contact:76,power:78,speed:73},
      {id:'c6',name:'Leo',number:12,position:'3B',gender:'man',hair:'wave',skin:'#edc2a4',hairColor:'#885735',contact:74,power:80,speed:65},
      {id:'c7',name:'Nora',number:8,position:'LF',gender:'woman',hair:'pony',skin:'#ad7754',hairColor:'#382b25',contact:79,power:64,speed:85},
      {id:'c8',name:'Ben',number:2,position:'C',gender:'man',hair:'short',skin:'#e9b997',hairColor:'#4b342a',contact:71,power:75,speed:54},
      {id:'c9',name:'Yui',number:11,position:'P',gender:'woman',hair:'bob',skin:'#edc7ad',hairColor:'#272c35',contact:65,power:54,speed:68}
    ]},
  { id:'navy',name:'Navy Club',short:'NAVY',color:'#294965',trim:'#c5e2f0',motto:'Play smart. Finish together.',
    players:[
      {id:'n1',name:'Kai',number:10,position:'P',gender:'man',hair:'wave',skin:'#edbc96',hairColor:'#5b3b2c',contact:81,power:76,speed:77,captain:true},
      {id:'n2',name:'Aiko',number:4,position:'2B',gender:'woman',hair:'bob',skin:'#e7b998',hairColor:'#2d292b',contact:86,power:58,speed:84},
      {id:'n3',name:'Jules',number:9,position:'CF',gender:'woman',hair:'pony',skin:'#936343',hairColor:'#2c2825',contact:78,power:69,speed:90},
      {id:'n4',name:'Owen',number:22,position:'1B',gender:'man',hair:'short',skin:'#d8a57c',hairColor:'#513629',contact:72,power:89,speed:48},
      {id:'n5',name:'Sora',number:5,position:'3B',gender:'woman',hair:'short',skin:'#f0c7aa',hairColor:'#71482e',contact:77,power:80,speed:69},
      {id:'n6',name:'Luca',number:15,position:'RF',gender:'man',hair:'curly',skin:'#b58059',hairColor:'#342a24',contact:75,power:74,speed:76},
      {id:'n7',name:'Mei',number:13,position:'SS',gender:'woman',hair:'pony',skin:'#e4b48c',hairColor:'#32292a',contact:84,power:59,speed:82},
      {id:'n8',name:'Adam',number:18,position:'LF',gender:'man',hair:'wave',skin:'#efc7a9',hairColor:'#6c4932',contact:73,power:72,speed:73},
      {id:'n9',name:'Rina',number:20,position:'C',gender:'woman',hair:'bob',skin:'#be8960',hairColor:'#3a2c25',contact:76,power:72,speed:57}
    ]}
];
export const allPlayers = () => TEAMS.flatMap(t=>t.players);
export const playerById = id => allPlayers().find(p=>p.id===id);
