/* Registro de vacaciones/permisos 2026
   Persistencia: Netlify Functions + Netlify Blobs (sin DB propia)
*/

const YEAR = 2026;

// --- UI refs
const el = (id) => document.getElementById(id);

const form = el("formTimeOff");
const alertBox = el("formAlert");
const syncStatus = el("syncStatus");

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
const btnReload = el("btnReload");
const btnSave = el("btnSave");

// --- State
let state = {
  monthIndex: 0, // 0=Enero
  entries: [],
  serverRevision: null, // ETag / revision
  lastUpdatedAt: null,
  filters: { name: "", type: "" },
  isSaving: false
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
  return !!iso && iso.startsWith(`${YEAR}-`);
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
function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function createId(){
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
}

// --- API (Netlify Functions)
async function apiGet() {
  const r = await fetch("/.netlify/functions/list");
  if(!r.ok) throw new Error(await r.text());
  return await r.json(); // { data, revision, updatedAt }
}

async function apiPut(entries, expectedRevision) {
  const r = await fetch("/.netlify/functions/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ entries, expectedRevision })
  });
  if(!r.ok) throw new Error(await r.text());
  return await r.json(); // { ok, revision, updatedAt }
}

async function apiClear() {
  const r = await fetch("/.netlify/functions/clear", { method: "POST" });
  if(!r.ok) throw new Error(await r.text());
  return await r.json();
}

// --- Date logic
function daysInMonth(year, monthIndex){
  return new Date(year, monthIndex + 1, 0).getDate();
}
function startWeekday(year, monthIndex){
  return new Date(year, monthIndex, 1).getDay(); // 0=Dom
}
function overlapsDay(entry, dayISO){
  return entry.start <= dayISO && dayISO <= entry.end; // inclusive
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

// --- UI helpers
function setAlert(msg, kind="info"){
  alertBox.textContent = msg || "";
  alertBox.style.color = (kind === "error")
    ? "rgba(244,63,94,.95)"
    : "rgba(255,255,255,.72)";
}

function setSync(msg){
  syncStatus.textContent = msg || "—";
}

function setSaving(isSaving){
  state.isSaving = isSaving;
  btnSave.disabled = isSaving;
  btnSave.textContent = isSaving ? "Guardando…" : "Guardar";
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
  monthTitle.textContent = monthsEs()[state.monthIndex];
  monthSubtitle.textContent = `${YEAR}`;
}

function renderCalendar(){
  calendar.innerHTML = "";

  const monthIdx = state.monthIndex;
  const days = daysInMonth(YEAR, monthIdx);
  const firstDay = startWeekday(YEAR, monthIdx);

  const prevMonthIdx = monthIdx - 1;
  const prevYear = prevMonthIdx < 0 ? YEAR - 1 : YEAR;
  const prevIdx = (prevMonthIdx + 12) % 12;
  const prevDays = daysInMonth(prevYear, prevIdx);

  const filtered = applyFilters(state.entries);

  for(let cell=0; cell<42; cell++){
    const dayCell = document.createElement("div");
    dayCell.className = "day";

    let dayNum, iso;
    const dayOffset = cell - firstDay + 1;

    if(dayOffset <= 0){
      dayNum = prevDays + dayOffset;
      const d = new Date(YEAR, monthIdx, dayOffset);
      iso = dateToISO(d);
      dayCell.classList.add("out");
    } else if(dayOffset > days){
      dayNum = dayOffset - days;
      const d = new Date(YEAR, monthIdx, dayOffset);
      iso = dateToISO(d);
      dayCell.classList.add("out");
    } else {
      dayNum = dayOffset;
      iso = `${YEAR}-${pad2(monthIdx+1)}-${pad2(dayNum)}`;
    }

    const num = document.createElement("div");
    num.className = "num";
    num.textContent = dayNum;
    dayCell.appendChild(num);

    if(clampTo2026(iso)){
      const dayEntries = filtered.filter(e => overlapsDay(e, iso));
      if(dayEntries.length){
        const chips = document.createElement("div");
        chips.className = "chips";

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

        const bar = document.createElement("div");
        bar.className = "bar";
        const uniqueTypes = new Set(dayEntries.map(e => typeKey(e.type)));
        bar.classList.add(uniqueTypes.size === 1 ? [...uniqueTypes][0] : "multi");
        dayCell.appendChild(bar);

        dayCell.title = dayEntries
          .map(e => `${e.name} (${e.type}) ${e.start}→${e.end}${e.note?` · ${e.note}`:""}`)
          .join("\n");
      }
    }

    calendar.appendChild(dayCell);
  }
}

function renderMonthSummaryAndList(){
  const m = state.monthIndex;
  const filtered = applyFilters(state.entries);
  const monthEntries = filtered.filter(e => overlapsMonth(e, YEAR, m));

  const uniquePeople = new Set(monthEntries.map(e => e.name.toLowerCase().trim()));
  const daysSum = monthEntries.reduce((acc, e) => acc + approxDaysWithinMonth(e, YEAR, m), 0);

  kpiPeople.textContent = String(uniquePeople.size);
  kpiEntries.textContent = String(monthEntries.length);
  kpiDays.textContent = String(daysSum);

  const types = ["Vacaciones","Día de la familia","Permiso","Incapacidad","Otro"];
  breakdownType.innerHTML = "";
  types.forEach(t => {
    const entriesT = monthEntries.filter(e => e.type === t);
    const peopleT = new Set(entriesT.map(e => e.name.toLowerCase().trim()));
    const row = document.createElement("div");
    row.className = "bd-row";
    row.innerHTML = `
      <div class="bd-tag">
        <span class="dot ${typeKey(t)}"></span>
        <span>${escapeHtml(t)}</span>
      </div>
      <div class="muted">${peopleT.size} pers.</div>
    `;
    breakdownType.appendChild(row);
  });

  listHint.textContent = `${monthsEs()[m]} ${YEAR} · ${monthEntries.length} registro(s)`;

  entriesList.innerHTML = "";
  if(monthEntries.length === 0){
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "No hay registros en este mes con los filtros actuales.";
    entriesList.appendChild(empty);
    return;
  }

  monthEntries.sort((a,b) => a.start.localeCompare(b.start));

  monthEntries.forEach(e => {
    const box = document.createElement("div");
    box.className = "entry";

    const left = document.createElement("div");
    left.innerHTML = `
      <div>
        <strong>${escapeHtml(e.name)}</strong>
        <span class="badge">${escapeHtml(e.type)}</span>
      </div>
      <div class="meta">
        <span>📅 ${escapeHtml(e.start)} → ${escapeHtml(e.end)}</span>
        ${e.note ? `<span>📝 ${escapeHtml(e.note)}</span>` : ""}
      </div>
    `;

    const right = document.createElement("div");
    const del = document.createElement("button");
    del.className = "btn btn-danger";
    del.textContent = "Eliminar";
    del.addEventListener("click", () => deleteEntry(e.id));
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

// --- Validation
function validateEntry({name, start, end, type}){
  if(!name.trim()) return "El nombre es obligatorio.";
  if(!start || !end) return "Debes indicar fecha inicio y fin.";
  if(!clampTo2026(start) || !clampTo2026(end)) return "Las fechas deben estar dentro del año 2026.";
  if(end < start) return "La fecha fin no puede ser anterior a la fecha inicio.";
  if(!type) return "Debes seleccionar un motivo.";
  return null;
}

// --- Data operations
async function reloadFromServer(){
  setAlert("");
  setSync("Cargando…");
  try{
    const res = await apiGet();
    state.entries = Array.isArray(res?.data?.entries) ? res.data.entries : [];
    state.serverRevision = res.revision || null;
    state.lastUpdatedAt = res.updatedAt || null;

    setSync(`Última actualización: ${state.lastUpdatedAt || "—"} · Rev: ${state.serverRevision || "—"}`);
    rerender();
  }catch(e){
    setSync("⚠️ No se pudo cargar (revisa Netlify Functions/Blobs).");
    setAlert(`Error cargando: ${String(e.message || e)}`, "error");
    rerender();
  }
}

async function saveToServer(){
  setSaving(true);
  setSync("Guardando…");

  try{
    const res = await apiPut(state.entries, state.serverRevision);
    state.serverRevision = res.revision || state.serverRevision;
    state.lastUpdatedAt = res.updatedAt || state.lastUpdatedAt;
    setSync(`Guardado ✓ · ${state.lastUpdatedAt || "—"} · Rev: ${state.serverRevision || "—"}`);
    setAlert("✅ Guardado en almacenamiento compartido.");
  }catch(e){
    // Si hubo conflicto, recargamos y avisamos
    let msg = String(e.message || e);
    if(msg.includes("409") || msg.toLowerCase().includes("conflict")){
      setAlert("⚠️ Alguien guardó al mismo tiempo. Recargando para evitar pisar cambios…", "error");
      await reloadFromServer();
    } else {
      setAlert(`⚠️ No se pudo guardar: ${msg}`, "error");
      setSync("Error al guardar.");
    }
  }finally{
    setSaving(false);
  }
}

async function deleteEntry(id){
  if(!confirm("¿Eliminar este registro?")) return;
  state.entries = state.entries.filter(x => x.id !== id);
  rerender();
  await saveToServer();
}

// --- Form submit
form.addEventListener("submit", async (ev) => {
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

  // mover vista al mes de inicio
  state.monthIndex = isoToDate(entry.start).getMonth();

  form.reset();
  rerender();
  await saveToServer();
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

    // Validar y normalizar
    const normalized = [];
    let skipped = 0;

    imported.forEach(raw => {
      const e = {
        id: raw.id || createId(),
        name: String(raw.name || "").trim(),
        type: String(raw.type || "Otro").trim(),
        start: String(raw.start || ""),
        end: String(raw.end || ""),
        note: String(raw.note || "").trim(),
        createdAt: raw.createdAt || new Date().toISOString()
      };
      const err = validateEntry(e);
      if(err){ skipped++; return; }
      normalized.push(e);
    });

    if(!confirm(`Esto SOBRESCRIBE los datos del sitio con ${normalized.length} registros. ¿Continuar?`)){
      return;
    }

    state.entries = normalized;
    rerender();
    await saveToServer();
    setAlert(`✅ Importado y guardado. Omitidos: ${skipped}.`);
  }catch(e){
    setAlert(`Error importando JSON: ${String(e.message || e)}`, "error");
  }finally{
    fileImport.value = "";
  }
});

btnClearAll.addEventListener("click", async () => {
  if(!confirm("¿Seguro? Esto borra TODOS los registros del almacenamiento compartido.")) return;
  try{
    await apiClear();
    await reloadFromServer();
    setAlert("🗑️ Datos borrados.");
  }catch(e){
    setAlert(`No se pudo borrar: ${String(e.message || e)}`, "error");
  }
});

btnReload.addEventListener("click", reloadFromServer);

// --- Init
async function init(){
  renderWeekdays();
  state.monthIndex = 0;

  // limit date inputs to 2026
  const min = `${YEAR}-01-01`;
  const max = `${YEAR}-12-31`;
  ["start","end"].forEach(id => {
    const input = el(id);
    input.min = min;
    input.max = max;
  });

  await reloadFromServer();
  rerender();
}
init();
