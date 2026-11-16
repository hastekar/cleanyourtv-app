/* Memleket Fethi v2 - il verisi, renkler, plaka cozumleme, harita izgarasi.
   DOM / THREE kullanmaz; tarayicida <script>, node'da require ile calisir. */
var MF = (typeof window!=='undefined' ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
(function(){
'use strict';
var IL_RAW=[[1,'Adana',35.32,37],[2,'Adıyaman',38.28,37.76],[3,'Afyon',30.54,38.76],[4,'Ağrı',43.05,39.72],[5,'Amasya',35.83,40.65],[6,'Ankara',32.85,39.93],[7,'Antalya',30.71,36.9],[8,'Artvin',41.82,41.18],[9,'Aydın',27.85,37.85],[10,'Balıkesir',27.88,39.65],[11,'Bilecik',29.98,40.14],[12,'Bingöl',40.5,38.88],[13,'Bitlis',42.11,38.4],[14,'Bolu',31.61,40.74],[15,'Burdur',30.29,37.72],[16,'Bursa',29.06,40.19],[17,'Çanakkale',26.41,40.15],[18,'Çankırı',33.62,40.6],[19,'Çorum',34.95,40.55],[20,'Denizli',29.09,37.78],[21,'Diyarbakır',40.23,37.91],[22,'Edirne',26.56,41.68],[23,'Elazığ',39.22,38.68],[24,'Erzincan',39.49,39.75],[25,'Erzurum',41.27,39.9],[26,'Eskişehir',30.52,39.78],[27,'Gaziantep',37.38,37.07],[28,'Giresun',38.39,40.91],[29,'Gümüşhane',39.48,40.46],[30,'Hakkari',43.74,37.57],[31,'Hatay',36.16,36.2],[32,'Isparta',30.55,37.76],[33,'Mersin',34.63,36.8],[34,'İstanbul',28.98,41.01],[35,'İzmir',27.14,38.42],[36,'Kars',43.1,40.6],[37,'Kastamonu',33.78,41.38],[38,'Kayseri',35.49,38.73],[39,'Kırklareli',27.23,41.73],[40,'Kırşehir',34.16,39.15],[41,'Kocaeli',29.92,40.77],[42,'Konya',32.48,37.87],[43,'Kütahya',29.98,39.42],[44,'Malatya',38.31,38.35],[45,'Manisa',27.43,38.61],[46,'K.Maraş',36.94,37.58],[47,'Mardin',40.74,37.31],[48,'Muğla',28.36,37.22],[49,'Muş',41.49,38.73],[50,'Nevşehir',34.71,38.62],[51,'Niğde',34.68,37.97],[52,'Ordu',37.88,40.98],[53,'Rize',40.52,41.02],[54,'Sakarya',30.4,40.76],[55,'Samsun',36.33,41.29],[56,'Siirt',41.94,37.93],[57,'Sinop',35.15,42.03],[58,'Sivas',37.02,39.75],[59,'Tekirdağ',27.51,40.98],[60,'Tokat',36.55,40.31],[61,'Trabzon',39.72,41],[62,'Tunceli',39.55,39.11],[63,'Şanlıurfa',38.79,37.16],[64,'Uşak',29.41,38.68],[65,'Van',43.38,38.49],[66,'Yozgat',34.81,39.82],[67,'Zonguldak',31.79,41.45],[68,'Aksaray',34.03,38.37],[69,'Bayburt',40.23,40.26],[70,'Karaman',33.22,37.18],[71,'Kırıkkale',33.51,39.85],[72,'Batman',41.13,37.88],[73,'Şırnak',42.46,37.52],[74,'Bartın',32.34,41.63],[75,'Ardahan',42.7,41.11],[76,'Iğdır',44.04,39.92],[77,'Yalova',29.27,40.65],[78,'Karabük',32.62,41.2],[79,'Kilis',37.12,36.72],[80,'Osmaniye',36.25,37.07],[81,'Düzce',31.16,40.84]];
var KIYI=[[26.05,41.75],[26.6,42],[27.6,42.1],[28.05,41.95],[28.25,41.5],[29.1,41.25],[30.3,41.2],[31.4,41.32],[32.2,41.8],[33.3,42.02],[34.3,41.97],[35.1,42.12],[35.5,41.7],[36.1,41.75],[36.55,41.38],[37.1,41.2],[38,41.1],[39,41.15],[40.2,41.1],[41.3,41.45],[41.55,41.55],[42.6,41.6],[43.45,41.15],[43.75,40.7],[43.7,40.15],[44.8,39.75],[44.45,39.4],[44.1,39.38],[44.35,38.9],[44.3,38.4],[44.55,37.9],[44.8,37.2],[44.2,37],[43.2,37.25],[42.35,37.1],[41.2,37.05],[40,36.8],[38.8,36.68],[37.5,36.6],[36.65,36.7],[36.6,36.2],[36.15,35.82],[35.9,36],[36.2,36.6],[35.6,36.58],[34.6,36.72],[33.9,36.25],[33,36.05],[32.3,36.45],[31.4,36.75],[30.6,36.82],[30.5,36.3],[30.2,36.25],[29.4,36.2],[28.9,36.65],[28.2,36.72],[27.4,37],[27.2,37.6],[26.3,38.3],[26.75,38.7],[26.9,39.1],[26.65,39.3],[26.2,39.5],[26.15,40],[26.2,40.55],[26.35,41.2]];
var SU=[[28,40.72,1,.22],[42.9,38.65,.5,.26],[33.4,38.75,.16,.3]]; // Marmara, Van Gölü, Tuz Gölü
var KX=.78, LON0=35.3, LAT0=39, PW=16.5, PH=7.5;
var FINE_W=660, FINE_H=300;   // komsuluk icin ince izgara (v1 ile ayni)
var GRID_W=330, GRID_H=150;   // mini harita izgarasi

var IL = IL_RAW.map(function(a){ return {id:a[0], name:a[1], lon:a[2], lat:a[3]}; });
var P = {}; IL.forEach(function(p){ P[p.id]=p; p.x=(p.lon-LON0)*KX; p.z=LAT0-p.lat; });

function norm(s){
  return String(s).toLocaleLowerCase('tr').replace(/[çğıöşü]/g,function(c){return {'ç':'c','ğ':'g','ı':'i','ö':'o','ş':'s','ü':'u'}[c];}).replace(/[^a-z0-9 ]/g,'');
}
var NAMEIDX = {}; IL.forEach(function(p){ NAMEIDX[norm(p.name)] = p.id; });
var ALIAS = {kahramanmaras:46,maras:46,urfa:63,antep:27,izmit:41,adapazari:54,afyonkarahisar:3,icel:33,antakya:31};
for (var k in ALIAS) NAMEIDX[k] = ALIAS[k];

function parsePlate(txt){
  txt = String(txt==null?'':txt);
  var m = /(?:^|\D)(0?[1-9]|[1-7]\d|8[01])(?:\D|$)/.exec(txt); if (m) return +m[1];
  var ws = norm(txt).split(' ');
  for (var i=0;i<ws.length;i++) if (NAMEIDX[ws[i]]) return NAMEIDX[ws[i]];
  return 0;
}

function inPoly(x,y){
  var c=false;
  for (var i=0,j=KIYI.length-1;i<KIYI.length;j=i++){
    var a=KIYI[i], b=KIYI[j];
    if ((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) c=!c;
  }
  return c;
}
function buildCells(GW,GH){
  var cell = new Int8Array(GW*GH); for (var q=0;q<cell.length;q++) cell[q]=-1;
  for (var j=0;j<GH;j++) for (var i=0;i<GW;i++){
    var x=-PW/2+(i+.5)/GW*PW, z=-PH/2+(j+.5)/GH*PH, lon=LON0+x/KX, lat=LAT0-z;
    var best=-1, bd=1e9;
    for (var k=0;k<IL.length;k++){ var dx=IL[k].x-x, dz=IL[k].z-z, d=dx*dx+dz*dz; if (d<bd){bd=d;best=k;} }
    var land=inPoly(lon,lat);
    if (land) for (var s=0;s<SU.length;s++){ var u=(lon-SU[s][0])/SU[s][2], v=(lat-SU[s][1])/SU[s][3]; if (u*u+v*v<1){land=false;break;} }
    if (land || bd<.05) cell[j*GW+i]=best;
  }
  return cell;
}
function buildAdj(cell,GW,GH){
  var adj={}, seen={};
  IL.forEach(function(p){ adj[p.id]=[]; });
  function link(a,b){
    if (a<0||b<0||a===b) return;
    var key = a<b ? a*100+b : b*100+a; if (seen[key]) return; seen[key]=1;
    adj[IL[a].id].push(IL[b].id); adj[IL[b].id].push(IL[a].id);
  }
  for (var j=0;j<GH-1;j++) for (var i=0;i<GW-1;i++){ var c=cell[j*GW+i]; link(c,cell[j*GW+i+1]); link(c,cell[(j+1)*GW+i]); }
  return adj;
}

var fine = buildCells(FINE_W,FINE_H);
var adj = buildAdj(fine,FINE_W,FINE_H);
fine = null;
var grid = {W:GRID_W, H:GRID_H, cell:buildCells(GRID_W,GRID_H), lon0:LON0, lat0:LAT0, kx:KX, pw:PW, ph:PH};

function hsl2rgb(h,s,l){
  var a=s*Math.min(l,1-l);
  function f(n){ var k=(n+h*12)%12; return l-a*Math.max(-1,Math.min(k-3,9-k,1)); }
  return [f(0),f(8),f(4)];
}
function colorHex(id){
  var c=hsl2rgb(((id*47)%360)/360,.72,.56);
  return (Math.round(c[0]*255)<<16)|(Math.round(c[1]*255)<<8)|Math.round(c[2]*255);
}
function css(id){ return '#'+('000000'+colorHex(id).toString(16)).slice(-6); }

MF.data = {IL:IL, P:P, adj:adj, colorHex:colorHex, css:css, parsePlate:parsePlate, norm:norm, grid:grid};
})();
if (typeof module !== 'undefined') module.exports = MF;
