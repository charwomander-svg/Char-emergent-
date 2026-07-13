const fs = require('fs');
const MAZE_COLS = 15;
const MAZE_ROWS = 19;
function createWalledGrid(){
  return Array.from({length:MAZE_ROWS}, (_,y)=>Array.from({length:MAZE_COLS},(_,x)=>(x===0||y===0||x===MAZE_COLS-1||y===MAZE_ROWS-1)?1:0));
}
function carveLine(grid,x1,y1,x2,y2){
  const minX = Math.max(1, Math.min(x1,x2));
  const maxX = Math.min(MAZE_COLS-2, Math.max(x1,x2));
  const minY = Math.max(1, Math.min(y1,y2));
  const maxY = Math.min(MAZE_ROWS-2, Math.max(y1,y2));
  for(let y=minY;y<=maxY;y++) for(let x=minX;x<=maxX;x++) grid[y][x]=1;
}
function makeStaticBase(level){
  const grid = createWalledGrid();
  const template = (level-1)%35;
  if (template >= 15) {
    const variant = template - 15;
    const offset = variant % 4;
    const spread = 2 + (variant % 3);
    if (variant % 5 === 0) {
      for (let y = 2 + offset; y <= 16; y += spread) carveLine(grid, 2, y, 12, y);
      for (let x = 3 + (offset % 2); x <= 11; x += 4) carveLine(grid, x, 2, x, 16);
    } else if (variant % 5 === 1) {
      carveLine(grid, 2, 2 + offset, 12, 2 + offset);
      carveLine(grid, 2, 16 - offset, 12, 16 - offset);
      carveLine(grid, 2 + offset, 2, 2 + offset, 16);
      carveLine(grid, 12 - offset, 2, 12 - offset, 16);
      carveLine(grid, 5, 8, 9, 8);
      carveLine(grid, 5, 10, 9, 10);
    } else if (variant % 5 === 2) {
      for (let i = 0; i < 5; i++) {
        const y = 2 + i * 3;
        carveLine(grid, 2 + ((i + offset) % 3), y, 6 + ((i + offset) % 4), y + 1);
        carveLine(grid, 8 - ((i + offset) % 2), y + 1, 12 - ((i + offset) % 3), y + 2);
      }
    } else if (variant % 5 === 3) {
      carveLine(grid, 3, 3, 11, 3);
      carveLine(grid, 3, 15, 11, 15);
      carveLine(grid, 3, 3, 3, 15);
      carveLine(grid, 11, 3, 11, 15);
      carveLine(grid, 5 + (offset % 2), 5, 9 - (offset % 2), 5);
      carveLine(grid, 5 + (offset % 2), 13, 9 - (offset % 2), 13);
      carveLine(grid, 7, 6 + offset, 7, 12 - offset);
    } else {
      for (let y = 2; y <= 16; y += 2) {
        for (let x = 2; x <= 12; x += 2) {
          if (((x + y + variant) % 3) !== 0) carveLine(grid, x, y, x + 1, y);
        }
      }
      carveLine(grid, 2, 9, 12, 9);
      carveLine(grid, 7, 2, 7, 16);
    }
    return grid;
  }
  switch(template){
    case 0:
      for(let y=3;y<=15;y+=4) carveLine(grid,2,y,12,y);
      for(let x=4;x<=10;x+=6) carveLine(grid,x,2,x,16);
      break;
    case 1:
      carveLine(grid,3,2,3,7);carveLine(grid,11,2,11,7);carveLine(grid,3,11,3,16);carveLine(grid,11,11,11,16);carveLine(grid,5,4,9,4);carveLine(grid,5,14,9,14);
      break;
    case 2:
      for(let y=2;y<=16;y+=2){const left = y%4===0?2:5; const right = y%4===0?9:12; carveLine(grid,left,y,right,y);}break;
    case 3:
      carveLine(grid,2,2,5,5);carveLine(grid,9,2,12,5);carveLine(grid,2,13,5,16);carveLine(grid,9,13,12,16);carveLine(grid,6,3,8,15);break;
    case 4:
      for(let y=2;y<=16;y++){ if(y!==5&&y!==9&&y!==13){carveLine(grid,4,y,4,y);carveLine(grid,10,y,10,y);} }
      for(let x=2;x<=12;x++){ if(x!==4&&x!==7&&x!==10){carveLine(grid,x,6,x,6);carveLine(grid,x,12,x,12);} }
      break;
    case 5:
      carveLine(grid,2,6,12,6);carveLine(grid,2,10,12,10);carveLine(grid,6,2,6,16);carveLine(grid,8,2,8,16);break;
    case 6:
      for(let y=2;y<=16;y+=2){ for(let x=2;x<=12;x+=3){ carveLine(grid,x,y,x+1,y); } }break;
    case 7:
      carveLine(grid,2,2,7,2);carveLine(grid,2,4,7,4);carveLine(grid,2,6,7,6);carveLine(grid,9,9,12,9);carveLine(grid,9,11,12,11);carveLine(grid,5,12,9,12);break;
    case 8:
      for(let i=0;i<5;i++){ const y=2+i*3; carveLine(grid,2+i,y,6+i,y+2);}break;
    case 9:
      carveLine(grid,3,3,11,3);carveLine(grid,3,13,11,13);carveLine(grid,3,3,3,13);carveLine(grid,11,3,11,13);carveLine(grid,7,3,7,13);carveLine(grid,3,8,11,8);break;
    case 10:
      carveLine(grid,2,2,4,4);carveLine(grid,6,2,8,4);carveLine(grid,10,2,12,4);carveLine(grid,2,10,4,12);carveLine(grid,6,10,8,12);carveLine(grid,10,10,12,12);break;
    case 11:
      for(let x=2;x<=12;x++){ if(x%2===0) carveLine(grid,x,2,x,14);} carveLine(grid,2,14,12,14);break;
    case 12:
      carveLine(grid,5,5,9,5);carveLine(grid,5,11,9,11);carveLine(grid,5,5,5,11);carveLine(grid,9,5,9,11);break;
    case 13:
      carveLine(grid,2,3,12,3);carveLine(grid,2,15,12,15);carveLine(grid,2,3,2,15);carveLine(grid,12,3,12,15);carveLine(grid,4,6,8,6);carveLine(grid,6,8,6,12);break;
    default:
      carveLine(grid,2,3,12,3);carveLine(grid,2,15,12,15);carveLine(grid,2,3,2,15);carveLine(grid,12,3,12,15);carveLine(grid,5,6,9,6);carveLine(grid,5,12,9,12);break;
  }
  return grid;
}
function decorate(grid){
  const cols=MAZE_COLS, rows=MAZE_ROWS;
  const ghostHouseX=Math.floor(cols/2), ghostHouseY=Math.floor(rows/2);
  for(let y=1;y<rows-1;y++) grid[y][ghostHouseX]=0;
  for(let x=1;x<cols-1;x++) grid[ghostHouseY][x]=0;
  for(let dy=-1;dy<=1;dy++) for(let dx=-2;dx<=2;dx++){ const x=ghostHouseX+dx,y=ghostHouseY+dy; if(x>=0&&x<cols&&y>=0&&y<rows) grid[y][x]=4; }
  for(const [x,y] of [[ghostHouseX,ghostHouseY-2],[ghostHouseX-1,ghostHouseY-2],[ghostHouseX+1,ghostHouseY-2],[ghostHouseX,ghostHouseY+2]]) if(x>=0&&x<cols&&y>=0&&y<rows) grid[y][x]=0;
  // fill pellets
  for(let y=0;y<rows;y++) for(let x=0;x<cols;x++) if(grid[y][x]===0) grid[y][x]=2;
  // super pellets corners
  const cornerPositions=[[1,1],[cols-2,1]]; if(true) cornerPositions.push([1,rows-2]); if(true) cornerPositions.push([cols-2,rows-2]);
  for(const [cx,cy] of cornerPositions){ let nearest=null; let best=1e9; for(let y=0;y<rows;y++) for(let x=0;x<cols;x++) if(grid[y][x]===2){ const d=Math.abs(x-cx)+Math.abs(y-cy); if(d<best){best=d;nearest=[x,y];}} if(nearest) grid[nearest[1]][nearest[0]]=3; }
  return {grid,ghostHouseX,ghostHouseY};
}
function renderSVG(grid, idx){
  const cellW=16, cellH=16, w=MAZE_COLS*cellW, h=MAZE_ROWS*cellH;
  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>\n`;
  svg += `<rect width='100%' height='100%' fill='#071018'/>\n`;
  for(let y=0;y<MAZE_ROWS;y++){
    for(let x=0;x<MAZE_COLS;x++){
      const cell = grid[y][x];
      const rx = x*cellW, ry = y*cellH;
      if(cell===1) svg+=`<rect x='${rx}' y='${ry}' width='${cellW}' height='${cellH}' fill='#001' stroke='#022'/>\n`;
      else if(cell===4) svg+=`<rect x='${rx}' y='${ry}' width='${cellW}' height='${cellH}' fill='#222' stroke='#334'/>\n`;
      else if(cell===3) svg+=`<circle cx='${rx+cellW/2}' cy='${ry+cellH/2}' r='${Math.min(cellW,cellH)/4}' fill='#ffea00'/>\n`;
      else svg+=`<rect x='${rx+2}' y='${ry+2}' width='${cellW-4}' height='${cellH-4}' fill='#0d6'/>\n`;
    }
  }
  svg += `<text x='8' y='${h-8}' font-family='monospace' font-size='10' fill='#9ff'>Template ${String(idx).padStart(2,'0')}</text>\n`;
  svg += '</svg>';
  return svg;
}
for(let t=1;t<=35;t++){
  const g = makeStaticBase(t);
  const dec = decorate(g);
  const svg = renderSVG(dec.grid,t);
  fs.writeFileSync(`./maze-${String(t).padStart(2,'0')}.svg`, svg);
}
console.log('Rendered 35 maze SVGs to current directory');
