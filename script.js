/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */

const SUPABASE_URL = "https://rvfdobjhfwjdvufwrirp.supabase.co";
const SUPABASE_ANON_KEY = "sb_secret_ta5Oz
••••••••••••••••";

const STORAGE_BUCKET = "images";

const GOOGLE_SHEETS_URL =
  "https://docs.google.com/spreadsheets/d/1FO_BRYjuPgpVs3tVaeioE1YjDGEBtgrS5776_Q9-12I/edit?gid=1510436497#gid=1510436497";


/* =========================================================
   SUPABASE
   ========================================================= */

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


/* =========================================================
   DOM
   ========================================================= */

const archive = document.getElementById("archive");
const categoryTitle = document.getElementById("category-title");
const categoryMenu = document.getElementById("category-menu");

const addRowButton = document.getElementById("add-row");
const addColumnButton = document.getElementById("add-column");
const removeColumnButton = document.getElementById("remove-column");

const imagePicker = document.getElementById("image-picker");

const imageViewer = document.getElementById("image-viewer");
const imageViewerImage = document.getElementById("image-viewer-image");
const imageViewerClose = document.getElementById("image-viewer-close");

const logSection = document.getElementById("log-section");
const logToggle = document.getElementById("log-toggle");
const logContent = document.getElementById("log-content");
const logsContainer = document.getElementById("logs");

const logForm = document.getElementById("log-form");
const logNumber = document.getElementById("log-number");
const logNote = document.getElementById("log-note");

const sheetsLink = document.getElementById("sheets-link");

const developmentNotice =
  document.getElementById("development-notice");

const developmentNoticeClose =
  document.getElementById("development-notice-close");


/* =========================================================
   ESTADO
   ========================================================= */

let categories = [];
let columns = [];
let rows = [];

let currentCategory = null;

let currentCells = [];

let imageTarget = null;

let resizing = false;


/* =========================================================
   HELPERS
   ========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function formatInventoryNumber(value) {

  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return "";
  }

  return String(Math.trunc(number)).padStart(3, "0");

}


function getColumnTitle(column, index) {

  const title =
    column.name ??
    column.title ??
    column.label ??
    "";

  if (String(title).trim()) {
    return String(title);
  }

  return `COLUNA ${index + 1}`;

}


function getGridTemplate() {

  if (!columns.length) {
    return "70px";
  }

  const widths = columns.map(column => {

    const width =
      Number(column.width_percent);

    if (
      Number.isFinite(width) &&
      width > 0
    ) {
      return `${width}%`;
    }

    return "1fr";
  });

  return `70px ${widths.join(" ")}`;

}


function applyGridTemplate() {

  const template = getGridTemplate();

  document.documentElement.style
    .setProperty("--grid-columns", template);

}


async function supabaseRequest(endpoint, options = {}) {

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${endpoint}`,
    {
      ...options,

      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",

        ...(options.headers || {})
      }
    }
  );

  if (!response.ok) {

    const text = await response.text();

    throw new Error(
      `Supabase ${response.status}: ${text}`
    );
  }

  const text = await response.text();

  return text ? JSON.parse(text) : null;
}


/* =========================================================
   CATEGORIAS
   ========================================================= */

async function loadCategories() {

  categories = await supabaseRequest(
    "torre_categories?select=*&order=position.asc"
  );

}


function renderCategoryMenu() {

  categoryMenu.innerHTML = "";

  categories.forEach(category => {

    const button = document.createElement("button");

    button.type = "button";

    button.className = "category-button";

    button.textContent = category.name;

    button.dataset.categoryId = category.id;

    button.addEventListener("click", () => {

      selectCategory(category);

    });

    categoryMenu.appendChild(button);

  });

}


function updateActiveCategoryButton() {

  document
    .querySelectorAll(".category-button")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.categoryId ===
        String(currentCategory?.id)
      );

    });

}


/* =========================================================
   SELECCIONAR CATEGORIA
   ========================================================= */

async function selectCategory(category) {

  currentCategory = category;

  categoryTitle.textContent =
    category.name || category.slug || "TORRE";

  updateActiveCategoryButton();

  await loadColumns();

  await loadRows();

  await ensureRows();

  await loadCells();

  applyGridTemplate();

  render();

  await loadLogs();

}


/* =========================================================
   COLUNAS
   ========================================================= */

async function loadColumns() {

  columns = await supabaseRequest(
    `torre_columns?category_id=eq.${encodeURIComponent(currentCategory.id)}&select=*&order=position.asc`
  );

  if (!columns.length) {

    for (let i = 0; i < 6; i++) {

      const created = await supabaseRequest(
        "torre_columns",
        {
          method: "POST",

          headers: {
            "Prefer": "return=representation"
          },

          body: JSON.stringify({
            category_id: currentCategory.id,
            position: i,
            name: `COLUNA ${i + 1}`,
            width_px: 180
          })
        }
      );

      if (created?.[0]) {
        columns.push(created[0]);
      }
    }
  }

  normalizeColumnWidths();

}


function normalizeColumnWidths() {

  if (!columns.length) {
    return;
  }

  const rawWidths = columns.map(column => {

    const width =
      Number(column.width_px);

    if (
      Number.isFinite(width) &&
      width > 20
    ) {
      return width;
    }

    return 180;
  });

  const total =
    rawWidths.reduce(
      (sum, value) => sum + value,
      0
    );

  columns.forEach((column, index) => {

    column.width_percent =
      (rawWidths[index] / total) * 100;

  });

}


/* =========================================================
   RENOMEAR COLUNAS
   ========================================================= */

async function saveColumnName(column, titleElement) {

  const newName =
    titleElement.textContent.trim();

  const finalName =
    newName || "SEM TÍTULO";

  titleElement.dataset.saving = "true";

  try {

    await supabaseRequest(
      `torre_columns?id=eq.${encodeURIComponent(column.id)}`,
      {
        method: "PATCH",

        headers: {
          "Prefer": "return=minimal"
        },

        body: JSON.stringify({
          name: finalName
        })
      }
    );

    column.name = finalName;

    titleElement.textContent = finalName;

    titleElement.dataset.saved = "true";

    setTimeout(() => {

      delete titleElement.dataset.saved;

    }, 700);

  } catch (error) {

    console.error(
      "Erro ao guardar nome da coluna:",
      error
    );

    titleElement.textContent =
      getColumnTitle(
        column,
        columns.indexOf(column)
      );

    alert(
      "Não foi possível guardar o título da coluna."
    );

  } finally {

    delete titleElement.dataset.saving;

  }

}


function createColumnHeader(column, index) {

  const cell =
    document.createElement("div");

  cell.className =
    "archive-header-cell archive-header-title";

  cell.contentEditable = "true";

  cell.spellcheck = false;

  cell.textContent =
    getColumnTitle(column, index);

  cell.title =
    "Clique para editar o título";

  cell.addEventListener(
    "blur",
    () => saveColumnName(column, cell)
  );

  cell.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {

        event.preventDefault();

        cell.blur();

      }

      if (event.key === "Escape") {

        cell.textContent =
          getColumnTitle(
            column,
            index
          );

        cell.blur();

      }

    }
  );

  createResizeHandle(
    cell,
    index
  );

  return cell;
}


/* =========================================================
   LINHAS
   ========================================================= */

async function loadRows() {

  rows = await supabaseRequest(
    `torre_rows?category_id=eq.${encodeURIComponent(currentCategory.id)}&select=*&order=position.asc`
  );

}


async function ensureRows() {

  while (rows.length < 20) {

    await createRow();

  }

}


async function createRow() {

  const highestInventoryNumber =
    rows.reduce(
      (highest, row) => {

        const number =
          Number(row.inventory_number);

        if (
          Number.isFinite(number) &&
          number > highest
        ) {
          return number;
        }

        return highest;

      },
      0
    );

  const nextInventoryNumber =
    highestInventoryNumber + 1;

  const highestPosition =
    rows.reduce(
      (highest, row) => {

        const position =
          Number(row.position);

        if (
          Number.isFinite(position) &&
          position > highest
        ) {
          return position;
        }

        return highest;

      },
      -1
    );

  const createdRows =
    await supabaseRequest(
      "torre_rows",
      {
        method: "POST",

        headers: {
          "Prefer": "return=representation"
        },

        body: JSON.stringify({
          category_id: currentCategory.id,

          position:
            highestPosition + 1,

          inventory_number:
            nextInventoryNumber
        })
      }
    );

  const row =
    createdRows?.[0];

  if (!row) {
    throw new Error(
      "Não foi possível criar a linha."
    );
  }

  for (const column of columns) {

    await supabaseRequest(
      "torre_cells",
      {
        method: "POST",

        headers: {
          "Prefer": "return=minimal"
        },

        body: JSON.stringify({
          row_id: row.id,
          column_id: column.id,
          value: null
        })
      }
    );

  }

  rows.push(row);

}


/* =========================================================
   CELLS
   ========================================================= */

async function loadCells() {

  if (!rows.length) {

    currentCells = [];

    return;
  }

  const rowIds =
    rows
      .map(row => `"${row.id}"`)
      .join(",");

  currentCells = await supabaseRequest(
    `torre_cells?row_id=in.(${rowIds})&select=*`
  );

}


function buildCellMap() {

  const map = new Map();

  currentCells.forEach(cell => {

    map.set(
      `${cell.row_id}:${cell.column_id}`,
      cell
    );

  });

  return map;

}


/* =========================================================
   RENDER
   ========================================================= */

function render() {

  archive.innerHTML = "";

  applyGridTemplate();

  const template =
    getGridTemplate();

  /* -------------------------
     CABEÇALHO ESPECIAL
     ------------------------- */

  const header =
    document.createElement("div");

  header.className =
    "archive-header-row";

  header.style.gridTemplateColumns =
    template;

  const numberHeader =
    document.createElement("div");

  numberHeader.className =
    "archive-header-cell archive-header-number";

  numberHeader.textContent =
    "nº";

  header.appendChild(numberHeader);


  columns.forEach(
    (column, index) => {

      header.appendChild(
        createColumnHeader(
          column,
          index
        )
      );

    }
  );

  archive.appendChild(header);


  /* -------------------------
     LINHAS
     ------------------------- */

  const cellMap =
    buildCellMap();

  rows.forEach(
    (row, rowIndex) => {

      archive.appendChild(
        createRowElement(
          row,
          rowIndex,
          cellMap,
          template
        )
      );

    }
  );

}


function createRowElement(
  row,
  rowIndex,
  cellMap,
  template
) {

  const rowElement =
    document.createElement("div");

  rowElement.className =
    "archive-row";

  rowElement.style.gridTemplateColumns =
    template;


  /* -------------------------
     NÚMERO
     ------------------------- */

  const numberCell =
    document.createElement("div");

  numberCell.className =
    "inventory-number-cell";

  numberCell.textContent =
    formatInventoryNumber(
      row.inventory_number
    );

  rowElement.appendChild(
    numberCell
  );


  /* -------------------------
     COLUNAS
     ------------------------- */

  columns.forEach(
    (column, columnIndex) => {

      const cell =
        cellMap.get(
          `${row.id}:${column.id}`
        );

      const value =
        cell?.value ?? "";

      let cellElement;

      if (columnIndex === 0) {

        cellElement =
          createImageCell(
            value,
            row,
            column,
            cell
          );

      } else {

        cellElement =
          createTextCell(
            value,
            row,
            column,
            cell
          );

      }

      rowElement.appendChild(
        cellElement
      );

    }
  );


  /* -------------------------
     APAGAR LINHA
     ------------------------- */

  const deleteButton =
    document.createElement("button");

  deleteButton.type = "button";

  deleteButton.className =
    "delete-row-button";

  deleteButton.textContent =
    "×";

  deleteButton.title =
    "Apagar linha";

  deleteButton.addEventListener(
    "click",
    async () => {

      await deleteRow(row);

    }
  );

  rowElement.appendChild(
    deleteButton
  );


  return rowElement;

}


/* =========================================================
   CÉLULA DE TEXTO
   ========================================================= */

function createTextCell(
  value,
  row,
  column,
  existingCell
) {

  const element =
    document.createElement("div");

  element.className =
    "cell text-cell";

  element.contentEditable =
    "true";

  element.spellcheck = false;

  element.textContent =
    value;

  element.addEventListener(
    "blur",
    async () => {

      const newValue =
        element.textContent;

      await saveCell(
        row,
        column,
        existingCell,
        newValue
      );

    }
  );

  return element;

}


/* =========================================================
   CÉLULA DE IMAGEM
   ========================================================= */

function createImageCell(
  value,
  row,
  column,
  existingCell
) {

  const element =
    document.createElement("div");

  element.className =
    "cell image-cell";


  if (value) {

    createImage(
      element,
      value
    );

  } else {

    createImagePlaceholder(
      element
    );

  }


  element.addEventListener(
    "click",
    event => {

      if (
        event.target.tagName === "IMG"
      ) {

        openImageViewer(
          value
        );

        return;
      }

      openImagePicker(
        row,
        column,
        existingCell
      );

    }
  );


  /*
    Colar imagem directamente na célula.
  */

  element.addEventListener(
    "paste",
    async event => {

      const items =
        event.clipboardData?.items;

      if (!items) {
        return;
      }

      for (const item of items) {

        if (
          item.type.startsWith("image/")
        ) {

          event.preventDefault();

          const file =
            item.getAsFile();

          if (file) {

            await processImageFile(
              file,
              row,
              column,
              existingCell
            );

          }

          break;
        }

      }

    }
  );


  return element;

}


function createImagePlaceholder(
  element
) {

  const placeholder =
    document.createElement("div");

  placeholder.className =
    "image-placeholder";

  placeholder.textContent =
    "imagem";

  element.appendChild(
    placeholder
  );

}


function createImage(
  element,
  url
) {

  const image =
    document.createElement("img");

  image.src = url;

  image.alt = "";

  image.loading = "lazy";

  element.appendChild(
    image
  );

}


/* =========================================================
   IMAGENS
   ========================================================= */

function openImagePicker(
  row,
  column,
  cell
) {

  imageTarget = {
    row,
    column,
    cell
  };

  imagePicker.value = "";

  imagePicker.click();

}


imagePicker.addEventListener(
  "change",
  async () => {

    const file =
      imagePicker.files?.[0];

    if (!file || !imageTarget) {
      return;
    }

    const {
      row,
      column,
      cell
    } = imageTarget;

    await processImageFile(
      file,
      row,
      column,
      cell
    );

    imageTarget = null;

  }
);


async function processImageFile(
  file,
  row,
  column,
  existingCell
) {

  try {

    const optimized =
      await optimizeImage(file);

    const url =
      await uploadImage(
        optimized,
        row,
        column
      );

    await saveCell(
      row,
      column,
      existingCell,
      url
    );

    await loadCells();

    render();

  } catch (error) {

    console.error(
      "Erro ao guardar imagem:",
      error
    );

    alert(
      "Não foi possível guardar a imagem."
    );

  }

}


/*
  Compressão de imagens.

  Máximo: 1600px
  JPEG: 72%
*/

async function optimizeImage(file) {

  if (!file.type.startsWith("image/")) {

    throw new Error(
      "O ficheiro não é uma imagem."
    );

  }

  const bitmap =
    await createImageBitmap(file);

  const maxSize = 1600;

  const scale =
    Math.min(
      1,
      maxSize /
      Math.max(
        bitmap.width,
        bitmap.height
      )
    );

  const width =
    Math.max(
      1,
      Math.round(bitmap.width * scale)
    );

  const height =
    Math.max(
      1,
      Math.round(bitmap.height * scale)
    );

  const canvas =
    document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context =
    canvas.getContext("2d");

  context.drawImage(
    bitmap,
    0,
    0,
    width,
    height
  );

  const blob =
    await new Promise(
      resolve => {

        canvas.toBlob(
          resolve,
          "image/jpeg",
          0.72
        );

      }
    );

  bitmap.close();

  if (!blob) {

    throw new Error(
      "Não foi possível comprimir a imagem."
    );

  }

  return new File(
    [blob],
    "torre.jpg",
    {
      type: "image/jpeg"
    }
  );

}


async function uploadImage(
  file,
  row,
  column
) {

  const fileName =
    `${currentCategory.slug}/${row.id}-${column.id}-${Date.now()}.jpg`;

  const uploadResponse =
    await fetch(
      `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${fileName}`,
      {
        method: "POST",

        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "image/jpeg",
          "x-upsert": "true"
        },

        body: file
      }
    );

  if (!uploadResponse.ok) {

    const text =
      await uploadResponse.text();

    throw new Error(
      `Upload falhou: ${text}`
    );

  }

  return (
    `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${fileName}`
  );

}


/* =========================================================
   GUARDAR CÉLULA
   ========================================================= */

async function saveCell(
  row,
  column,
  existingCell,
  value
) {

  if (existingCell?.id) {

    await supabaseRequest(
      `torre_cells?id=eq.${encodeURIComponent(existingCell.id)}`,
      {
        method: "PATCH",

        headers: {
          "Prefer": "return=minimal"
        },

        body: JSON.stringify({
          value
        })
      }
    );

    existingCell.value = value;

    return;
  }


  const created =
    await supabaseRequest(
      "torre_cells",
      {
        method: "POST",

        headers: {
          "Prefer": "return=representation"
        },

        body: JSON.stringify({
          row_id: row.id,
          column_id: column.id,
          value
        })
      }
    );

  if (created?.[0]) {

    currentCells.push(
      created[0]
    );

  }

}


/* =========================================================
   RESIZE DAS COLUNAS
   ========================================================= */

function createResizeHandle(
  cell,
  columnIndex
) {

  const handle =
    document.createElement("div");

  handle.className =
    "resize-handle";

  handle.addEventListener(
    "mousedown",
    event => {

      event.preventDefault();

      startResize(
        event,
        columnIndex
      );

    }
  );

  cell.appendChild(
    handle
  );

}


function startResize(
  event,
  columnIndex
) {

  if (
    columnIndex < 0 ||
    columnIndex >= columns.length
  ) {
    return;
  }

  resizing = true;

  const archiveRect =
    archive.getBoundingClientRect();

  const startX =
    event.clientX;

  const startWidth =
    columns[columnIndex].width_percent;

  const archiveWidth =
    archiveRect.width - 70;


  function onMove(moveEvent) {

    if (!resizing) {
      return;
    }

    const delta =
      moveEvent.clientX -
      startX;

    const deltaPercent =
      (delta / archiveWidth) * 100;

    let newWidth =
      startWidth + deltaPercent;

    newWidth =
      Math.max(
        5,
        Math.min(
          70,
          newWidth
        )
      );

    columns[columnIndex].width_percent =
      newWidth;

    applyGridTemplate();

    document
      .querySelectorAll(
        ".archive-row, .archive-header-row"
      )
      .forEach(rowElement => {

        rowElement.style.gridTemplateColumns =
          getGridTemplate();

      });

  }


  async function onUp() {

    resizing = false;

    document.removeEventListener(
      "mousemove",
      onMove
    );

    document.removeEventListener(
      "mouseup",
      onUp
    );

    await saveColumnWidths();

  }


  document.addEventListener(
    "mousemove",
    onMove
  );

  document.addEventListener(
    "mouseup",
    onUp
  );

}


async function saveColumnWidths() {

  const totalWidth =
    columns.reduce(
      (sum, column) =>
        sum +
        Number(column.width_percent || 0),
      0
    );

  for (const column of columns) {

    const normalized =
      (
        Number(column.width_percent) /
        totalWidth
      ) * 100;

    column.width_percent =
      normalized;

    const widthPx =
      Math.round(
        (normalized / 100) * 700
      );

    await supabaseRequest(
      `torre_columns?id=eq.${encodeURIComponent(column.id)}`,
      {
        method: "PATCH",

        headers: {
          "Prefer": "return=minimal"
        },

        body: JSON.stringify({
          width_px: widthPx
        })
      }
    );

  }

}


/* =========================================================
   APAGAR LINHA
   ========================================================= */

async function deleteRow(row) {

  const confirmed =
    confirm(
      `Apagar a linha ${formatInventoryNumber(row.inventory_number)}?`
    );

  if (!confirmed) {
    return;
  }

  await supabaseRequest(
    `torre_rows?id=eq.${encodeURIComponent(row.id)}`,
    {
      method: "DELETE"
    }
  );

  rows =
    rows.filter(
      item => item.id !== row.id
    );


  /*
    Reorganizar posições.
  */

  for (
    let index = 0;
    index < rows.length;
    index++
  ) {

    rows[index].position =
      index;

    await supabaseRequest(
      `torre_rows?id=eq.${encodeURIComponent(rows[index].id)}`,
      {
        method: "PATCH",

        headers: {
          "Prefer": "return=minimal"
        },

        body: JSON.stringify({
          position: index
        })
      }
    );

  }


  await loadRows();

  await loadCells();

  render();

}


/* =========================================================
   ADICIONAR LINHA
   ========================================================= */

addRowButton.addEventListener(
  "click",
  async () => {

    try {

      await createRow();

      await loadCells();

      render();

    } catch (error) {

      console.error(error);

      alert(
        "Não foi possível adicionar a linha."
      );

    }

  }
);


/* =========================================================
   ADICIONAR COLUNA
   ========================================================= */

addColumnButton.addEventListener(
  "click",
  async () => {

    const position =
      columns.length;

    const created =
      await supabaseRequest(
        "torre_columns",
        {
          method: "POST",

          headers: {
            "Prefer": "return=representation"
          },

          body: JSON.stringify({
            category_id:
              currentCategory.id,

            position,

            name:
              `COLUNA ${position + 1}`,

            width_px: 180
          })
        }
      );

    const column =
      created?.[0];

    if (!column) {
      return;
    }


    for (const row of rows) {

      await supabaseRequest(
        "torre_cells",
        {
          method: "POST",

          headers: {
            "Prefer": "return=minimal"
          },

          body: JSON.stringify({
            row_id: row.id,
            column_id: column.id,
            value: null
          })
        }
      );

    }


    await loadColumns();

    await loadCells();

    render();

  }
);


/* =========================================================
   REMOVER COLUNA
   ========================================================= */

removeColumnButton.addEventListener(
  "click",
  async () => {

    if (columns.length <= 1) {

      alert(
        "Tem de existir pelo menos uma coluna."
      );

      return;
    }


    const column =
      columns[columns.length - 1];


    const confirmed =
      confirm(
        `Remover a coluna "${getColumnTitle(column, columns.length - 1)}"?`
      );

    if (!confirmed) {
      return;
    }


    /*
      Primeiro apagamos as células
      dessa coluna.
    */

    await supabaseRequest(
      `torre_cells?column_id=eq.${encodeURIComponent(column.id)}`,
      {
        method: "DELETE"
      }
    );


    await supabaseRequest(
      `torre_columns?id=eq.${encodeURIComponent(column.id)}`,
      {
        method: "DELETE"
      }
    );


    columns =
      columns.filter(
        item => item.id !== column.id
      );


    /*
      Reposicionar colunas.
    */

    for (
      let index = 0;
      index < columns.length;
      index++
    ) {

      await supabaseRequest(
        `torre_columns?id=eq.${encodeURIComponent(columns[index].id)}`,
        {
          method: "PATCH",

          headers: {
            "Prefer": "return=minimal"
          },

          body: JSON.stringify({
            position: index
          })
        }
      );

    }


    await loadColumns();

    await loadCells();

    render();

  }
);


/* =========================================================
   MENU
   ========================================================= */

document
  .getElementById("menu-toggle")
  .addEventListener(
    "click",
    () => {

      const visible =
        categoryMenu.style.display !== "none";

      categoryMenu.style.display =
        visible ? "none" : "flex";

    }
  );


/* =========================================================
   IMAGE VIEWER
   ========================================================= */

function openImageViewer(url) {

  if (!url) {
    return;
  }

  imageViewerImage.src =
    url;

  imageViewer.classList.add(
    "visible"
  );

  imageViewer.setAttribute(
    "aria-hidden",
    "false"
  );

}


function closeImageViewer() {

  imageViewer.classList.remove(
    "visible"
  );

  imageViewer.setAttribute(
    "aria-hidden",
    "true"
  );

  imageViewerImage.src = "";

}


imageViewerClose.addEventListener(
  "click",
  closeImageViewer
);


imageViewer.addEventListener(
  "click",
  event => {

    if (
      event.target === imageViewer
    ) {

      closeImageViewer();

    }

  }
);


document.addEventListener(
  "keydown",
  event => {

    if (event.key === "Escape") {

      closeImageViewer();

    }

  }
);


/* =========================================================
   LOG
   ========================================================= */

async function loadLogs() {

  if (!currentCategory) {
    return;
  }

  const logs =
    await supabaseRequest(
      `torre_logs?category_id=eq.${encodeURIComponent(currentCategory.id)}&select=*&order=date.desc`
    );

  renderLogs(logs);

}


function renderLogs(logs) {

  logsContainer.innerHTML = "";

  if (!logs.length) {

    logsContainer.textContent =
      "sem registos";

    return;

  }


  logs.forEach(log => {

    const entry =
      document.createElement("div");

    entry.className =
      "log-entry";


    const date =
      document.createElement("div");

    date.className =
      "log-date";

    date.textContent =
      formatLogDate(log.date);


    const number =
      document.createElement("div");

    number.className =
      "log-number";

    number.textContent =
      formatInventoryNumber(
        log.inventory_number
      );


    const note =
      document.createElement("div");

    note.className =
      "log-note";

    note.textContent =
      log.note || "";


    const deleteButton =
      document.createElement("button");

    deleteButton.className =
      "log-delete";

    deleteButton.type =
      "button";

    deleteButton.textContent =
      "×";

    deleteButton.addEventListener(
      "click",
      async () => {

        await deleteLog(log);

      }
    );


    entry.appendChild(date);
    entry.appendChild(number);
    entry.appendChild(note);
    entry.appendChild(deleteButton);

    logsContainer.appendChild(entry);

  });

}


function formatLogDate(value) {

  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date.toLocaleDateString(
    "pt-PT"
  );

}


logForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const number =
      Number(
        logNumber.value
          .trim()
      );

    const note =
      logNote.value.trim();


    if (
      !Number.isFinite(number) ||
      number <= 0
    ) {

      alert(
        "Indica um número de inventário válido."
      );

      return;

    }


    const matchingRow =
      rows.find(
        row =>
          Number(row.inventory_number) ===
          number
      );


    if (!matchingRow) {

      alert(
        "Esse número de inventário não existe nesta categoria."
      );

      return;

    }


    await supabaseRequest(
      "torre_logs",
      {
        method: "POST",

        headers: {
          "Prefer": "return=minimal"
        },

        body: JSON.stringify({
          category_id:
            currentCategory.id,

          inventory_number:
            number,

          note,

          date:
            new Date().toISOString()
        })
      }
    );


    logNumber.value = "";

    logNote.value = "";

    await loadLogs();

  }
);


async function deleteLog(log) {

  const confirmed =
    confirm(
      "Apagar este registo do LOG?"
    );

  if (!confirmed) {
    return;
  }

  await supabaseRequest(
    `torre_logs?id=eq.${encodeURIComponent(log.id)}`,
    {
      method: "DELETE"
    }
  );

  await loadLogs();

}


logToggle.addEventListener(
  "click",
  () => {

    const closed =
      logContent.style.display === "none";

    logContent.style.display =
      closed ? "block" : "none";

    logToggle.textContent =
      closed ? "−" : "+";

  }
);


/* =========================================================
   POPUP DE DESENVOLVIMENTO
   ========================================================= */

developmentNoticeClose.addEventListener(
  "click",
  () => {

    developmentNotice.classList.add(
      "hidden"
    );

    developmentNotice.setAttribute(
      "aria-hidden",
      "true"
    );

  }
);


/* =========================================================
   GOOGLE SHEETS
   ========================================================= */

sheetsLink.href =
  GOOGLE_SHEETS_URL;


/* =========================================================
   INIT
   ========================================================= */

async function init() {

  try {

    await loadCategories();

    renderCategoryMenu();


    if (!categories.length) {

      categoryTitle.textContent =
        "TORRE";

      return;

    }


    await selectCategory(
      categories[0]
    );

  } catch (error) {

    console.error(
      "Erro ao iniciar TORRE:",
      error
    );

    categoryTitle.textContent =
      "Erro ao carregar TORRE";

    archive.innerHTML = `
      <div style="
        border:2px solid #0000ff;
        padding:20px;
        color:#0000ff;
      ">
        Não foi possível carregar os dados.
        Consulte a consola do navegador.
      </div>
    `;

  }

}


init();
