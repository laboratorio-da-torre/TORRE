/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const SUPABASE_URL =
  "https://rvfdobjhfwjdvufwrirp.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_aXh2UjT79AHJpjRXLVZeKA_UCRE96LL";

const BUCKET =
  "images";

const GOOGLE_SHEETS_URL =
  "https://docs.google.com/spreadsheets/d/1FO_BRYjuPgpVs3tVaeioE1YjDGEBtgrS5776_Q9-12I/edit?gid=1510436497#gid=1510436497";


/* =========================================================
   DOM
========================================================= */

const menuButton =
  document.getElementById("menu-button");

const menu =
  document.getElementById("menu");

const archive =
  document.getElementById("archive");

const addRowButton =
  document.getElementById("add-row");

const removeRowButton =
  document.getElementById("remove-row");

const addColumnButton =
  document.getElementById("add-column");

const removeColumnButton =
  document.getElementById("remove-column");

const categoryTitle =
  document.getElementById("category-title");

const imageFileInput =
  document.getElementById("image-file-input");

const imageViewer =
  document.getElementById("image-viewer");

const viewerImage =
  document.getElementById("viewer-image");

const logs =
  document.getElementById("logs");

const logDate =
  document.getElementById("log-date");

const logNumber =
  document.getElementById("log-number");

const logNote =
  document.getElementById("log-note");

const saveLogButton =
  document.getElementById("save-log");

const sheetsLink =
  document.getElementById("sheets-link");

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

let activeImageCell = null;
let activeResize = null;


/* =========================================================
   POPUP
========================================================= */

if (
  developmentNotice &&
  developmentNoticeClose
) {

  developmentNoticeClose.addEventListener(
    "click",
    function(event) {

      event.preventDefault();
      event.stopPropagation();

      developmentNotice.style.display =
        "none";
    }
  );
}


/* =========================================================
   SUPABASE
========================================================= */

async function supabaseRequest(
  endpoint,
  options = {}
) {

  const response =
    await fetch(
      SUPABASE_URL +
      "/rest/v1/" +
      endpoint,
      {
        ...options,

        headers: {
          "apikey":
            SUPABASE_KEY,

          "Authorization":
            "Bearer " +
            SUPABASE_KEY,

          "Content-Type":
            "application/json",

          "Accept":
            "application/json",

          ...(options.headers || {})
        }
      }
    );


  if (!response.ok) {

    const text =
      await response.text();

    throw new Error(
      "Supabase " +
      response.status +
      ": " +
      text
    );
  }


  if (
    response.status === 204
  ) {
    return null;
  }


  const text =
    await response.text();

  if (!text) {
    return null;
  }


  return JSON.parse(text);
}


/* =========================================================
   CATEGORIAS
========================================================= */

async function loadCategories() {

  categories =
    await supabaseRequest(
      "torre_categories?select=*&order=position.asc"
    );


  renderCategoryMenu();


  if (
    !currentCategory &&
    categories.length
  ) {

    await selectCategory(
      categories[0].slug
    );
  }
}


/* =========================================================
   MENU
========================================================= */

function renderCategoryMenu() {

  const buttons =
    document.querySelectorAll(
      ".category-button"
    );


  buttons.forEach(
    button => {

      const slug =
        button.dataset.category;

      const category =
        categories.find(
          item =>
            item.slug === slug
        );


      if (category) {

        button.textContent =
          category.name;

        button.style.display =
          "";
      } else {

        button.style.display =
          "block";
      }


      button.onclick =
        () => selectCategory(slug);
    }
  );
}


/* =========================================================
   SELECCIONAR CATEGORIA
========================================================= */

async function selectCategory(
  slug
) {

  const category =
    categories.find(
      item =>
        item.slug === slug
    );


  if (!category) {
    return;
  }


  currentCategory =
    category;


  categoryTitle.textContent =
    category.name;


  menu.classList.remove(
    "open"
  );


  await loadColumns();

  await loadRows();

  await ensureRows();

  await repairInventoryNumbers();

  await loadRows();

  await loadCells();

  render();

  await loadLogs();
}


/* =========================================================
   COLUNAS
========================================================= */

async function loadColumns() {

  columns =
    await supabaseRequest(
      "torre_columns?category_id=eq." +
      currentCategory.id +
      "&select=*&order=position.asc"
    );


  if (!columns.length) {

    const newColumns = [];


    for (
      let i = 0;
      i < 6;
      i++
    ) {

      newColumns.push({
        category_id:
          currentCategory.id,

        position:
          i,

        width_px:
          160,

        name:
          i === 0
            ? "imagem"
            : "coluna " + i
      });
    }


    await supabaseRequest(
      "torre_columns",
      {
        method: "POST",

        headers: {
          "Prefer":
            "return=representation"
        },

        body:
          JSON.stringify(
            newColumns
          )
      }
    );


    columns =
      await supabaseRequest(
        "torre_columns?category_id=eq." +
        currentCategory.id +
        "&select=*&order=position.asc"
      );
  }


  let changed =
    false;


  columns.forEach(
    (column, index) => {

      if (
        !column.name ||
        !String(column.name).trim()
      ) {

        column.name =
          index === 0
            ? "imagem"
            : "coluna " + index;

        changed =
          true;
      }


      if (
        !column.width_px ||
        Number(column.width_px) <= 0
      ) {

        column.width_px =
          160;

        changed =
          true;
      }
    }
  );


  if (changed) {

    for (const column of columns) {

      await supabaseRequest(
        "torre_columns?id=eq." +
        column.id,
        {
          method: "PATCH",

          body:
            JSON.stringify({
              name:
                column.name,

              width_px:
                column.width_px
            })
        }
      );
    }
  }
}


/* =========================================================
   GRID
========================================================= */

function getGridTemplate() {

  const tracks =
    columns.map(
      column =>
        Math.max(
          Number(
            column.width_px
          ) || 160,
          40
        ) + "fr"
    );


  return [
    "44px",
    ...tracks
  ].join(" ");
}


function applyGridTemplate() {

  const template =
    getGridTemplate();


  const elements =
    archive.querySelectorAll(
      ".archive-header, .archive-row"
    );


  elements.forEach(
    element => {

      element.style
        .setProperty(
          "--grid-columns",
          template
        );
    }
  );
}


/* =========================================================
   LINHAS
========================================================= */

async function loadRows() {

  rows =
    await supabaseRequest(
      "torre_rows?category_id=eq." +
      currentCategory.id +
      "&select=*&order=position.asc"
    );
}


async function ensureRows() {

  const minimumRows =
    20;


  if (
    rows.length >=
    minimumRows
  ) {
    return;
  }


  let position =
    rows.length;


  while (
    rows.length <
    minimumRows
  ) {

    const row =
      await createRow(
        position
      );

    rows.push(row);

    position++;
  }
}


/* =========================================================
   CORRIGIR NÚMEROS DE INVENTÁRIO
========================================================= */

async function repairInventoryNumbers() {

  /*
   * O número visual corresponde à posição
   * da linha no arquivo.
   *
   * Assim:
   * primeira linha = 001
   * segunda linha  = 002
   * terceira linha = 003
   *
   * Isto também corrige números duplicados
   * ou números antigos que ficaram errados.
   */

  const orderedRows =
    [...rows].sort(
      (a, b) =>
        Number(a.position || 0) -
        Number(b.position || 0)
    );


  for (
    let index = 0;
    index < orderedRows.length;
    index++
  ) {

    const row =
      orderedRows[index];


    const expectedNumber =
      index + 1;


    const currentNumber =
      Number(
        row.inventory_number
      );


    if (
      currentNumber ===
      expectedNumber
    ) {
      continue;
    }


    await supabaseRequest(
      "torre_rows?id=eq." +
      row.id,
      {
        method:
          "PATCH",

        body:
          JSON.stringify({
            inventory_number:
              expectedNumber
          })
      }
    );


    row.inventory_number =
      expectedNumber;
  }


  /*
   * Mantém também o estado principal
   * actualizado.
   */

  rows =
    orderedRows;
}
    }
  );


  for (
    const row of rows
  ) {

    const current =
      Number(
        row.inventory_number
      );


    if (
      Number.isFinite(current) &&
      current > 0
    ) {
      continue;
    }


    let next =
      1;


    while (
      used.has(next)
    ) {
      next++;
    }


    await supabaseRequest(
      "torre_rows?id=eq." +
      row.id,
      {
        method: "PATCH",

        body:
          JSON.stringify({
            inventory_number:
              next
          })
      }
    );


    row.inventory_number =
      next;


    used.add(next);
  }
}


/* =========================================================
   CRIAR LINHA
========================================================= */

async function createRow(
  position
) {

  const used =
    new Set(
      rows
        .map(
          row =>
            Number(
              row.inventory_number
            )
        )
        .filter(
          number =>
            Number.isFinite(number) &&
            number > 0
        )
    );


  let number =
    1;


  while (
    used.has(number)
  ) {
    number++;
  }


  const created =
    await supabaseRequest(
      "torre_rows",
      {
        method: "POST",

        headers: {
          "Prefer":
            "return=representation"
        },

        body:
          JSON.stringify({
            category_id:
              currentCategory.id,

            position,

            inventory_number:
              number
          })
      }
    );


  const row =
    Array.isArray(created)
      ? created[0]
      : created;


  for (
    const column of columns
  ) {

    await supabaseRequest(
      "torre_cells",
      {
        method: "POST",

        headers: {
          "Prefer":
            "return=minimal"
        },

        body:
          JSON.stringify({
            row_id:
              row.id,

            column_id:
              column.id,

            value:
              null
          })
      }
    );
  }


  return row;
}


/* =========================================================
   CÉLULAS
========================================================= */

let cells = [];


async function loadCells() {

  cells =
    await supabaseRequest(
      "torre_cells?select=*"
    );
}


/* =========================================================
   RENDER
========================================================= */

function render() {

  archive.innerHTML =
    "";


  renderArchiveHeader();


  rows.forEach(
    row => {

      archive.appendChild(
        createRowElement(
          row
        )
      );
    }
  );


  applyGridTemplate();
}


/* =========================================================
   CABEÇALHO
========================================================= */

function renderArchiveHeader() {

  const header =
    document.createElement(
      "div"
    );


  header.className =
    "archive-header";


  header.style.setProperty(
    "--grid-columns",
    getGridTemplate()
  );


  const numberHeader =
    document.createElement(
      "div"
    );


  numberHeader.className =
    "archive-header-cell archive-header-number";


  numberHeader.textContent =
    "nº";


  header.appendChild(
    numberHeader
  );


  columns.forEach(
    (
      column,
      index
    ) => {

      const cell =
        document.createElement(
          "div"
        );


      cell.className =
        "archive-header-cell";


      const title =
        document.createElement(
          "div"
        );


      title.className =
        "archive-header-title";


      title.contentEditable =
        "true";


      title.spellcheck =
        false;


      title.textContent =
        column.name ||
        (
          index === 0
            ? "imagem"
            : "coluna " + index
        );


      title.addEventListener(
        "keydown",
        event => {

          if (
            event.key ===
            "Enter"
          ) {

            event.preventDefault();

            title.blur();
          }
        }
      );


      title.addEventListener(
        "blur",
        async () => {

          const newName =
            title.textContent
              .replace(
                /\n/g,
                ""
              )
              .trim();


          const finalName =
            newName ||
            (
              index === 0
                ? "imagem"
                : "coluna " + index
            );


          title.textContent =
            finalName;


          column.name =
            finalName;


          try {

            await supabaseRequest(
              "torre_columns?id=eq." +
              column.id,
              {
                method: "PATCH",

                body:
                  JSON.stringify({
                    name:
                      finalName
                  })
              }
            );

          } catch (error) {

            console.error(
              error
            );
          }
        }
      );


      cell.appendChild(
        title
      );


      /*
       * Resize
       */

      const handle =
        document.createElement(
          "div"
        );


      handle.className =
        "column-resize-handle";


      handle.addEventListener(
        "pointerdown",
        event => {

          startColumnResize(
            event,
            index,
            handle
          );
        }
      );


      cell.appendChild(
        handle
      );


      header.appendChild(
        cell
      );
    }
  );


  archive.appendChild(
    header
  );
}


/* =========================================================
   CRIAR LINHA VISUAL
========================================================= */

function createRowElement(
  row
) {

  const rowElement =
    document.createElement(
      "div"
    );


  rowElement.className =
    "archive-row";


  rowElement.dataset.rowId =
    row.id;


  rowElement.style.setProperty(
    "--grid-columns",
    getGridTemplate()
  );


  /*
   * NÚMERO
   */

  const numberCell =
    document.createElement(
      "div"
    );


  numberCell.className =
    "cell inventory-number-cell";


  const number =
    Number(
      row.inventory_number
    );


  if (
    Number.isFinite(number)
  ) {

    numberCell.textContent =
      String(
        Math.floor(number)
      ).padStart(
        3,
        "0"
      );

  } else {

    numberCell.textContent =
      "";

    numberCell.classList.add(
      "empty"
    );
  }


  rowElement.appendChild(
    numberCell
  );


  /*
   * COLUNAS
   */

  columns.forEach(
    (
      column,
      columnIndex
    ) => {

      const cell =
        document.createElement(
          "div"
        );


      cell.className =
        "cell";


      const existing =
        cells.find(
          item =>
            String(
              item.row_id
            ) ===
            String(
              row.id
            ) &&
            String(
              item.column_id
            ) ===
            String(
              column.id
            )
        );


      const value =
        existing
          ? existing.value || ""
          : "";


      /*
       * PRIMEIRA COLUNA = IMAGEM
       */

      if (
        columnIndex === 0
      ) {

        cell.classList.add(
          "image-cell"
        );


        if (
          value
        ) {

          const image =
            document.createElement(
              "img"
            );


          image.src =
            value;

          image.alt =
            "";


          image.addEventListener(
            "click",
            event => {

              event.stopPropagation();

              openImageViewer(
                value
              );
            }
          );


          cell.appendChild(
            image
          );

        } else {

          const placeholder =
            document.createElement(
              "div"
            );


          placeholder.className =
            "image-placeholder";


          placeholder.textContent =
            "";


          cell.appendChild(
            placeholder
          );
        }


        cell.addEventListener(
          "click",
          event => {

            if (
              event.target.tagName ===
              "IMG"
            ) {
              return;
            }


            activeImageCell = {
              row,
              column,
              cell
            };


            imageFileInput.value =
              "";


            imageFileInput.click();
          }
        );


        cell.addEventListener(
          "paste",
          async event => {

            const items =
              event.clipboardData &&
              event.clipboardData.items;


            if (!items) {
              return;
            }


            for (
              const item of items
            ) {

              if (
                item.type.startsWith(
                  "image/"
                )
              ) {

                const file =
                  item.getAsFile();


                if (file) {

                  await saveImageToCell(
                    file,
                    row,
                    column,
                    cell
                  );
                }
              }
            }
          }
        );

      } else {

        /*
         * TEXTO
         */

        cell.contentEditable =
          "true";


        cell.spellcheck =
          false;


        cell.textContent =
          value;


        cell.addEventListener(
          "blur",
          async () => {

            await saveCell(
              row.id,
              column.id,
              cell.textContent
            );
          }
        );


        cell.addEventListener(
          "keydown",
          event => {

            if (
              event.key ===
              "Enter" &&
              !event.shiftKey
            ) {

              event.preventDefault();

              cell.blur();
            }
          }
        );
      }


      rowElement.appendChild(
        cell
      );
    }
  );


  /*
   * APAGAR LINHA
   */

  const deleteButton =
    document.createElement(
      "button"
    );


  deleteButton.className =
    "delete-row";


  deleteButton.textContent =
    "×";


  deleteButton.title =
    "Apagar linha";


  deleteButton.addEventListener(
    "click",
    async event => {

      event.stopPropagation();

      await deleteRow(
        row.id
      );
    }
  );


  rowElement.appendChild(
    deleteButton
  );


  return rowElement;
}


/* =========================================================
   GUARDAR CÉLULA
========================================================= */

async function saveCell(
  rowId,
  columnId,
  value
) {

  const existing =
    cells.find(
      item =>
        String(
          item.row_id
        ) ===
        String(
          rowId
        ) &&
        String(
          item.column_id
        ) ===
        String(
          columnId
        )
    );


  if (existing) {

    await supabaseRequest(
      "torre_cells?id=eq." +
      existing.id,
      {
        method: "PATCH",

        body:
          JSON.stringify({
            value:
              value || null
          })
      }
    );

  } else {

    await supabaseRequest(
      "torre_cells",
      {
        method: "POST",

        body:
          JSON.stringify({
            row_id:
              rowId,

            column_id:
              columnId,

            value:
              value || null
          })
      }
    );
  }


  await loadCells();
}


/* =========================================================
   IMAGENS
========================================================= */

imageFileInput.addEventListener(
  "change",
  async () => {

    if (
      !imageFileInput.files.length ||
      !activeImageCell
    ) {
      return;
    }


    const file =
      imageFileInput.files[0];


    await saveImageToCell(
      file,
      activeImageCell.row,
      activeImageCell.column,
      activeImageCell.cell
    );
  }
);


async function saveImageToCell(
  file,
  row,
  column,
  cell
) {

  try {

    const optimized =
      await optimizeImage(
        file
      );


    const url =
      await uploadImage(
        optimized,
        row.id
      );


    await saveCell(
      row.id,
      column.id,
      url
    );


    const image =
      document.createElement(
        "img"
      );


    image.src =
      url;


    image.alt =
      "";


    image.addEventListener(
      "click",
      event => {

        event.stopPropagation();

        openImageViewer(
          url
        );
      }
    );


    cell.innerHTML =
      "";

    cell.appendChild(
      image
    );

  } catch (error) {

    console.error(
      error
    );

    alert(
      "Não foi possível guardar a imagem."
    );
  }
}


async function optimizeImage(
  file
) {

  const image =
    await new Promise(
      (
        resolve,
        reject
      ) => {

        const img =
          new Image();


        img.onload =
          () => resolve(img);

        img.onerror =
          reject;


        img.src =
          URL.createObjectURL(
            file
          );
      }
    );


  const maxSize =
    1600;


  let width =
    image.naturalWidth;

  let height =
    image.naturalHeight;


  if (
    width > maxSize ||
    height > maxSize
  ) {

    const ratio =
      Math.min(
        maxSize / width,
        maxSize / height
      );


    width =
      Math.round(
        width * ratio
      );

    height =
      Math.round(
        height * ratio
      );
  }


  const canvas =
    document.createElement(
      "canvas"
    );


  canvas.width =
    width;

  canvas.height =
    height;


  const context =
    canvas.getContext(
      "2d"
    );


  context.drawImage(
    image,
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
          0.82
        );
      }
    );


  return new File(
    [blob],
    "torre.jpg",
    {
      type:
        "image/jpeg"
    }
  );
}


async function uploadImage(
  file,
  rowId
) {

  const filename =
    Date.now() +
    "-" +
    rowId +
    ".jpg";


  const path =
    currentCategory.slug +
    "/" +
    filename;


  const response =
    await fetch(
      SUPABASE_URL +
      "/storage/v1/object/" +
      BUCKET +
      "/" +
      path,
      {
        method:
          "POST",

        headers: {
          "apikey":
            SUPABASE_KEY,

          "Authorization":
            "Bearer " +
            SUPABASE_KEY,

          "Content-Type":
            "image/jpeg",

          "x-upsert":
            "true"
        },

        body:
          file
      }
    );


  if (!response.ok) {

    const text =
      await response.text();

    throw new Error(
      text
    );
  }


  return (
    SUPABASE_URL +
    "/storage/v1/object/public/" +
    BUCKET +
    "/" +
    path
  );
}


/* =========================================================
   APAGAR LINHA
========================================================= */

async function deleteRow(
  rowId
) {

  await supabaseRequest(
    "torre_cells?row_id=eq." +
    rowId,
    {
      method:
        "DELETE"
    }
  );


  await supabaseRequest(
    "torre_rows?id=eq." +
    rowId,
    {
      method:
        "DELETE"
    }
  );


  rows =
    rows.filter(
      row =>
        String(
          row.id
        ) !==
        String(
          rowId
        )
    );


  cells =
    cells.filter(
      cell =>
        String(
          cell.row_id
        ) !==
        String(
          rowId
        )
    );


  render();
}


/* =========================================================
   ADICIONAR LINHA
========================================================= */

addRowButton.addEventListener(
  "click",
  async () => {

    const row =
      await createRow(
        rows.length
      );


    rows.push(
      row
    );


    await loadCells();

    render();
  }
);


/* =========================================================
   REMOVER ÚLTIMA LINHA
========================================================= */

removeRowButton.addEventListener(
  "click",
  async () => {

    if (
      rows.length <= 1
    ) {
      return;
    }


    const row =
      rows[
        rows.length - 1
      ];


    await deleteRow(
      row.id
    );
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


    const column =
      await supabaseRequest(
        "torre_columns",
        {
          method:
            "POST",

          headers: {
            "Prefer":
              "return=representation"
          },

          body:
            JSON.stringify({
              category_id:
                currentCategory.id,

              position,

              width_px:
                160,

              name:
                position === 0
                  ? "imagem"
                  : "coluna " + position
            })
        }
      );


    const newColumn =
      Array.isArray(column)
        ? column[0]
        : column;


    /*
     * Criar células para
     * todas as linhas
     */

    for (
      const row of rows
    ) {

      await supabaseRequest(
        "torre_cells",
        {
          method:
            "POST",

          body:
            JSON.stringify({
              row_id:
                row.id,

              column_id:
                newColumn.id,

              value:
                null
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
   REMOVER ÚLTIMA COLUNA
========================================================= */

removeColumnButton.addEventListener(
  "click",
  async () => {

    if (
      columns.length <= 1
    ) {
      return;
    }


    const column =
      columns[
        columns.length - 1
      ];


    await supabaseRequest(
      "torre_cells?column_id=eq." +
      column.id,
      {
        method:
          "DELETE"
      }
    );


    await supabaseRequest(
      "torre_columns?id=eq." +
      column.id,
      {
        method:
          "DELETE"
      }
    );


    await loadColumns();

    await loadCells();

    render();
  }
);


/* =========================================================
   RESIZE DAS COLUNAS
========================================================= */

function startColumnResize(
  event,
  columnIndex,
  handle
) {

  event.preventDefault();

  handle.setPointerCapture(
    event.pointerId
  );


  const startX =
    event.clientX;


  const startWidth =
    Number(
      columns[
        columnIndex
      ].width_px
    ) || 160;


  activeResize = {
    columnIndex,
    startX,
    startWidth,
    handle
  };


  handle.classList.add(
    "dragging"
  );


  handle.addEventListener(
    "pointermove",
    resizeColumn
  );


  handle.addEventListener(
    "pointerup",
    finishColumnResize,
    {
      once: true
    }
  );
}


function resizeColumn(
  event
) {

  if (!activeResize) {
    return;
  }


  const delta =
    event.clientX -
    activeResize.startX;


  const newWidth =
    Math.max(
      40,
      activeResize.startWidth +
      delta
    );


  columns[
    activeResize.columnIndex
  ].width_px =
    Math.round(
      newWidth
    );


  applyGridTemplate();
}


async function finishColumnResize(
  event
) {

  if (!activeResize) {
    return;
  }


  const data =
    activeResize;


  data.handle.releasePointerCapture(
    event.pointerId
  );


  data.handle.classList.remove(
    "dragging"
  );


  data.handle.removeEventListener(
    "pointermove",
    resizeColumn
  );


  activeResize =
    null;


  const column =
    columns[
      data.columnIndex
    ];


  await supabaseRequest(
    "torre_columns?id=eq." +
    column.id,
    {
      method:
        "PATCH",

      body:
        JSON.stringify({
          width_px:
            Math.round(
              column.width_px
            )
        })
    }
  );
}


/* =========================================================
   MENU
========================================================= */

menuButton.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    menu.classList.toggle(
      "open"
    );
  }
);


document.addEventListener(
  "click",
  event => {

    if (
      !menu.contains(
        event.target
      ) &&
      event.target !==
        menuButton
    ) {

      menu.classList.remove(
        "open"
      );
    }
  }
);


/* =========================================================
   IMAGE VIEWER
========================================================= */

/* =========================================================
   IMAGE VIEWER
========================================================= */

function openImageViewer(
  url
) {

  viewerImage.src =
    url;

  imageViewer.classList.add(
    "open"
  );
}


function closeImageViewer() {

  imageViewer.classList.remove(
    "open"
  );

  viewerImage.src =
    "";
}


imageViewerClose.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    closeImageViewer();
  }
);


imageViewer.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      imageViewer
    ) {

      closeImageViewer();
    }
  }
);


document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Escape"
    ) {

      closeImageViewer();
    }
  }
);


document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Escape"
    ) {

      imageViewer.classList.remove(
        "open"
      );

      viewerImage.src =
        "";
    }
  }
);


/* =========================================================
   LOG
========================================================= */

async function loadLogs() {

  const data =
    await supabaseRequest(
      "torre_logs?category_id=eq." +
      currentCategory.id +
      "&select=*&order=log_date.asc,created_at.asc"
    );


  renderLogs(
    data
  );
}


function formatInventoryNumber(
  number
) {

  const value =
    Number(number);


  if (
    !Number.isFinite(value)
  ) {

    return "";
  }


  return String(
    Math.floor(value)
  ).padStart(
    3,
    "0"
  );
}


function renderLogs(
  data
) {

  logs.innerHTML =
    "";


  data.forEach(
    log => {

      const entry =
        document.createElement(
          "div"
        );


      entry.className =
        "log-entry";


      const date =
        document.createElement(
          "div"
        );


      date.className =
        "log-date-display";


      date.textContent =
        log.log_date ||
        "";


      const number =
        document.createElement(
          "div"
        );


      number.className =
        "log-number-display";


      number.textContent =
        formatInventoryNumber(
          log.inventory_number
        );


      const note =
        document.createElement(
          "div"
        );


      note.className =
        "log-note-display";


      note.textContent =
        log.note ||
        "";


      const remove =
        document.createElement(
          "button"
        );


      remove.className =
        "delete-log";


      remove.textContent =
        "×";


      remove.addEventListener(
        "click",
        async () => {

          await supabaseRequest(
            "torre_logs?id=eq." +
            log.id,
            {
              method:
                "DELETE"
            }
          );


          await loadLogs();
        }
      );


      entry.appendChild(
        date
      );

      entry.appendChild(
        number
      );

      entry.appendChild(
        note
      );

      entry.appendChild(
        remove
      );


      logs.appendChild(
        entry
      );
    }
  );
}


/* =========================================================
   GUARDAR LOG
========================================================= */

saveLogButton.addEventListener(
  "click",
  async () => {

    const date =
      logDate.value;


    const number =
      Number(
        logNumber.value
      );


    const note =
      logNote.value.trim();


    if (
      !date ||
      !Number.isFinite(number) ||
      !note
    ) {

      return;
    }


    await supabaseRequest(
      "torre_logs",
      {
        method:
          "POST",

        body:
          JSON.stringify({
            category_id:
              currentCategory.id,

            inventory_number:
              Math.floor(number),

            log_date:
              date,

            note
          })
      }
    );


    logNumber.value =
      "";

    logNote.value =
      "";


    await loadLogs();
  }
);


/* =========================================================
   GOOGLE SHEETS
========================================================= */

sheetsLink.href =
  GOOGLE_SHEETS_URL;


/* =========================================================
   DATA POR DEFETO
========================================================= */

function setDefaultDate() {

  if (
    !logDate.value
  ) {

    const now =
      new Date();


    const year =
      now.getFullYear();


    const month =
      String(
        now.getMonth() + 1
      ).padStart(
        2,
        "0"
      );


    const day =
      String(
        now.getDate()
      ).padStart(
        2,
        "0"
      );


    logDate.value =
      year +
      "-" +
      month +
      "-" +
      day;
  }
}


/* =========================================================
   INIT
========================================================= */

async function init() {

  try {

    setDefaultDate();

    await loadCategories();

  } catch (error) {

    console.error(
      error
    );


    document.body.innerHTML =
      `
        <div style="
          padding:24px;
          color:#0000ff;
          font-family:Arial,Helvetica,sans-serif;
        ">
          Erro ao carregar a TORRE.
        </div>
      `;
  }
}


init();
