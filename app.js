// ===== Habit Tracker + Autosave (localStorage) + Offline SW register =====

const DOW = ["S","M","T","W","Th","F","Sa"];

function daysInMonth(y, m0){ return new Date(y, m0 + 1, 0).getDate(); }

function monthLabel(y, m0){
  const m = new Date(y, m0, 1).toLocaleString(undefined, {month:"short"});
  return `${m} ${y}`;
}

function setDefaultMonth(){
  const input = document.getElementById("month");
  const now = new Date();
  input.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
}

function clearAfter(el, keep){
  while(el.children.length > keep) el.removeChild(el.lastElementChild);
}

function storageKey(yyyy, mm){ return `habit:v1:${yyyy}-${String(mm).padStart(2,"0")}`; }

function loadState(yyyy, mm){
  try{
    const raw = localStorage.getItem(storageKey(yyyy, mm));
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){
    return null;
  }
}

function saveState(yyyy, mm, state){
  localStorage.setItem(storageKey(yyyy, mm), JSON.stringify(state));
}

function ensureState(state){
  const habits = state?.habits?.length === 12 ? state.habits : Array(12).fill("");
  const marks = Array.from({length:12}, (_,r)=>{
    const row = state?.marks?.[r] || [];
    return Array.from({length:31}, (_,d)=> Boolean(row[d]));
  });
  return { habits, marks };
}

function buildDaysRow(rowEl, dim, keep){
  clearAfter(rowEl, keep);
  for(let d=1; d<=31; d++){
    const th = document.createElement("th");
    th.textContent = d;
    if(d > dim) th.className = "disabled";
    rowEl.appendChild(th);
  }
}

function buildDowRow(rowEl, y, m0, dim, keep){
  clearAfter(rowEl, keep);
  for(let d=1; d<=31; d++){
    const th = document.createElement("th");
    if(d <= dim){
      const date = new Date(y, m0, d);
      th.textContent = DOW[date.getDay()];
    } else {
      th.textContent = "";
      th.className = "disabled";
    }
    rowEl.appendChild(th);
  }
}

function updateTotals(dim, state){
  const totalRow = document.getElementById("totalRow");
  for(let d=1; d<=31; d++){
    const td = totalRow.children[d]; // 0 is the label th
    if(!td) continue;
    if(d > dim){
      td.textContent = "";
      td.classList.add("disabled");
      continue;
    }
    let sum = 0;
    for(let r=0; r<12; r++) if(state.marks[r][d-1]) sum++;
    td.textContent = sum ? String(sum) : "";
  }
}

function renderHabitTable(dim, yyyy, m0, state){
  buildDaysRow(document.getElementById("daysRow"), dim, 1);
  buildDowRow(document.getElementById("dowRow"), yyyy, m0, dim, 2);

  const habitBody = document.getElementById("habitBody");
  habitBody.innerHTML = "";

  for(let r=1; r<=12; r++){
    const tr = document.createElement("tr");

    const tdNum = document.createElement("td");
    tdNum.className = "row-num";
    tdNum.textContent = r;

    const tdHabit = document.createElement("td");
    tdHabit.className = "habit-col";
    tdHabit.contentEditable = "true";
    tdHabit.spellcheck = false;
    tdHabit.textContent = state.habits[r-1] || "";

    tdHabit.addEventListener("input", ()=>{
      state.habits[r-1] = tdHabit.textContent.trimEnd();
      saveState(yyyy, m0+1, state);
    });

    tr.appendChild(tdNum);
    tr.appendChild(tdHabit);

    for(let d=1; d<=31; d++){
      const td = document.createElement("td");
      if(d > dim) td.className = "disabled";

      const checked = state.marks[r-1][d-1];
      td.textContent = checked ? "✓" : "";

      if(d <= dim){
        td.style.cursor = "pointer";
        td.addEventListener("click", ()=>{
          state.marks[r-1][d-1] = !state.marks[r-1][d-1];
          td.textContent = state.marks[r-1][d-1] ? "✓" : "";
          updateTotals(dim, state);
          saveState(yyyy, m0+1, state);
        });
      }

      tr.appendChild(td);
    }

    habitBody.appendChild(tr);
  }

  const totalRow = document.getElementById("totalRow");
  clearAfter(totalRow, 1);
  for(let d=1; d<=31; d++){
    const td = document.createElement("td");
    if(d > dim) td.className = "disabled";
    totalRow.appendChild(td);
  }

  updateTotals(dim, state);
}

// ===== Your original line-template =====
function renderLineTemplate(svgId, dim, titleText){
  const svg = document.getElementById(svgId);
  if(!svg) return;
  svg.innerHTML = "";

  const W = 1000, H = 210;
  const padL = 72, padR = 12, padT = 16, padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const yMin = 1, yMax = 12;
  const ns = "http://www.w3.org/2000/svg";

  const yToPx = (v) => padT + (yMax - v) * (chartH / (yMax - yMin));
  const xToPx = (d) => padL + (d - 1) * (chartW / (31 - 1));

  const bg = document.createElementNS(ns,"rect");
  bg.setAttribute("x","0"); bg.setAttribute("y","0");
  bg.setAttribute("width",W); bg.setAttribute("height",H);
  bg.setAttribute("fill","#fff");
  svg.appendChild(bg);

  for(let start=1; start<=31; start+=7){
    const x1 = xToPx(start);
    const x2 = xToPx(Math.min(start+6, dim));
    const band = document.createElementNS(ns,"rect");
    band.setAttribute("x", x1);
    band.setAttribute("y", padT);
    band.setAttribute("width", Math.max(0, x2 - x1));
    band.setAttribute("height", chartH);
    band.setAttribute("fill", (Math.floor((start-1)/7) % 2 === 0) ? "#f5f5f5" : "#ffffff");
    svg.appendChild(band);
  }

  for(let v=yMin; v<=yMax; v++){
    const y = yToPx(v);

    const line = document.createElementNS(ns,"line");
    line.setAttribute("x1",padL);
    line.setAttribute("x2",W - padR);
    line.setAttribute("y1",y);
    line.setAttribute("y2",y);

    const major = (v === yMin || v === yMax || v === 6);
    line.setAttribute("stroke", major ? "#2b2b2b" : "#7f7f7f");
    line.setAttribute("stroke-width", major ? "1.2" : "0.9");
    if(!major) line.setAttribute("stroke-dasharray","3 3");
    svg.appendChild(line);

    const t = document.createElementNS(ns,"text");
    t.setAttribute("x", padL - 10);
    t.setAttribute("y", y + 3);
    t.setAttribute("text-anchor","end");
    t.setAttribute("font-size","10.5");
    t.setAttribute("fill","#111");
    t.textContent = v;
    svg.appendChild(t);
  }

  for(let d=1; d<=dim; d++){
    const x = xToPx(d);
    const major = (d === 1 || d === dim || d % 5 === 0);

    const vline = document.createElementNS(ns,"line");
    vline.setAttribute("x1",x);
    vline.setAttribute("x2",x);
    vline.setAttribute("y1",padT);
    vline.setAttribute("y2",padT + chartH);
    vline.setAttribute("stroke", major ? "#5a5a5a" : "#a0a0a0");
    vline.setAttribute("stroke-width", major ? "1.0" : "0.8");
    svg.appendChild(vline);

    if(major){
      const tx = document.createElementNS(ns,"text");
      tx.setAttribute("x", x);
      tx.setAttribute("y", H - 10);
      tx.setAttribute("text-anchor","middle");
      tx.setAttribute("font-size","10");
      tx.setAttribute("fill","#111");
      tx.textContent = d;
      svg.appendChild(tx);
    }
  }

  const border = document.createElementNS(ns,"rect");
  border.setAttribute("x", padL);
  border.setAttribute("y", padT);
  border.setAttribute("width", chartW);
  border.setAttribute("height", chartH);
  border.setAttribute("fill","none");
  border.setAttribute("stroke","#1f1f1f");
  border.setAttribute("stroke-width","1.4");
  svg.appendChild(border);

  const lab = document.createElementNS(ns,"text");
  lab.setAttribute("x", padL);
  lab.setAttribute("y", 14);
  lab.setAttribute("font-size","10");
  lab.setAttribute("fill","#111");
  lab.textContent = titleText;
  svg.appendChild(lab);

  for(let d=1; d<=dim; d++){
    if(d % 3 !== 0) continue;
    const dot = document.createElementNS(ns,"circle");
    dot.setAttribute("cx", xToPx(d));
    dot.setAttribute("cy", yToPx(6));
    dot.setAttribute("r", "1.2");
    dot.setAttribute("fill", "#111");
    dot.setAttribute("opacity", "0.35");
    svg.appendChild(dot);
  }
}

function render(){
  const val = document.getElementById("month").value;
  const [yyyy, mm] = val.split("-").map(Number);
  const m0 = mm - 1;
  const dim = daysInMonth(yyyy, m0);

  document.getElementById("topLeft").textContent = monthLabel(yyyy, m0);

  const loaded = loadState(yyyy, mm);
  const state = ensureState(loaded);

  renderHabitTable(dim, yyyy, m0, state);
  renderLineTemplate("sleepSvg", dim, "Sleep hours (1–12)");
  renderLineTemplate("studySvg", dim, "Study hours (1–12)");

  saveState(yyyy, mm, state);
}

// Make render() callable from the HTML button onclick
window.render = render;

setDefaultMonth();
render();

// Register service worker (offline support)
// A service worker sits between your app and the network and can serve cached responses. [page:2]
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}
