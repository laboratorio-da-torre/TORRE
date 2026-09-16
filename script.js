const SUPABASE_URL = "https://rvfdobjhfwjdvufwrirp.supabase.co";
const SUPABASE_KEY = "sb_publishable_aXh2UjT79AHJpjRXLVZeKA_UCRE96LL";

const GOOGLE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/1FO_BRYjuPgpVs3tVaeioE1YjDGEBtgrS5776_Q9-12I/edit?gid=1510436497#gid=1510436497S";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


/* =========================
   STATE
========================= */

let categories = [];
let currentCategory = null;

let columns = [];
let rows = [];
let logs = [];

let selectedImageCell = null;
let resizing = null;


/* =========================
   ELEMENTS
========================= */

const menuButton = document.getElementById("menu-button");
const menu = document.getElementById("menu");

const categoryTitle = document.getElementById("category-title");
const archive = document.getElementById("archive");

const addRowButton = document.getElementById("add-row");
const removeRowButton = document.getElementById("remove-row");

const addColumnButton = document.getElementById("add-column");
const removeColumnButton = document.getElementById("remove-column");

const fileInput = document.getElementById("file-input");

const imageViewer = document.getElementById("image-viewer");
const viewerImage = document.getElementById("viewer-image");

const sheetsLink = document.getElementById("sheets-link");

const logDate = document.getElementById("log-date");
const logNumber = document.getElementById("log-number");
const logNote = document.getElementById("log-note");
const saveLogButton = document.getElementById("save-log");
const logsContainer = document.getElementById("logs");


/* =========================
   INITIALISE
========================= */

document.addEventListener("DOMContentLoaded", async () => {

  sheetsLink.href = GOOGLE_SHEETS_URL;

  menuButton.addEventListener("click", () => {
    menu.classList.toggle("open");
  });

  document.querySelectorAll(".category-button").forEach(button => {
    button.addEventListener("click", async () => {

      const slug = button.dataset.category;

      menu.classList.remove("open");

      const category = categories.find(
        item => item.slug === slug
      );

      if (category) {
        await selectCategory(category);
      }
    });
  });

  addRowButton.addEventListener("click", addRow);
  removeRowButton.addEventListener("click", removeRow);

  addColumnButton.addEventListener("click", addColumn);
  removeColumnButton.addEventListener("click", removeColumn);

  saveLogButton.addEventListener("click", saveLog);

  fileInput.addEventListener("change", handleFileInput);

  imageViewer.addEventListener("click", closeImageViewer);

  document.addEventListener("mousemove", handleResizeMove);
  document.addEventListener("mouseup", handleResizeEnd);

  await loadCategories();
});


/* =========================
   CATEGORIES
========================= */

async function loadCategories() {

  const { data, error } = await supabaseClient
    .from("torre_categories")
    .select("*")
    .order("position", { ascending: true });

  if (error) {
    showError(error);
    return;
  }

  categories = data || [];

  if (!categories.length) {
    showError("Não existem categorias.");
    return;
  }

  await selectCategory(categories[0]);
}


async function selectCategory(category) {

  currentCategory = category;

  categoryTitle.textContent = category.name;

  await loadColumns();
  await ensureRows();
  await loadRows();
  await loadLogs();

  render();
}


/* =========================
   COLUMNS
========================= */

async function loadColumns() {

  const { data, error } = await supabaseClient
    .from("torre_columns")
    .select("*")
    .eq("category_id", currentCategory.id)
    .order("position", { ascending: true });

  if (error) {
    showError(error);
    return;
  }

  columns = data || [];

  if (!columns.length) {

    const newColumns = Array.from(
      { length: 6 },
      (_, index) => ({
        category_id: currentCategory.id,
        position: index,
        width_px: 180
      })
    );

    const { data: inserted, error: insertError } =
      await supabaseClient
        .from("torre_columns")
        .insert(newColumns)
        .select();

    if (insertError) {
      showError(insertError);
      return;
    }

    columns = inserted || [];
  }

  columns = columns
    .sort((a, b) => a.position - b.position)
    .map(column => ({
      ...column,
      width_px: Number(column.width_px) || 180
    }));
}


/* =========================
   ROWS
========================= */

async function ensureRows() {

  const { count, error } = await supabaseClient
    .from("torre_rows")
    .select("*", {
      count: "exact",
      head: true
    })
    .eq("category_id", currentCategory.id);

  if (error) {
    showError(error);
    return;
  }

  if (count && count > 0) {
    return;
  }

  const newRows = Array.from(
    { length: 20 },
    (_, index) => ({
      category_id: currentCategory.id,
      position: index,
      inventory_number: index + 1
    })
  );

  const { data: insertedRows, error: insertError } =
    await supabaseClient
      .from("torre_rows")
      .insert(newRows)
      .select();

  if (insertError) {
    showError(insertError);
    return;
  }

  const cells = [];

  (insertedRows || []).forEach(row => {
    columns.forEach(column => {
      cells.push({
        row_id: row.id,
        column_id: column.id,
        value: ""
      });
    });
  });

  if (cells.length) {

    const { error: cellError } =
      await supabaseClient
        .from("torre_cells")
        .insert(cells);

    if (cellError) {
      showError(cellError);
    }
  }
}


async function loadRows() {

  const { data: rowData, error: rowError } =
    await supabaseClient
      .from("torre_rows")
      .select("*")
      .eq("category_id", currentCategory.id)
      .order("position", { ascending: true });

  if (rowError) {
    showError(rowError);
    return;
  }

  const { data: cellData, error: cellError } =
    await supabaseClient
      .from("torre_cells")
      .select("*");

  if (cellError) {
    showError(cellError);
    return;
  }

  rows = (rowData || []).map(row => {

    const rowCells = {};

    (cellData || [])
      .filter(cell => cell.row_id === row.id)
      .forEach(cell => {
        rowCells[cell.column_id] = cell;
      });

    return {
      ...row,
      cells: rowCells
    };
  });
}


/* =========================
   RENDER
========================= */

function render() {

  archive.innerHTML = "";

  const template = getColumnTemplate();

  rows.forEach((row, rowIndex) => {

    const rowElement = document.createElement("div");

    rowElement.className = "archive-row";

    rowElement.dataset.rowId = row.id;

    rowElement.style.gridTemplateColumns = template;

    /* number OUTSIDE the grid */
    const numberElement = document.createElement("div");

    numberElement.className = "row-number";
    numberElement.textContent =
      String(row.inventory_number).padStart(3, "0");

    rowElement.appendChild(numberElement);


    columns.forEach((column, columnIndex) => {

      const cell = document.createElement("div");

      cell.className = "cell";

      cell.dataset.rowId = row.id;
      cell.dataset.columnId = column.id;


      if (columnIndex === 0) {

        cell.classList.add("image-cell");

        const value = row.cells[column.id]?.value || "";

        if (value) {
          createImage(cell, value);
        } else {
          createImagePlaceholder(cell, row.id, column.id);
        }

      } else {

        const value =
          row.cells[column.id]?.value || "";

        cell.contentEditable = "true";
        cell.textContent = value;

        cell.addEventListener("blur", async () => {
          await saveCell(
            row.id,
            column.id,
            cell.textContent
          );
        });
      }


      /* resize handles */
      if (columnIndex < columns.length - 1) {

        const handle = createResizeHandle(
          column.id,
          columnIndex
        );

        cell.appendChild(handle);
      }


      rowElement.appendChild(cell);
    });


    /* delete button is NOT part of grid */
    const deleteButton = document.createElement("button");

    deleteButton.className = "row-delete";
    deleteButton.textContent = "×";

    deleteButton.addEventListener("click", async event => {
      event.stopPropagation();
      await deleteRow(row.id);
    });

    rowElement.appendChild(deleteButton);


    archive.appendChild(rowElement);
  });

  applyColumnWidths();

  renderLogs();
}


/* =========================
   COLUMN WIDTHS
========================= */

function getColumnTemplate() {

  return columns
    .map(column => {
      const width = Number(column.width_px) || 180;
      return `${width}px`;
    })
    .join(" ");
}


/*
  IMPORTANT:
  Apply the same column widths to EVERY row.
*/
function applyColumnWidths() {

  const template = getColumnTemplate();

  document
    .querySelectorAll(".archive-row")
    .forEach(row => {
      row.style.gridTemplateColumns = template;
    });
}


/* =========================
   RESIZING
========================= */

function createResizeHandle(columnId, columnIndex) {

  const handle = document.createElement("div");

  handle.className = "column-resize-handle";

  handle.addEventListener("mousedown", event => {

    event.preventDefault();
    event.stopPropagation();

    const column = columns.find(
      item => item.id === columnId
    );

    if (!column) return;

    resizing = {
      columnId,
      columnIndex,
      startX: event.clientX,
      startWidth: Number(column.width_px) || 180
    };

    handle.classList.add("dragging");
  });

  return handle;
}


function handleResizeMove(event) {

  if (!resizing) return;

  const column = columns.find(
    item => item.id === resizing.columnId
  );

  if (!column) return;

  const difference =
    event.clientX - resizing.startX;

  const newWidth = Math.max(
    60,
    resizing.startWidth + difference
  );

  column.width_px = Math.round(newWidth);

  /*
    Reapply to ALL rows while dragging.
  */
  applyColumnWidths();
}


async function handleResizeEnd() {

  if (!resizing) return;

  const resizeState = resizing;

  resizing = null;

  document
    .querySelectorAll(".column-resize-handle.dragging")
    .forEach(handle => {
      handle.classList.remove("dragging");
    });

  const column = columns.find(
    item => item.id === resizeState.columnId
  );

  if (!column) return;

  const { error } = await supabaseClient
    .from("torre_columns")
    .update({
      width_px: column.width_px
    })
    .eq("id", column.id);

  if (error) {
    console.error("Erro a guardar largura:", error);
  }
}


/* =========================
   CELLS
========================= */

async function saveCell(rowId, columnId, value) {

  const { data, error } =
    await supabaseClient
      .from("torre_cells")
      .select("id")
      .eq("row_id", rowId)
      .eq("column_id", columnId)
      .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  if (data) {

    await supabaseClient
      .from("torre_cells")
      .update({ value })
      .eq("id", data.id);

  } else {

    await supabaseClient
      .from("torre_cells")
      .insert({
        row_id: rowId,
        column_id: columnId,
        value
      });
  }
}


/* =========================
   IMAGES
========================= */

function createImage(cell, imageUrl) {

  /*
    Preserve resize handle if the cell already has one.
  */
  const existingHandle =
    cell.querySelector(".column-resize-handle");

  cell.innerHTML = "";

  const image = document.createElement("img");

  image.src = imageUrl;
  image.alt = "";

  image.addEventListener("click", event => {
    event.stopPropagation();
    openImageViewer(imageUrl);
  });

  cell.appendChild(image);

  if (existingHandle) {
    cell.appendChild(existingHandle);
  }
}


function createImagePlaceholder(cell, rowId, columnId) {

  cell.innerHTML = "";

  const placeholder =
    document.createElement("div");

  placeholder.className = "image-placeholder";

  placeholder.addEventListener("click", () => {

    selectedImageCell = {
      cell,
      rowId,
      columnId
    };

    fileInput.value = "";
    fileInput.click();
  });

  cell.appendChild(placeholder);
}


async function handleFileInput(event) {

  const file = event.target.files?.[0];

  if (!file || !selectedImageCell) {
    return;
  }

  try {

    const compressed =
      await compressImage(file);

    const filename =
      `${crypto.randomUUID()}.jpg`;

    const path =
      `${currentCategory.slug}/${filename}`;

    const { error: uploadError } =
      await supabaseClient.storage
        .from("images")
        .upload(path, compressed, {
          contentType: "image/jpeg",
          upsert: false
        });

    if (uploadError) {
      showError(uploadError);
      return;
    }

    const { data: publicData } =
      supabaseClient.storage
        .from("images")
        .getPublicUrl(path);

    const imageUrl = publicData.publicUrl;

    await saveCell(
      selectedImageCell.rowId,
      selectedImageCell.columnId,
      imageUrl
    );

    selectedImageCell.cell.classList.add(
      "image-cell"
    );

    createImage(
      selectedImageCell.cell,
      imageUrl
    );

  } catch (error) {
    showError(error);
  }

  selectedImageCell = null;
}


function compressImage(file) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = event => {

      const image = new Image();

      image.onload = () => {

        const maxSize = 2000;

        let width = image.width;
        let height = image.height;

        if (width > maxSize || height > maxSize) {

          if (width > height) {

            height =
              Math.round(
                height * maxSize / width
              );

            width = maxSize;

          } else {

            width =
              Math.round(
                width * maxSize / height
              );

            height = maxSize;
          }
        }

        const canvas =
          document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const context =
          canvas.getContext("2d");

        context.drawImage(
          image,
          0,
          0,
          width,
          height
        );

        canvas.toBlob(
          blob => {

            if (blob) {
              resolve(blob);
            } else {
              reject(
                new Error(
                  "Não foi possível comprimir a imagem."
                )
              );
            }

          },
          "image/jpeg",
          0.85
        );
      };

      image.onerror = reject;

      image.src = event.target.result;
    };

    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}


/* =========================
   IMAGE VIEWER
========================= */

function openImageViewer(url) {

  viewerImage.src = url;

  imageViewer.classList.add("open");
}


function closeImageViewer() {

  imageViewer.classList.remove("open");

  viewerImage.src = "";
}


/* =========================
   ROWS
========================= */

async function addRow() {

  const nextPosition =
    rows.length
      ? Math.max(...rows.map(row => row.position)) + 1
      : 0;

  const nextInventory =
    rows.length
      ? Math.max(
          ...rows.map(
            row => Number(row.inventory_number) || 0
          )
        ) + 1
      : 1;

  const { data: row, error } =
    await supabaseClient
      .from("torre_rows")
      .insert({
        category_id: currentCategory.id,
        position: nextPosition,
        inventory_number: nextInventory
      })
      .select()
      .single();

  if (error) {
    showError(error);
    return;
  }

  const cells = columns.map(column => ({
    row_id: row.id,
    column_id: column.id,
    value: ""
  }));

  if (cells.length) {

    const { error: cellError } =
      await supabaseClient
        .from("torre_cells")
        .insert(cells);

    if (cellError) {
      showError(cellError);
      return;
    }
  }

  await loadRows();
  render();
}


async function removeRow() {

  if (!rows.length) return;

  const row = rows[rows.length - 1];

  await deleteRow(row.id);
}


async function deleteRow(rowId) {

  const { error } =
    await supabaseClient
      .from("torre_rows")
      .delete()
      .eq("id", rowId);

  if (error) {
    showError(error);
    return;
  }

  await loadRows();
  render();
}


/* =========================
   COLUMNS
========================= */

async function addColumn() {

  const nextPosition =
    columns.length
      ? Math.max(...columns.map(column => column.position)) + 1
      : 0;

  const { data: column, error } =
    await supabaseClient
      .from("torre_columns")
      .insert({
        category_id: currentCategory.id,
        position: nextPosition,
        width_px: 180
      })
      .select()
      .single();

  if (error) {
    showError(error);
    return;
  }

  const cells = rows.map(row => ({
    row_id: row.id,
    column_id: column.id,
    value: ""
  }));

  if (cells.length) {

    const { error: cellError } =
      await supabaseClient
        .from("torre_cells")
        .insert(cells);

    if (cellError) {
      showError(cellError);
      return;
    }
  }

  await loadColumns();
  await loadRows();

  render();
}


async function removeColumn() {

  if (columns.length <= 1) {
    return;
  }

  const column =
    columns[columns.length - 1];

  const { error } =
    await supabaseClient
      .from("torre_columns")
      .delete()
      .eq("id", column.id);

  if (error) {
    showError(error);
    return;
  }

  await loadColumns();
  await loadRows();

  render();
}


/* =========================
   LOGS
========================= */

async function loadLogs() {

  const { data, error } =
    await supabaseClient
      .from("torre_logs")
      .select("*")
      .eq("category_id", currentCategory.id)
      .order("log_date", {
        ascending: false
      })
      .order("created_at", {
        ascending: false
      });

  if (error) {
    showError(error);
    return;
  }

  logs = data || [];
}


async function saveLog() {

  const date = logDate.value;
  const number =
    Number(logNumber.value);

  const note =
    logNote.value.trim();

  if (!date || !number || !note) {
    return;
  }

  const { error } =
    await supabaseClient
      .from("torre_logs")
      .insert({
        category_id: currentCategory.id,
        inventory_number: number,
        log_date: date,
        note
      });

  if (error) {
    showError(error);
    return;
  }

  logDate.value = "";
  logNumber.value = "";
  logNote.value = "";

  await loadLogs();

  renderLogs();
}


function renderLogs() {

  logsContainer.innerHTML = "";

  logs.forEach(log => {

    const entry =
      document.createElement("div");

    entry.className = "log-entry";


    const date =
      document.createElement("div");

    date.className = "log-date";
    date.textContent = log.log_date;


    const number =
      document.createElement("div");

    number.className = "log-number";

    number.textContent =
      String(log.inventory_number)
        .padStart(3, "0");


    const note =
      document.createElement("div");

    note.className = "log-note";
    note.textContent = log.note;


    const deleteButton =
      document.createElement("button");

    deleteButton.className = "delete-log";
    deleteButton.textContent = "×";

    deleteButton.addEventListener(
      "click",
      async () => {

        const { error } =
          await supabaseClient
            .from("torre_logs")
            .delete()
            .eq("id", log.id);

        if (error) {
          showError(error);
          return;
        }

        await loadLogs();
        renderLogs();
      }
    );


    entry.appendChild(date);
    entry.appendChild(number);
    entry.appendChild(note);
    entry.appendChild(deleteButton);

    logsContainer.appendChild(entry);
  });
}


/* =========================
   ERRORS
========================= */

function showError(error) {

  console.error(error);

  const message =
    error?.message ||
    String(error);

  alert(message);
}
