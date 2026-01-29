/* Prototipo: Registro de vacaciones/permisos 2026
   - Persistencia: localStorage
   - Vista: Calendario mensual + resumen
*/

const YEAR = 2026;
const STORAGE_KEY = "timeoff_2026_v1";

// --- UI refs
const el = (id) => document.getElementById(id);

const form = el("formTimeOff");
const alertBox = el("formAlert");

const monthTitle = el("monthTitle");
const monthSubtitle = el("monthSubtitle");
const weekdays = el("weekdays");
const calendar = el("calendar");

const btnPrev = el("btnPrev");
const btnNext = el("btnNext");
const btnToday = el("btnToday");

const filterName = el("filterName");
const filterType = el("filterType");
const btnClearFilters = el("btnClearFilters");

const kpiPeople = el("kpiPeople");
const kpiEntries = el("kpiEntries");
const kpiDays = el("kpiDays");
const breakdownType = el("breakdownType");

const entriesList = el("entriesList");
const listHint = el("listHint");

const btnExport = el("btnExport");
const fileImport = el("fileImport");
const btnClearAll = el("btnClearAll");

// --- State
let state = {
  monthIndex: 0, // 0=Enero
  entries: loadEntries(),
  filters: {
    name: "",
    type: ""
  }
};

// --- Utils
function pad2(n){ return String(n).padStart(2, "0"); }
function dateToISO(d){
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function isoToDate(iso){
  const [y,m,d] = iso.split("-").map(Number);
  return new Date(y, m-1, d);
}
function clampTo2026(iso){
  // Acepta solo 2026
  if(!iso) return false;
  return iso.startsWith(`${YEAR}-`);
}
function monthsEs(){
  return ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
}
function typeKey(type){
  const t = (type || "").toLowerCase();
  if(t.includes("vac")) return "vac";
  if(t.includes("famil")) return "fam";
  if(t.includes("perm")) return "perm";
  if(t.includes("incap")) return "inc";
  return "otro";
}
function typeDotClass(type){
  return typeKey(type);
}
function safeText(s){
  return (s ?? "").toString();
}

// --- Storage
function loadEntries(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return [];
    const parsed = JSON.parse(raw);
    if(!Array.isArray(parsed)) return [];
    // sanity normalize
    return parsed
      .filter(x => x && x.id && x.name && x.start && x.end && x.type)
      .map(x => ({
        id: x.id,
        name: safeText(x.name).trim(),
        start: safeText(x.start),
        end: safeText(x.end),
        type: safeText(x.type),
        note: safeText(x.note || ""),
        createdAt: x.createdAt || new Date().toISOString()
      }));
  }catch{
    return [];
  }
}
function saveEntries(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

// --- Date logic
function daysInMonth(year, monthIndex){
  return new Date(year, monthIndex + 1, 0).getDate();
}
function startWeekday(year, monthIndex){
  // 0=Domingo ... 6=Sábado
  return new Date(year, monthIndex, 1).getDay();
}
function overlapsDay(entry, dayISO){
  // inclusive range
  return entry.start <= dayISO && dayISO <= entry.end;
}
function overlapsMonth(entry, year, monthIndex){
  const monthStart = `${year}-${pad2(monthIndex+1)}-01`;
  const monthEnd = `${year}-${pad2(monthIndex+1)}-${pad2(daysInMonth(year, monthIndex))}`;
  return !(entry.end < monthStart || entry.start > monthEnd);
}
function approxDaysWithinMonth(entry, year, monthIndex){
  const monthStart = isoToDate(`${year}-${pad2(monthIndex+1)}-01`);
  const monthEnd = isoToDate(`${year}-${pad2(monthIndex+1)}-${pad2(daysInMonth(year, monthIndex))}`);
  const s = isoToDate(entry.start);
  const e = isoToDate(entry.end);
  const start = s < monthStart ? monthStart : s;
  const end = e > monthEnd ? monthEnd : e;
  const ms = end - start;
  if(ms < 0) return 0;
  // +1 inclusive
  return Math.floor(ms / (24*3600*1000)) + 1;
}

// --- Filtering
function applyFilters(entries){
  const nameQ = state.filters.name.trim().toLowerCase();
  const typeQ = state.filters.type.trim().toLowerCase();

  return entries.filter(e => {
    const okName = !nameQ || e.name.toLowerCase().includes(nameQ);
    const okType = !typeQ || e.type.toLowerCase() === typeQ;
    return okName && okType;
  });
}

// --- Rendering
function renderWeekdays(){
  const labels = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  weekdays.innerHTML = "";
  labels.forEach(l => {
    const div = document.createElement("div");
    div.textContent = l;
    weekdays.appendChild(div);
  });
}

function renderHeader(){
  monthTitle.textContent = `${monthsEs()[state.monthIndex]}`;
  monthSubtitle.textContent = `${YEAR}`;
}

function renderCalendar(){
  calendar.innerHTML = "";

  const monthIdx = state.monthIndex;
  const days = daysInMonth(YEAR, monthIdx);
  const firstDay = startWeekday(YEAR, monthIdx);

  // previous month filler
  const prevMonthIdx = monthIdx - 1;
  const prevYear = prevMonthIdx < 0 ? YEAR - 1 : YEAR;
  const prevIdx = (prevMonthIdx + 12) % 12;
  const prevDays = daysInMonth(prevYear, prevIdx);

  const filtered = applyFilters(state.entries);

  // 6 weeks grid (42 cells)
  for(let cell=0; cell<42; cell++){
    const dayCell = document.createElement("div");
    dayCell.className = "day";

    let inMonth = true;
    let dayNum, iso;

    const dayOffset = cell - firstDay + 1;
    if(dayOffset <= 0){
      // prev month
      inMonth = false;
      dayNum = prevDays + dayOffset;
      // if prev month is not 2026, we still show but no iso in 2026
      const d = new Date(YEAR, monthIdx, dayOffset); // auto handles
      iso = dateToISO(d);
      dayCell.classList.add("out");
    } else if(dayOffset > days){
      // next month
      inMonth = false;
      dayNum = dayOffset - days;
      const d = new Date(YEAR, monthIdx, dayOffset);
      iso = dateToISO(d);
      dayCell.classList.add("out");
    } else {
      dayNum = dayOffset;
      iso = `${YEAR}-${pad2(monthIdx+1)}-${pad2(dayNum)}`;
    }

    // number
    const num = document.createElement("div");
    num.className = "num";
    num.textContent = dayNum;
    dayCell.appendChild(num);

    // show highlights only for 2026 days
    if(clampTo2026(iso)){
      const dayEntries = filtered.filter(e => overlapsDay(e, iso));
      if(dayEntries.length){
        const chips = document.createElement("div");
        chips.className = "chips";

        // show up to 2 chips to avoid clutter
        dayEntries.slice(0,2).forEach(e => {
          const chip = document.createElement("div");
          chip.className = "chip";
          chip.textContent = `${e.name} · ${e.type}`;
          chips.appendChild(chip);
        });

        if(dayEntries.length > 2){
          const more = document.createElement("div");
          more.className = "chip";
          more.textContent = `+${dayEntries.length - 2} más`;
          chips.appendChild(more);
        }

        dayCell.appendChild(chips);

        // bar (color)
        const bar = document.createElement("div");
        bar.className = "bar";
        const uniqueTypes = new Set(dayEntries.map(e => typeKey(e.type)));
        if(uniqueTypes.size === 1){
          bar.classList.add([...uniqueTypes][0]);
        }else{
          bar.classList.add("multi");
        }
        dayCell.appendChild(bar);

        // tooltip title
        const tip = dayEntries.map(e => `${e.name} (${e.type}) ${e.start}→${e.end}${e.note?` · ${e.note}`:""}`).join("\n");
        dayCell.title = tip;
      }
    }

    calendar.appendChild(dayCell);
  }
}

function renderMonthSummaryAndList(){
  const m = state.monthIndex;
  const filtered = applyFilters(state.entries);

  const monthEntries = filtered.filter(e => overlapsMonth(e, YEAR, m));

  // KPIs
  const uniquePeople = new Set(monthEntries.map(e => e.name.toLowerCase().trim()));
  const daysSum = monthEntries.reduce((acc, e) => acc + approxDaysWithinMonth(e, YEAR, m), 0);

  kpiPeople.textContent = String(uniquePeople.size);
  kpiEntries.textContent = String(monthEntries.length);
  kpiDays.textContent = String(daysSum);

  // breakdown by type (count unique people by type in month)
  const types = ["Vacaciones","Día de la familia","Permiso","Incapacidad","Otro"];
  breakdownType.innerHTML = "";

  types.forEach(t => {
    const entriesT = monthEntries.filter(e => e.type === t);
    const peopleT = new Set(entriesT.map(e => e.name.toLowerCase().trim()));
    const row = document.createElement("div");
    row.className = "bd-row";
    row.innerHTML = `
      <div class="bd-tag">
        <span class="dot ${typeDotClass(t)}"></span>
        <span>${t}</span>
      </div>
      <div class="muted">${peopleT.size} pers.</div>
    `;
    breakdownType.appendChild(row);
  });

  // List
  listHint.textContent = `${monthsEs()[m]} ${YEAR} · mostrando ${monthEntries.length} registro(s) (aplica filtros si quieres)`;

  entriesList.innerHTML = "";
  if(monthEntries.length === 0){
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "No hay registros en este mes con los filtros actuales.";
    entriesList.appendChild(empty);
    return;
  }

  // sort by start date
  monthEntries.sort((a,b) => a.start.localeCompare(b.start));

  monthEntries.forEach(e => {
    const box = document.createElement("div");
    box.className = "entry";

    const left = document.createElement("div");
    const title = document.createElement("div");
    title.innerHTML = `<strong>${escapeHtml(e.name)}</strong> <span class="badge">${escapeHtml(e.type)}</span>`;
    left.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `
      <span>📅 ${escapeHtml(e.start)} → ${escapeHtml(e.end)}</span>
      ${e.note ? `<span>📝 ${escapeHtml(e.note)}</span>` : ""}
    `;
    left.appendChild(meta);

    const right = document.createElement("div");
    const del = document.createElement("button");
    del.className = "btn btn-danger";
    del.textContent = "Eliminar";
    del.addEventListener("click", () => {
      if(confirm(`¿Eliminar el registro de ${e.name} (${e.start}→${e.end})?`)){
        state.entries = state.entries.filter(x => x.id !== e.id);
        saveEntries();
        rerender();
      }
    });
    right.appendChild(del);

    box.appendChild(left);
    box.appendChild(right);

    entriesList.appendChild(box);
  });
}

function rerender(){
  renderHeader();
  renderCalendar();
  renderMonthSummaryAndList();
}

// --- Security small helper (avoid injecting HTML from notes/names)
function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// --- Form handling
function setAlert(msg, kind="info"){
  alertBox.textContent = msg || "";
  alertBox.style.color = kind === "error" ? "rgba(244,63,94,.95)" : "rgba(255,255,255,.72)";
}

function validateEntry({name, start, end, type}){
  if(!name.trim()) return "El nombre es obligatorio.";
  if(!start || !end) return "Debes indicar fecha inicio y fin.";
  if(!clampTo2026(start) || !clampTo2026(end)) return "Las fechas deben estar dentro del año 2026.";
  if(end < start) return "La fecha fin no puede ser anterior a la fecha inicio.";
  if(!type) return "Debes seleccionar un motivo.";
  return null;
}

function createId(){
  // suficientemente único para prototipo
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
}

form.addEventListener("submit", (ev) => {
  ev.preventDefault();
  setAlert("");

  const data = new FormData(form);
  const entry = {
    id: createId(),
    name: String(data.get("name") || "").trim(),
    type: String(data.get("type") || "").trim(),
    start: String(data.get("start") || ""),
    end: String(data.get("end") || ""),
    note: String(data.get("note") || "").trim(),
    createdAt: new Date().toISOString()
  };

  const err = validateEntry(entry);
  if(err){
    setAlert(err, "error");
    return;
  }

  state.entries.push(entry);
  saveEntries();

  // mover vista al mes del inicio
  const startDate = isoToDate(entry.start);
  state.monthIndex = startDate.getMonth();

  form.reset();
  setAlert("✅ Registro guardado.");
  rerender();
});

// --- Navigation
btnPrev.addEventListener("click", () => {
  state.monthIndex = (state.monthIndex + 11) % 12;
  rerender();
});

btnNext.addEventListener("click", () => {
  state.monthIndex = (state.monthIndex + 1) % 12;
  rerender();
});

btnToday.addEventListener("click", () => {
  state.monthIndex = 0;
  rerender();
});

// --- Filters
filterName.addEventListener("input", () => {
  state.filters.name = filterName.value || "";
  rerender();
});
filterType.addEventListener("change", () => {
  state.filters.type = filterType.value || "";
  rerender();
});
btnClearFilters.addEventListener("click", () => {
  filterName.value = "";
  filterType.value = "";
  state.filters.name = "";
  state.filters.type = "";
  rerender();
});

// --- Export / Import
btnExport.addEventListener("click", () => {
  const payload = {
    version: 1,
    year: YEAR,
    exportedAt: new Date().toISOString(),
    entries: state.entries
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `timeoff_${YEAR}_export.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setAlert("📦 Exportado.");
});

fileImport.addEventListener("change", async (ev) => {
  const file = ev.target.files?.[0];
  if(!file) return;

  try{
    const text = await file.text();
    const parsed = JSON.parse(text);

    const imported = Array.isArray(parsed) ? parsed : parsed.entries;
    if(!Array.isArray(imported)) throw new Error("Formato inválido.");

    // merge by id
    const currentById = new Map(state.entries.map(e => [e.id, e]));
    let added = 0, updated = 0, skipped = 0;

    imported.forEach(raw => {
      const e = {
        id: raw.id || createId(),
        name: safeText(raw.name).trim(),
        type: safeText(raw.type).trim(),
        start: safeText(raw.start),
        end: safeText(raw.end),
        note: safeText(raw.note || "").trim(),
        createdAt: raw.createdAt || new Date().toISOString()
      };

      const err = validateEntry(e);
      if(err){
        skipped++;
        return;
      }

      if(currentById.has(e.id)){
        currentById.set(e.id, e);
        updated++;
      }else{
        currentById.set(e.id, e);
        added++;
      }
    });

    state.entries = [...currentById.values()];
    saveEntries();
    setAlert(`✅ Importado: ${added} nuevos, ${updated} actualizados, ${skipped} omitidos (fuera de 2026 o inválidos).`);
    rerender();
  }catch(err){
    setAlert(`Error importando JSON: ${err.message || err}`, "error");
  }finally{
    fileImport.value = "";
  }
});

// --- Clear all
btnClearAll.addEventListener("click", () => {
  if(confirm("¿Seguro? Esto bor
